from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_dependency import get_active_group_id
from app.core.security import generate_invite_code
from app.schemas.settings import SettingsSchema
import app.services.group_service as group_service
import app.repositories.group_repository as group_repo

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SettingsSchema)
def read_settings(
    group_id: str = Depends(get_active_group_id),
    db: Session = Depends(get_db)
):
    group = group_repo.get_group(db, group_id)
    if not group:
        group = group_service.get_or_create_default_group(db)

    if not group.invite_code:
        group.invite_code = generate_invite_code("FLAT")
        db.commit()
        db.refresh(group)
        
    return SettingsSchema(
        group_name=group.name,
        currency=group.currency or "₹",
        week_starts_on=group.week_start_day or "Monday",
        default_category="Groceries",
        gemini_api_key=group.gemini_api_key,
        invite_code=group.invite_code
    )

@router.put("", response_model=SettingsSchema)
def update_settings(
    settings_in: SettingsSchema,
    group_id: str = Depends(get_active_group_id),
    db: Session = Depends(get_db)
):
    group = group_repo.get_group(db, group_id)
    if not group:
        group = group_service.get_or_create_default_group(db)
        
    updated_group = group_repo.update_group(
        db,
        group.id,
        name=settings_in.group_name,
        currency=settings_in.currency,
        week_start_day=settings_in.week_starts_on,
        gemini_api_key=settings_in.gemini_api_key
    )
    return SettingsSchema(
        group_name=updated_group.name,
        currency=updated_group.currency,
        week_starts_on=updated_group.week_start_day,
        default_category=settings_in.default_category,
        gemini_api_key=updated_group.gemini_api_key,
        invite_code=updated_group.invite_code
    )
