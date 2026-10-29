from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.group import Group, GroupUpdate
import app.repositories.group_repository as group_repo
import app.services.group_service as group_service

router = APIRouter(prefix="/groups", tags=["groups"])

@router.get("", response_model=list[Group])
def read_groups(db: Session = Depends(get_db)):
    group = group_service.get_or_create_default_group(db)
    return [group]

@router.get("/{group_id}", response_model=Group)
def read_group(group_id: str, db: Session = Depends(get_db)):
    group = group_repo.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.put("/{group_id}", response_model=Group)
def update_group(group_id: str, group_in: GroupUpdate, db: Session = Depends(get_db)):
    group = group_repo.update_group(
        db, 
        group_id, 
        name=group_in.name, 
        currency=group_in.currency, 
        week_start_day=group_in.week_start_day
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group
