import os
import uuid
import shutil
import base64
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
        file_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    try:
        with open(file_path, "wb") as f:
            f.write(file_bytes)
    except Exception:
        pass
        
    file_size = len(file_bytes)
    mime_type = file.content_type or "image/jpeg"
    image_data = f"data:{mime_type};base64,{base64.b64encode(file_bytes).decode('utf-8')}"
    
    bill_id = f"bill-{uuid.uuid4().hex[:8]}"
    db_bill = bill_repo.create_bill(
        db,
        bill_id=bill_id,
        original_filename=filename,
        stored_filename=stored_name,
        file_path=file_path,
        mime_type=mime_type,
        file_size=file_size,
        image_data=image_data
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
