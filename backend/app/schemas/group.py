from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class GroupBase(BaseModel):
    name: str
    currency: str = "₹"
    week_start_day: str = "Monday"
    group_type: str = "home"

class GroupCreate(GroupBase):
    pass

class GroupUpdate(GroupBase):
    pass

class Group(GroupBase):
    id: str
    invite_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
