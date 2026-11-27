from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_dependency import get_current_user
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, PasswordResetRequest, SendOTPRequest, SendOTPResponse, ValidateOTPRequest, VerifyOTPResetRequest, AuthResponse, GroupBrief, GroupCreate, GroupJoin
import app.services.auth_service as auth_service

router = APIRouter(tags=["auth"])

@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(reg_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account, hash password securely with bcrypt, and issue JWT token."""
    return auth_service.register_user(db, reg_in)

@router.post("/auth/login", response_model=AuthResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password, returning JWT token and accessible groups."""
    return auth_service.login_user(db, creds)

@router.post("/auth/forgot-password/send-otp", response_model=SendOTPResponse)
def send_forgot_password_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    """Generate and email a 6-digit verification code (OTP) to registered account."""
    return auth_service.send_reset_otp(db, req.email)

@router.post("/auth/forgot-password/validate-code")
def validate_forgot_password_code(req: ValidateOTPRequest, db: Session = Depends(get_db)):
    """Verify that a 6-digit OTP code is valid and unexpired before presenting password reset inputs."""
    return auth_service.validate_reset_otp(db, req.email, req.otp_code)

@router.post("/auth/forgot-password/verify", response_model=AuthResponse)
def verify_forgot_password_otp(req: VerifyOTPResetRequest, db: Session = Depends(get_db)):
    """Verify 6-digit OTP code and securely update password, returning fresh JWT session."""
    return auth_service.verify_otp_and_reset_password(db, req)


@router.post("/auth/forgot-password", response_model=AuthResponse)
def forgot_password(reset_in: PasswordResetRequest, db: Session = Depends(get_db)):
    """Legacy direct reset endpoint."""
    return auth_service.reset_password(db, reset_in)


@router.get("/auth/me", response_model=AuthResponse)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return profile and group list for currently authenticated user."""
    return auth_service.get_current_user_profile(db, user)

@router.post("/groups", response_model=GroupBrief, status_code=status.HTTP_201_CREATED)
def create_group(
    grp_in: GroupCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new group (e.g. Flat 304, Trip to Goa) with a unique invite code."""
    return auth_service.create_group_for_user(db, user, grp_in)

@router.post("/groups/join", response_model=GroupBrief)
def join_group(
    join_in: GroupJoin,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join an existing group using a 6-character invite code (e.g. FLAT-8421)."""
    return auth_service.join_group_with_code(db, user, join_in.invite_code)
