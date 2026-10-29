from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.settings import SettingsSchema
import app.services.group_service as group_service
import app.repositories.group_repository as group_repo

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SettingsSchema)
def read_settings(db: Session = Depends(get_db)):
    group = group_service.get_or_create_default_group(db)
    return SettingsSchema(
        group_name=group.name,
        currency=group.currency,
        week_starts_on=group.week_start_day,
        default_category="Groceries"
    )

@router.put("", response_model=SettingsSchema)
def update_settings(settings_in: SettingsSchema, db: Session = Depends(get_db)):
    group = group_service.get_or_create_default_group(db)
    updated_group = group_repo.update_group(
        db,
        group.id,
        name=settings_in.group_name,
        currency=settings_in.currency,
        week_start_day=settings_in.week_starts_on
    )
    return SettingsSchema(
        group_name=updated_group.name,
        currency=updated_group.currency,
        week_starts_on=updated_group.week_start_day,
        default_category=settings_in.default_category
    )
