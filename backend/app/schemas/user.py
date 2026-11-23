from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    name: str = Field(..., min_length=2, description="Display name / Person name")
    group_name: Optional[str] = None # Optional new group name to create e.g. "Flat 304"
    invite_code: Optional[str] = None # Optional invite code to join an existing group

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GroupBrief(BaseModel):
    id: str
    name: str
    currency: str = "₹"
    week_start_day: str = "Monday"
    invite_code: Optional[str] = None
    role: str = "member"

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    groups: List[GroupBrief]
    active_group_id: str

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=2)
    currency: str = "₹"
    week_start_day: str = "Monday"

class GroupJoin(BaseModel):
    invite_code: str = Field(..., min_length=4)
