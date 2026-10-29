from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
from app.core.database import get_db
from app.schemas.bill import Bill
import app.repositories.bill_repository as bill_repo
import app.services.bill_service as bill_service
import app.services.group_service as group_service
import app.services.ai_bill_service as ai_bill_service
from pydantic import BaseModel
import base64

class AIParsingRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    api_key: str | None = None

router = APIRouter(prefix="/bills", tags=["bills"])

@router.post("/parse-ai")
async def parse_receipt_ai(
    req: AIParsingRequest,
    x_gemini_key: str | None = Header(None, alias="X-Gemini-Key")
):
    api_key = req.api_key or x_gemini_key
    raw_b64 = req.image_base64
    mime_type = req.mime_type or "image/jpeg"
    if "," in raw_b64:
        header_part, raw_b64 = raw_b64.split(",", 1)
        if "data:" in header_part and ";base64" in header_part:
            mime_type = header_part.split("data:")[1].split(";base64")[0]
    image_bytes = base64.b64decode(raw_b64)
    return await ai_bill_service.parse_receipt_with_gemini(
        api_key=api_key,
        image_bytes=image_bytes,
        mime_type=mime_type
    )

@router.post("/upload", response_model=List[Bill])
def upload_bills(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    saved_bills = []
    for file in files:
        saved_bill = bill_service.save_uploaded_bill(db, file)
        saved_bills.append(saved_bill)
    return saved_bills

@router.get("", response_model=list[Bill])
def read_bills(
    date: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    paid_by: str | None = Query(None),
    category: str | None = Query(None),
    week_id: str | None = Query(None),
    db: Session = Depends(get_db)
):
    group = group_service.get_or_create_default_group(db)
    return bill_repo.get_bills(
        db,
        group_id=group.id,
        date=date,
        start_date=start_date,
        end_date=end_date,
        paid_by=paid_by,
        category=category,
        week_id=week_id
    )

@router.get("/{bill_id}", response_model=Bill)
def read_bill(bill_id: str, db: Session = Depends(get_db)):
    bill = bill_repo.get_bill(db, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill

@router.get("/{bill_id}/image")
def read_bill_image(bill_id: str, db: Session = Depends(get_db)):
    bill = bill_repo.get_bill(db, bill_id)
    if not bill or not bill.file_path:
        raise HTTPException(status_code=404, detail="Bill not found")
    if not os.path.exists(bill.file_path):
        raise HTTPException(status_code=404, detail="Physical bill file not found on disk")
    return FileResponse(bill.file_path, media_type=bill.mime_type)

@router.delete("/{bill_id}")
def delete_bill(bill_id: str, db: Session = Depends(get_db)):
    success = bill_service.delete_bill_with_file(db, bill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bill not found")
    return {"status": "success", "message": "Bill image deleted successfully"}
