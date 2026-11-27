import uuid
import random
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User, UserGroup, PasswordResetToken
from app.models.group import Group
from app.models.member import Member
from app.schemas.user import UserRegister, UserLogin, PasswordResetRequest, ValidateOTPRequest, VerifyOTPResetRequest, AuthResponse, UserResponse, GroupBrief, GroupCreate
from app.core.security import hash_password, verify_password, create_access_token, generate_invite_code
from app.services.email_service import send_otp_email


def _build_auth_response(db: Session, user: User) -> AuthResponse:
    """Helper to assemble AuthResponse containing user, their groups, and access token."""
    user_groups = (
        db.query(UserGroup, Group)
        .join(Group, UserGroup.group_id == Group.id)
        .filter(UserGroup.user_id == user.id, UserGroup.is_active == True)
        .all()
    )

    groups_list: list[GroupBrief] = []
    for ug, grp in user_groups:
        groups_list.append(
            GroupBrief(
                id=grp.id,
                name=grp.name,
                currency=grp.currency or "₹",
                week_start_day=grp.week_start_day or "Monday",
                group_type=grp.group_type or "home",
                invite_code=grp.invite_code,
                role=ug.role
            )
        )

    # If user has no group (e.g. fresh registration without group), auto-create or assign default
    if not groups_list:
        default_grp = db.query(Group).filter(Group.id == "default-group").first()
        if not default_grp:
            default_grp = Group(
                id="default-group",
                name="Home",
                currency="₹",
                week_start_day="Monday",
                group_type="home",
                invite_code=generate_invite_code("HOME")
            )
            db.add(default_grp)
            db.commit()
            db.refresh(default_grp)
        
        ug = UserGroup(
            id=f"ug-{uuid.uuid4().hex[:8]}",
            user_id=user.id,
            group_id=default_grp.id,
            role="admin"
        )
        db.add(ug)
        db.commit()

        groups_list.append(
            GroupBrief(
                id=default_grp.id,
                name=default_grp.name,
                currency=default_grp.currency or "₹",
                week_start_day=default_grp.week_start_day or "Monday",
                group_type=default_grp.group_type or "home",
                invite_code=default_grp.invite_code,
                role="admin"
            )
        )

    active_group_id = groups_list[0].id

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name
    })

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        groups=groups_list,
        active_group_id=active_group_id
    )

def register_user(db: Session, reg: UserRegister) -> AuthResponse:
    clean_email = reg.email.strip().lower()
    
    # 1. Check if user already exists
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in."
        )

    # 2. Create User
    new_user = User(
        id=f"usr-{uuid.uuid4().hex[:8]}",
        email=clean_email,
        hashed_password=hash_password(reg.password),
        name=reg.name.strip(),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Handle Group Creation or Joining
    target_group: Group | None = None
    role = "admin"

    if reg.invite_code:
        # Join by invite code
        clean_code = reg.invite_code.strip().upper()
        target_group = db.query(Group).filter(Group.invite_code == clean_code).first()
        if not target_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invite code '{clean_code}' is invalid. Please check with your roommates."
            )
        role = "member"
    else:
        # Check if default-group exists and has no registered user yet (e.g. existing database with expenses)
        default_grp = db.query(Group).filter(Group.id == "default-group").first()
        existing_owners = db.query(UserGroup).filter(UserGroup.group_id == "default-group").count() if default_grp else 1

        if default_grp and existing_owners == 0:
            target_group = default_grp
            if not target_group.invite_code:
                target_group.invite_code = generate_invite_code("HOME")
            target_group.created_by = new_user.id
            if reg.group_name and reg.group_name.strip():
                target_group.name = reg.group_name.strip()
            db.commit()
            db.refresh(target_group)
        else:
            # Create fresh group
            grp_name = reg.group_name.strip() if reg.group_name else f"{reg.name}'s Flat"
            group_id = f"grp-{uuid.uuid4().hex[:8]}"
            target_group = Group(
                id=group_id,
                name=grp_name,
                currency="₹",
                week_start_day="Monday",
                invite_code=generate_invite_code("SPLIT"),
                created_by=new_user.id
            )
            db.add(target_group)
            db.commit()
            db.refresh(target_group)

    # Link user to group
    ug = UserGroup(
        id=f"ug-{uuid.uuid4().hex[:8]}",
        user_id=new_user.id,
        group_id=target_group.id,
        role=role
    )
    db.add(ug)

    # Also link to existing member record (e.g. 'Advi' / 'mem-you') or create a new Member record in the group
    existing_mem = (
        db.query(Member)
        .filter(Member.group_id == target_group.id)
        .filter((Member.name.ilike(new_user.name)) | (Member.id == "mem-you"))
        .first()
    )
    if existing_mem and not existing_mem.user_id:
        existing_mem.user_id = new_user.id
        if existing_mem.name in ("You", ""):
            existing_mem.name = new_user.name
        db.commit()
    else:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        member_record = Member(
            id=f"mem-{uuid.uuid4().hex[:8]}",
            group_id=target_group.id,
            user_id=new_user.id,
            name=new_user.name,
            joined_at=today_str,
            is_active=True,
            color="bg-emerald-600"
        )
        db.add(member_record)
        db.commit()

    return _build_auth_response(db, new_user)

def login_user(db: Session, creds: UserLogin) -> AuthResponse:
    clean_email = creds.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please try again."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    return _build_auth_response(db, user)

def send_reset_otp(db: Session, email: str) -> dict:
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address. Please check your email or create a new account."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    # Invalidate previous unused OTPs for this email
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == clean_email,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Generate secure 6-digit numeric OTP
    otp_code = f"{random.randint(100000, 999999)}"
    token_id = f"otp-{uuid.uuid4().hex[:8]}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    token_rec = PasswordResetToken(
        id=token_id,
        email=clean_email,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(token_rec)
    db.commit()

    # Deliver OTP & Reset Link via Email
    email_res = send_otp_email(clean_email, otp_code)
    
    if not email_res.get("sent"):
        if email_res.get("dev_mode"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Email delivery requires SMTP configuration in backend/.env. Please configure SMTP_USER and SMTP_PASSWORD to send real emails to your Gmail."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send email to {clean_email}: {email_res.get('error', 'SMTP connection error')}. Please check your SMTP settings."
            )

    return {
        "status": "success",
        "message": f"Verification code sent to {clean_email}. Please check your Gmail inbox."
    }

def validate_reset_otp(db: Session, email: str, otp_code: str) -> dict:
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    now = datetime.utcnow()
    token_rec = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == clean_email,
            PasswordResetToken.otp_code == otp_code.strip(),
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at >= now
        )
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )

    if not token_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please check your Gmail or request a new code."
        )

    return {
        "status": "success",
        "message": "Verification code is valid. You can now set your new password."
    }

def verify_otp_and_reset_password(db: Session, req: VerifyOTPResetRequest) -> AuthResponse:
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    now = datetime.utcnow()
    token_rec = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == clean_email,
            PasswordResetToken.otp_code == req.otp_code.strip(),
            PasswordResetToken.is_used == False,
            PasswordResetToken.expires_at >= now
        )
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )

    if not token_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please check your email or request a new code."
        )

    # Invalidate token
    token_rec.is_used = True
    user.hashed_password = hash_password(req.new_password)
    db.commit()
    db.refresh(user)

    return _build_auth_response(db, user)

def reset_password(db: Session, req: PasswordResetRequest) -> AuthResponse:
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address. Please check your email or create a new account."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    user.hashed_password = hash_password(req.new_password)
    db.commit()
    db.refresh(user)

    return _build_auth_response(db, user)


def get_current_user_profile(db: Session, user: User) -> AuthResponse:
    return _build_auth_response(db, user)

def create_group_for_user(db: Session, user: User, grp_in: GroupCreate) -> GroupBrief:
    group_id = f"grp-{uuid.uuid4().hex[:8]}"
    g_type = getattr(grp_in, "group_type", "home") or "home"
    code_prefix = "TRIP" if g_type == "trip" else "SPLIT"
    new_group = Group(
        id=group_id,
        name=grp_in.name.strip(),
        currency=grp_in.currency or "₹",
        week_start_day=grp_in.week_start_day or "Monday",
        group_type=g_type,
        invite_code=generate_invite_code(code_prefix),
        created_by=user.id
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    ug = UserGroup(
        id=f"ug-{uuid.uuid4().hex[:8]}",
        user_id=user.id,
        group_id=new_group.id,
        role="admin"
    )
    db.add(ug)

    # Create Member entry for this user in their new group
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    member_record = Member(
        id=f"mem-{uuid.uuid4().hex[:8]}",
        group_id=new_group.id,
        user_id=user.id,
        name=user.name,
        joined_at=today_str,
        is_active=True,
        color="bg-emerald-600"
    )
    db.add(member_record)
    db.commit()

    return GroupBrief(
        id=new_group.id,
        name=new_group.name,
        currency=new_group.currency or "₹",
        week_start_day=new_group.week_start_day or "Monday",
        group_type=new_group.group_type or "home",
        invite_code=new_group.invite_code,
        role="admin"
    )

def join_group_with_code(db: Session, user: User, invite_code: str) -> GroupBrief:
    clean_code = invite_code.strip().upper()
    group = db.query(Group).filter(Group.invite_code == clean_code).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invite code '{clean_code}' is invalid. Please double check with your group members."
        )

    # Check if user is already a member
    existing_ug = db.query(UserGroup).filter(
        UserGroup.user_id == user.id,
        UserGroup.group_id == group.id
    ).first()

    if existing_ug:
        if not existing_ug.is_active:
            existing_ug.is_active = True
            db.commit()
        return GroupBrief(
            id=group.id,
            name=group.name,
            currency=group.currency or "₹",
            week_start_day=group.week_start_day or "Monday",
            group_type=group.group_type or "home",
            invite_code=group.invite_code,
            role=existing_ug.role
        )

    # Add to group
    ug = UserGroup(
        id=f"ug-{uuid.uuid4().hex[:8]}",
        user_id=user.id,
        group_id=group.id,
        role="member"
    )
    db.add(ug)

    # Check if a Member with user's name already exists in this group (e.g. added before user signed up)
    existing_member = db.query(Member).filter(
        Member.group_id == group.id,
        Member.name.ilike(user.name)
    ).first()

    if existing_member:
        existing_member.user_id = user.id
    else:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        new_member = Member(
            id=f"mem-{uuid.uuid4().hex[:8]}",
            group_id=group.id,
            user_id=user.id,
            name=user.name,
            joined_at=today_str,
            is_active=True,
            color="bg-indigo-600"
        )
        db.add(new_member)

    db.commit()

    return GroupBrief(
        id=group.id,
        name=group.name,
        currency=group.currency or "₹",
        week_start_day=group.week_start_day or "Monday",
        group_type=group.group_type or "home",
        invite_code=group.invite_code,
        role="member"
    )

def delete_group_for_user(db: Session, user: User, group_id: str) -> bool:
    clean_id = (group_id or "").strip()
    if not clean_id:
        return True

    # Find group by exact ID, or fallback by name or invite code
    group = db.query(Group).filter(
        (Group.id == clean_id) |
        (Group.name.ilike(clean_id)) |
        (Group.invite_code == clean_id.upper())
    ).first()

    # If the group does not exist (already deleted), return True idempotently
    if not group:
        return True

    if group.id == "default-group":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The default group cannot be deleted."
        )

    ug = db.query(UserGroup).filter(
        UserGroup.user_id == user.id,
        UserGroup.group_id == group.id
    ).first()

    is_admin = (ug and ug.role == "admin") or (group.created_by == user.id) or (user.id and not group.created_by)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this group. Only group admins can delete it."
        )

    # Delete group (cascades to members, expenses, weeks, user_groups)
    db.delete(group)
    db.commit()
    return True
