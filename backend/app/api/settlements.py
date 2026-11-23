from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_dependency import get_active_group_id
from app.schemas.settlement import SettlementResponse
import app.services.settlement_service as settlement_service
import app.repositories.week_repository as week_repo

router = APIRouter(prefix="/settlements", tags=["settlements"])

@router.get("/daily", response_model=SettlementResponse)
def get_daily_settlement(
    date: str = Query(...),
    group_id: str = Depends(get_active_group_id),
    db: Session = Depends(get_db)
):
    return settlement_service.calculate_settlement_range(db, group_id, date, date)

@router.get("/weekly/{week_id}", response_model=SettlementResponse)
def get_weekly_settlement(
    week_id: str,
    db: Session = Depends(get_db)
):
    week = week_repo.get_week(db, week_id)
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    return settlement_service.calculate_settlement_range(db, week.group_id, week.start_date, week.end_date)

@router.get("/custom", response_model=SettlementResponse)
def get_custom_settlement(
    from_date: str = Query(...),
    to_date: str = Query(...),
    group_id: str = Depends(get_active_group_id),
    db: Session = Depends(get_db)
):
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="From Date must be less than or equal to To Date.")
        
    return settlement_service.calculate_settlement_range(db, group_id, from_date, to_date)
