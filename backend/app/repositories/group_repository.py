from sqlalchemy.orm import Session
from app.models.group import Group
from app.schemas.group import GroupCreate

def get_group(db: Session, group_id: str) -> Group | None:
    return db.query(Group).filter(Group.id == group_id).first()

def get_first_group(db: Session) -> Group | None:
    return db.query(Group).first()

def create_group(db: Session, group_id: str, group_in: GroupCreate) -> Group:
    db_group = Group(
        id=group_id,
        name=group_in.name,
        currency=group_in.currency,
        week_start_day=group_in.week_start_day
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

def update_group(db: Session, group_id: str, name: str, currency: str, week_start_day: str) -> Group | None:
    db_group = get_group(db, group_id)
    if db_group:
        db_group.name = name
        db_group.currency = currency
        db_group.week_start_day = week_start_day
        db.commit()
        db.refresh(db_group)
    return db_group
