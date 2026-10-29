from datetime import datetime
from sqlalchemy.orm import Session
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate

def get_member(db: Session, member_id: str) -> Member | None:
    return db.query(Member).filter(Member.id == member_id).first()

def get_members(db: Session, group_id: str, include_inactive: bool = False) -> list[Member]:
    query = db.query(Member).filter(Member.group_id == group_id)
    if not include_inactive:
        query = query.filter(Member.is_active == True)
    return query.all()

def create_member(db: Session, group_id: str, member_id: str, member_in: MemberCreate) -> Member:
    db_member = Member(
        id=member_id,
        group_id=group_id,
        name=member_in.name,
        nickname=member_in.nickname,
        avatar=member_in.avatar,
        color=member_in.color or "bg-slate-500",
        joined_at=datetime.utcnow().strftime("%Y-%m-%d"),
        is_active=True
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

def update_member(db: Session, member_id: str, member_in: MemberUpdate) -> Member | None:
    db_member = get_member(db, member_id)
    if db_member:
        db_member.name = member_in.name
        db_member.nickname = member_in.nickname
        db_member.avatar = member_in.avatar
        if member_in.color:
            db_member.color = member_in.color
        db.commit()
        db.refresh(db_member)
    return db_member

def deactivate_member(db: Session, member_id: str) -> Member | None:
    db_member = get_member(db, member_id)
    if db_member:
        db_member.is_active = False
        db.commit()
        db.refresh(db_member)
    return db_member

def reactivate_member(db: Session, member_id: str) -> Member | None:
    db_member = get_member(db, member_id)
    if db_member:
        db_member.is_active = True
        db.commit()
        db.refresh(db_member)
    return db_member

def delete_member(db: Session, member_id: str) -> bool:
    db_member = get_member(db, member_id)
    if db_member:
        db.delete(db_member)
        db.commit()
        return True
    return False
