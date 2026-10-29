from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class WeekBase(BaseModel):
    id: str
    start_date: str
    end_date: str
    status: str = "active"

class WeekCreate(WeekBase):
    pass

class Week(WeekBase):
    group_id: str
    closed_at: Optional[datetime] = None
    created_at: datetime
    total_expenses: Optional[float] = 0.0

    class Config:
        from_attributes = True
