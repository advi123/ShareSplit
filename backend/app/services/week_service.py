from sqlalchemy.orm import Session
from app.models.week import Week
import app.repositories.week_repository as week_repo
import app.repositories.group_repository as group_repo
from app.utils.dates import get_week_range

def get_or_create_week(db: Session, group_id: str, date_str: str) -> Week:
    db_group = group_repo.get_group(db, group_id)
    week_start_day = db_group.week_start_day if db_group else "Monday"
    
    start_date, end_date = get_week_range(date_str, week_start_day)
    
    # Check if a week specifically belonging to this group already exists for this date range
    db_week = db.query(Week).filter(
        Week.group_id == group_id,
        Week.start_date == start_date
    ).first()
    
    if not db_week:
        if group_id == "default-group":
            week_id = f"week-{start_date}"
            # Check if this ID is unexpectedly held by another group
            existing = db.query(Week).filter(Week.id == week_id).first()
            if existing and existing.group_id != group_id:
                week_id = f"week-{group_id}-{start_date}"
        else:
            week_id = f"week-{group_id}-{start_date}"
            
        db_week = week_repo.create_week(db, group_id, week_id, start_date, end_date)
        
    return db_week

def close_week(db: Session, week_id: str) -> Week | None:
    return week_repo.update_week_status(db, week_id, "closed")

def reopen_week(db: Session, week_id: str) -> Week | None:
    return week_repo.update_week_status(db, week_id, "active")
