from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_dependency import get_current_user
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, AuthResponse, GroupBrief, GroupCreate, GroupJoin
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
