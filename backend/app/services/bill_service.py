import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.bill import Bill
import app.repositories.bill_repository as bill_repo

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def save_uploaded_bill(db: Session, file: UploadFile) -> Bill:
    filename = file.filename or "bill.jpg"
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not allowed. Supported: JPEG, PNG, WEBP.")
        
    stored_name = f"bill-{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    file_size = os.path.getsize(file_path)
    mime_type = file.content_type or "image/jpeg"
    
    bill_id = f"bill-{uuid.uuid4().hex[:8]}"
    db_bill = bill_repo.create_bill(
        db,
        bill_id=bill_id,
        original_filename=filename,
        stored_filename=stored_name,
        file_path=file_path,
        mime_type=mime_type,
        file_size=file_size
    )
    return db_bill

def delete_bill_with_file(db: Session, bill_id: str) -> bool:
    db_bill = bill_repo.get_bill(db, bill_id)
    if not db_bill:
        return False
        
    if os.path.exists(db_bill.file_path):
        try:
            os.remove(db_bill.file_path)
        except Exception:
            pass
            
    return bill_repo.delete_bill(db, bill_id)
