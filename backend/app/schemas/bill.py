from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class BillBase(BaseModel):
    original_filename: str
    stored_filename: str
    file_path: str
    mime_type: str
    file_size: int

class BillCreate(BillBase):
    pass

class Bill(BillBase):
    id: str
    expense_id: Optional[str] = None
    uploaded_at: datetime
    store_name: Optional[str] = None
    category: Optional[str] = None
    total_amount: Optional[float] = None
    paid_by: Optional[str] = None
    paid_by_name: Optional[str] = None
    date: Optional[str] = None

    class Config:
        from_attributes = True
