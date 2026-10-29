from sqlalchemy.orm import Session
from app.models.bill import Bill
from app.models.expense import Expense

def get_bill(db: Session, bill_id: str) -> Bill | None:
    return db.query(Bill).filter(Bill.id == bill_id).first()

def get_bills(
    db: Session,
    group_id: str,
    date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    paid_by: str | None = None,
    category: str | None = None,
    week_id: str | None = None
) -> list[Bill]:
    query = db.query(Bill)
    # If filtering by expense attributes, join with Expense
    if date or start_date or end_date or paid_by or category or week_id:
        query = query.join(Expense, Bill.expense_id == Expense.id).filter(Expense.group_id == group_id)
        if date:
            query = query.filter(Expense.date == date)
        if start_date:
            query = query.filter(Expense.date >= start_date)
        if end_date:
            query = query.filter(Expense.date <= end_date)
        if paid_by:
            query = query.filter(Expense.paid_by == paid_by)
        if category:
            query = query.filter(Expense.category == category)
        if week_id:
            query = query.filter(Expense.week_id == week_id)
    else:
        # Default fallback to bills that belong to expenses of this group, or all bills
        # Since group_id is required in context of the app, let's filter bills that belong to expenses in the group
        # or have no expense linked yet (e.g. uploaded but not linked)
        query = query.outerjoin(Expense).filter((Expense.id == None) | (Expense.group_id == group_id))
        
    return query.order_by(Bill.uploaded_at.desc()).all()

def create_bill(
    db: Session,
    bill_id: str,
    original_filename: str,
    stored_filename: str,
    file_path: str,
    mime_type: str,
    file_size: int
) -> Bill:
    db_bill = Bill(
        id=bill_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=file_path,
        mime_type=mime_type,
        file_size=file_size
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def link_bill_to_expense(db: Session, bill_id: str, expense_id: str) -> Bill | None:
    db_bill = get_bill(db, bill_id)
    if db_bill:
        db_bill.expense_id = expense_id
        db.commit()
        db.refresh(db_bill)
    return db_bill

def delete_bill(db: Session, bill_id: str) -> bool:
    db_bill = get_bill(db, bill_id)
    if db_bill:
        db.delete(db_bill)
        db.commit()
        return True
    return False
