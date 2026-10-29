from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

class MemberBase(BaseModel):
    name: str
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = None

class MemberCreate(MemberBase):
    pass

class MemberUpdate(MemberBase):
    pass

class Member(MemberBase):
    id: str
    group_id: str
    joined_at: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MemberDetailExpense(BaseModel):
    id: str
    description: str
    date: str
    total_amount: float
    paid_by_name: str
    share_amount: float

class MemberDetail(BaseModel):
    id: str
    name: str
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = None
    joined_at: str
    is_active: bool
    total_paid: float
    total_share: float
    current_balance: float
    recent_expenses: List[MemberDetailExpense]
