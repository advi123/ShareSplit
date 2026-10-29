from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

class ExpenseItemBase(BaseModel):
    name: str
    amount: float

class ExpenseItemCreate(ExpenseItemBase):
    participants: List[str]

class ExpenseItemResponse(ExpenseItemBase):
    id: str
    participants: List[str]

class ExpenseBase(BaseModel):
    description: str
    category: str
    date: str
    type: str
    paid_by: str
    total_amount: float
    notes: Optional[str] = None
    source: Optional[str] = "manual"
    bill_id: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    participants: Optional[List[str]] = None
    items: Optional[List[ExpenseItemCreate]] = None

class ExpenseUpdate(ExpenseBase):
    participants: Optional[List[str]] = None
    items: Optional[List[ExpenseItemCreate]] = None

class CalculatedShare(BaseModel):
    member_id: str
    member_name: str
    amount: float

class ExpenseResponse(BaseModel):
    id: str
    group_id: str
    week_id: str
    description: str
    category: str
    date: str
    type: str
    source: str
    paid_by: str
    paid_by_name: str
    total_amount: float
    notes: Optional[str] = None
    participants: List[str]
    items: List[ExpenseItemResponse]
    shares: List[CalculatedShare]
    bill_id: Optional[str] = None
    bill_stored_filename: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
