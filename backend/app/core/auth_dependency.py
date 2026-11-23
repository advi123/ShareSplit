from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserGroup
from app.models.group import Group

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validate JWT token and return authenticated User object."""
    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user

def get_optional_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User | None:
    """Optional authentication for smooth backward compatibility during migration."""
    if not auth:
        return None
    try:
        payload = decode_access_token(auth.credentials)
        if not payload or "sub" not in payload:
            return None
        return db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    except Exception:
        return None

def get_active_group_id(
    x_group_id: str | None = Header(None, alias="X-Group-Id"),
    user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
) -> str:
    """
    Resolve the active group_id:
    1. If user is authenticated and provided X-Group-Id: verifies membership.
    2. If user is authenticated and didn't provide X-Group-Id: uses user's first group.
    3. If user is unauthenticated or has no groups: falls back to default-group.
    """
    if user:
        # Check user's group memberships
        user_groups = db.query(UserGroup).filter(
            UserGroup.user_id == user.id,
            UserGroup.is_active == True
        ).all()
        
        valid_group_ids = [ug.group_id for ug in user_groups]
        
        if x_group_id and x_group_id in valid_group_ids:
            return x_group_id
        
        if valid_group_ids:
            return valid_group_ids[0]

    # Backward compatibility / fallback
    if x_group_id:
        group_exists = db.query(Group).filter(Group.id == x_group_id).first()
        if group_exists:
            return x_group_id
            
    return "default-group"
