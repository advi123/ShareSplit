from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.expense import ExpenseResponse, ExpenseCreate, ExpenseUpdate
import app.repositories.expense_repository as expense_repo
import app.services.expense_service as expense_service
import app.services.group_service as group_service

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.get("", response_model=list[ExpenseResponse])
def read_expenses(
    date: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    week_id: str | None = Query(None),
    category: str | None = Query(None),
    paid_by: str | None = Query(None),
    source: str | None = Query(None),
    expense_type: str | None = Query(None, alias="type"),
    db: Session = Depends(get_db)
):
    group = group_service.get_or_create_default_group(db)
    raw_expenses = expense_repo.get_expenses(
        db,
        group_id=group.id,
        date=date,
        start_date=start_date,
        end_date=end_date,
        week_id=week_id,
        category=category,
        paid_by=paid_by,
        source=source,
        expense_type=expense_type
    )
    import app.repositories.member_repository as member_repo
    members = member_repo.get_members(db, group.id, include_inactive=True)
    members_map = {m.id: m.name for m in members}
    return [expense_service.build_expense_response(db, e, members_map) for e in raw_expenses]

@router.post("", response_model=ExpenseResponse)
def create_expense(expense_in: ExpenseCreate, db: Session = Depends(get_db)):
    group = group_service.get_or_create_default_group(db)
    return expense_service.validate_and_create_expense(db, group.id, expense_in)

@router.get("/{expense_id}", response_model=ExpenseResponse)
def read_expense(expense_id: str, db: Session = Depends(get_db)):
    expense = expense_repo.get_expense(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense_service.build_expense_response(db, expense)

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: str, expense_in: ExpenseUpdate, db: Session = Depends(get_db)):
    group = group_service.get_or_create_default_group(db)
    return expense_service.validate_and_update_expense(db, group.id, expense_id, expense_in)

@router.delete("/{expense_id}")
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    group = group_service.get_or_create_default_group(db)
    expense_service.delete_expense_with_check(db, group.id, expense_id)
    return {"status": "success", "message": "Expense deleted successfully"}
