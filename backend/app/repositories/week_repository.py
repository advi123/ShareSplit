from datetime import datetime
from sqlalchemy.orm import Session
from app.models.week import Week

def get_week(db: Session, week_id: str) -> Week | None:
    return db.query(Week).filter(Week.id == week_id).first()

def get_weeks(db: Session, group_id: str) -> list[Week]:
    return db.query(Week).filter(Week.group_id == group_id).order_by(Week.start_date.desc()).all()

def create_week(db: Session, group_id: str, week_id: str, start_date: str, end_date: str) -> Week:
    db_week = Week(
        id=week_id,
        group_id=group_id,
        start_date=start_date,
        end_date=end_date,
        status="active"
    )
    db.add(db_week)
    db.commit()
    db.refresh(db_week)
    return db_week

def update_week_status(db: Session, week_id: str, status: str) -> Week | None:
    db_week = get_week(db, week_id)
    if db_week:
        db_week.status = status
        if status == "closed":
            db_week.closed_at = datetime.utcnow()
        else:
            db_week.closed_at = None
        db.commit()
        db.refresh(db_week)
    return db_week
