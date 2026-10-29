from datetime import datetime
from pydantic import BaseModel

class GroupBase(BaseModel):
    name: str
    currency: str = "₹"
    week_start_day: str = "Monday"

class GroupCreate(GroupBase):
    pass

class GroupUpdate(GroupBase):
    pass

class Group(GroupBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
