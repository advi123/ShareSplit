import uuid
from sqlalchemy.orm import Session, selectinload
from app.models.expense import Expense
from app.models.expense_item import ExpenseItem
from app.models.member import Member
from app.schemas.expense import ExpenseCreate, ExpenseUpdate

def get_expense(db: Session, expense_id: str) -> Expense | None:
    return db.query(Expense).options(
        selectinload(Expense.participants),
        selectinload(Expense.payer),
        selectinload(Expense.bill),
        selectinload(Expense.items).selectinload(ExpenseItem.participants)
    ).filter(Expense.id == expense_id).first()

def get_expenses(
    db: Session,
    group_id: str,
    date: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    week_id: str | None = None,
    category: str | None = None,
    paid_by: str | None = None,
    source: str | None = None,
    expense_type: str | None = None
) -> list[Expense]:
    query = db.query(Expense).options(
        selectinload(Expense.participants),
        selectinload(Expense.payer),
        selectinload(Expense.bill),
        selectinload(Expense.items).selectinload(ExpenseItem.participants)
    ).filter(Expense.group_id == group_id)
    if date:
        query = query.filter(Expense.date == date)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if week_id:
        query = query.filter(Expense.week_id == week_id)
    if category:
        query = query.filter(Expense.category == category)
    if paid_by:
        query = query.filter(Expense.paid_by == paid_by)
    if source:
        query = query.filter(Expense.source == source)
    if expense_type:
        query = query.filter(Expense.type == expense_type)
        
    return query.order_by(Expense.date.desc(), Expense.created_at.desc()).all()

def create_expense(db: Session, group_id: str, week_id: str, expense_id: str, expense_in: ExpenseCreate) -> Expense:
    payer = db.query(Member).filter(Member.id == expense_in.paid_by).first()
    if not payer:
        raise ValueError("Payer not found")
        
    db_expense = Expense(
        id=expense_id,
        group_id=group_id,
        week_id=week_id,
        date=expense_in.date,
        description=expense_in.description,
        category=expense_in.category,
        type=expense_in.type,
        source=expense_in.source or "manual",
        paid_by=expense_in.paid_by,
        total_amount=expense_in.total_amount,
        notes=expense_in.notes
    )
    
    if expense_in.type == "simple" and expense_in.participants:
        participants = db.query(Member).filter(Member.id.in_(expense_in.participants)).all()
        db_expense.participants = participants
        
    db.add(db_expense)
    db.flush()
    
    if expense_in.type == "itemized" and expense_in.items:
        for item in expense_in.items:
            item_id = f"item-{uuid.uuid4().hex[:8]}"
            db_item = ExpenseItem(
                id=item_id,
                expense_id=expense_id,
                name=item.name,
                amount=item.amount
            )
            item_participants = db.query(Member).filter(Member.id.in_(item.participants)).all()
            db_item.participants = item_participants
            db.add(db_item)
            
    db.commit()
    db.refresh(db_expense)
    return db_expense

def update_expense(db: Session, expense_id: str, week_id: str, expense_in: ExpenseUpdate) -> Expense | None:
    db_expense = get_expense(db, expense_id)
    if not db_expense:
        return None
        
    db_expense.week_id = week_id
    db_expense.date = expense_in.date
    db_expense.description = expense_in.description
    db_expense.category = expense_in.category
    db_expense.type = expense_in.type
    db_expense.source = expense_in.source or db_expense.source
    db_expense.paid_by = expense_in.paid_by
    db_expense.total_amount = expense_in.total_amount
    db_expense.notes = expense_in.notes
    
    db_expense.participants = []
    if expense_in.type == "simple" and expense_in.participants:
        participants = db.query(Member).filter(Member.id.in_(expense_in.participants)).all()
        db_expense.participants = participants
        
    for item in db_expense.items:
        db.delete(item)
    db_expense.items = []
    
    if expense_in.type == "itemized" and expense_in.items:
        for item in expense_in.items:
            item_id = f"item-{uuid.uuid4().hex[:8]}"
            db_item = ExpenseItem(
                id=item_id,
                expense_id=expense_id,
                name=item.name,
                amount=item.amount
            )
            item_participants = db.query(Member).filter(Member.id.in_(item.participants)).all()
            db_item.participants = item_participants
            db.add(db_item)
            
    db.commit()
    db.refresh(db_expense)
    return db_expense

def delete_expense(db: Session, expense_id: str) -> bool:
    db_expense = get_expense(db, expense_id)
    if db_expense:
        db.delete(db_expense)
        db.commit()
        return True
    return False
