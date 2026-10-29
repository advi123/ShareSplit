from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.schemas.week import Week
import app.repositories.week_repository as week_repo
import app.repositories.expense_repository as expense_repo
import app.services.week_service as week_service
import app.services.expense_service as expense_service
import app.services.settlement_service as settlement_service
import app.services.group_service as group_service

router = APIRouter(prefix="/weeks", tags=["weeks"])

@router.get("", response_model=list[Week])
def read_weeks(db: Session = Depends(get_db)):
    group = group_service.get_or_create_default_group(db)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    current_week = week_service.get_or_create_week(db, group.id, today)
    
    weeks = week_repo.get_weeks(db, group.id)

    enriched_weeks = []
    for w in weeks:
        expenses = expense_repo.get_expenses(db, group.id, week_id=w.id)
        total_spent = sum(e.total_amount for e in expenses)
        enriched_weeks.append(
            Week(
                id=w.id,
                group_id=w.group_id,
                start_date=w.start_date,
                end_date=w.end_date,
                status=w.status,
                closed_at=w.closed_at,
                created_at=w.created_at,
                total_expenses=float(total_spent)
            )
        )
    return enriched_weeks

@router.get("/{week_id}")
def read_week_details(week_id: str, db: Session = Depends(get_db)):
    db_week = week_repo.get_week(db, week_id)
    if not db_week:
        raise HTTPException(status_code=404, detail="Week not found")
        
    raw_expenses = expense_repo.get_expenses(db, db_week.group_id, week_id=week_id)
    expenses_response = [expense_service.build_expense_response(db, e) for e in raw_expenses]
    
    settlement = settlement_service.calculate_settlement_range(
        db, 
        db_week.group_id, 
        db_week.start_date, 
        db_week.end_date
    )
    
    return {
        "id": db_week.id,
        "start_date": db_week.start_date,
        "end_date": db_week.end_date,
        "status": db_week.status,
        "closed_at": db_week.closed_at,
        "expenses": expenses_response,
        "members": settlement.members,
        "settlement": settlement.settlement
    }

@router.post("/{week_id}/close")
def close_week(week_id: str, db: Session = Depends(get_db)):
    week = week_repo.get_week(db, week_id)
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
        
    settlement = settlement_service.calculate_settlement_range(
        db,
        week.group_id,
        week.start_date,
        week.end_date
    )
    
    week_service.close_week(db, week_id)
    
    return {
        "id": week_id,
        "status": "closed",
        "settlement": settlement
    }

@router.post("/{week_id}/reopen")
def reopen_week(week_id: str, db: Session = Depends(get_db)):
    week = week_service.reopen_week(db, week_id)
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    return {"id": week_id, "status": "active"}
