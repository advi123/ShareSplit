from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import exists
import app.repositories.member_repository as member_repo
from app.models.member import Member
from app.models.expense import Expense, expense_participants
from app.models.expense_item import expense_item_participants
from app.schemas.member import MemberCreate, MemberUpdate, MemberDetail, MemberDetailExpense
from app.utils.calculations import split_amount_equally

def has_history(db: Session, member_id: str) -> bool:
    if db.query(exists().where(Expense.paid_by == member_id)).scalar():
        return True
    if db.query(exists().where(expense_participants.c.member_id == member_id)).scalar():
        return True
    if db.query(exists().where(expense_item_participants.c.member_id == member_id)).scalar():
        return True
    return False

def get_member_shares_in_expense(member_id: str, expense: Expense) -> Decimal:
    if expense.type == "simple":
        p_ids = [p.id for p in expense.participants]
        if member_id in p_ids:
            idx = p_ids.index(member_id)
            shares = split_amount_equally(Decimal(str(expense.total_amount)), len(p_ids))
            return shares[idx]
    else:
        total_share = Decimal("0.00")
        for item in expense.items:
            p_ids = [p.id for p in item.participants]
            if member_id in p_ids:
                idx = p_ids.index(member_id)
                shares = split_amount_equally(Decimal(str(item.amount)), len(p_ids))
                total_share += shares[idx]
        return total_share
    return Decimal("0.00")

def delete_or_deactivate_member(db: Session, member_id: str) -> dict:
    db_member = member_repo.get_member(db, member_id)
    if not db_member:
        return {"success": False, "error": "Member not found", "status_code": 404}
        
    if has_history(db, member_id):
        # Has history: deactivate
        member_repo.deactivate_member(db, member_id)
        return {"success": True, "action": "deactivated", "member": db_member}
    else:
        # No history: physical delete
        member_repo.delete_member(db, member_id)
        return {"success": True, "action": "deleted", "member": db_member}

def get_member_details(db: Session, member_id: str) -> MemberDetail | None:
    db_member = member_repo.get_member(db, member_id)
    if not db_member:
        return None
        
    # Calculate totals
    # 1. Total Paid
    paid_expenses = db.query(Expense).filter(Expense.paid_by == member_id).all()
    total_paid = sum(Decimal(str(e.total_amount)) for e in paid_expenses)
    
    # 2. Total Share
    # Fetch all expenses this member participated in
    all_expenses = db.query(Expense).all()
    total_share = Decimal("0.00")
    participated_expenses = []
    
    for expense in all_expenses:
        share = get_member_shares_in_expense(member_id, expense)
        if share > 0:
            total_share += share
            payer = member_repo.get_member(db, expense.paid_by)
            payer_name = payer.name if payer else "Unknown Member"
            participated_expenses.append(
                MemberDetailExpense(
                    id=expense.id,
                    description=expense.description,
                    date=expense.date,
                    total_amount=float(expense.total_amount),
                    paid_by_name=payer_name,
                    share_amount=float(share)
                )
            )
            
    current_balance = total_paid - total_share
    
    # Sort participated expenses descending by date
    participated_expenses.sort(key=lambda x: x.date, reverse=True)
    
    return MemberDetail(
        id=db_member.id,
        name=db_member.name,
        nickname=db_member.nickname,
        avatar=db_member.avatar,
        color=db_member.color,
        joined_at=db_member.joined_at,
        is_active=db_member.is_active,
        total_paid=float(total_paid),
        total_share=float(total_share),
        current_balance=float(current_balance),
        recent_expenses=participated_expenses[:10]  # Limit to top 10
    )
