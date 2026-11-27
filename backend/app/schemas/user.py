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

class PasswordResetRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6, description="New password must be at least 6 characters")

class SendOTPRequest(BaseModel):
    email: EmailStr

class SendOTPResponse(BaseModel):
    status: str
    message: str


class ValidateOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=4, max_length=8, description="6-digit verification code")

class VerifyOTPResetRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=4, max_length=8, description="6-digit verification code")
    new_password: str = Field(..., min_length=6, description="New password must be at least 6 characters")



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
    group_type: str = "home"
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
    group_type: str = "home"

class GroupJoin(BaseModel):
    invite_code: str = Field(..., min_length=4)
