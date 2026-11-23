from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import uuid
from app.core.database import get_db
from app.core.auth_dependency import get_active_group_id
from app.schemas.member import Member, MemberCreate, MemberUpdate, MemberDetail
import app.repositories.member_repository as member_repo
import app.services.member_service as member_service

router = APIRouter(prefix="/members", tags=["members"])

@router.get("", response_model=list[Member])
def read_members(
    include_inactive: bool = Query(False),
    group_id: str = Depends(get_active_group_id),
    db: Session = Depends(get_db)
):
    return member_repo.get_members(db, group_id, include_inactive=include_inactive)

@router.post("", response_model=Member)
def create_member(
    member_in: MemberCreate,
    group_id: str = Depends(get_active_group_id),
    db: Session = Depends(get_db)
):
    member_id = f"mem-{uuid.uuid4().hex[:8]}"
    return member_repo.create_member(db, group_id, member_id, member_in)

@router.get("/{member_id}", response_model=MemberDetail)
def read_member(member_id: str, db: Session = Depends(get_db)):
    details = member_service.get_member_details(db, member_id)
    if not details:
        raise HTTPException(status_code=404, detail="Member not found")
    return details

@router.put("/{member_id}", response_model=Member)
def update_member(member_id: str, member_in: MemberUpdate, db: Session = Depends(get_db)):
    member = member_repo.update_member(db, member_id, member_in)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@router.delete("/{member_id}")
def delete_member(
    member_id: str,
    permanent: bool = Query(False),
    deactivate_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    result = member_service.delete_or_deactivate_member(
        db, member_id, permanent=permanent, deactivate_only=deactivate_only
    )
    if not result["success"]:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return {"action": result["action"], "member_id": member_id}

@router.post("/{member_id}/deactivate", response_model=Member)
def deactivate_member(member_id: str, db: Session = Depends(get_db)):
    member = member_repo.deactivate_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@router.post("/{member_id}/reactivate", response_model=Member)
def reactivate_member(member_id: str, db: Session = Depends(get_db)):
    member = member_repo.reactivate_member(db, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member
