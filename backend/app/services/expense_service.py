from decimal import Decimal
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.models.member import Member
from app.models.bill import Bill
import app.repositories.expense_repository as expense_repo
import app.repositories.member_repository as member_repo
import app.repositories.bill_repository as bill_repo
import app.services.week_service as week_service
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseItemResponse, CalculatedShare
from app.utils.calculations import split_amount_equally

def calculate_shares_from_orm(db: Session, expense: Expense, members_map: dict[str, str] | None = None) -> list[CalculatedShare]:
    shares_map = {}
    if expense.type == "simple":
        participants = expense.participants
        if participants:
            shares = split_amount_equally(Decimal(str(expense.total_amount)), len(participants))
            for i, p in enumerate(participants):
                shares_map[p.id] = shares_map.get(p.id, Decimal("0.00")) + shares[i]
    else:  # itemized
        for item in expense.items:
            participants = item.participants
            if participants:
                shares = split_amount_equally(Decimal(str(item.amount)), len(participants))
                for i, p in enumerate(participants):
                    shares_map[p.id] = shares_map.get(p.id, Decimal("0.00")) + shares[i]
                    
    calculated_shares = []
    for m_id, amount in shares_map.items():
        if members_map and m_id in members_map:
            m_name = members_map[m_id]
        else:
            member = member_repo.get_member(db, m_id)
            m_name = member.name if member else "Unknown Member"
        calculated_shares.append(
            CalculatedShare(member_id=m_id, member_name=m_name, amount=amount)
        )
    return calculated_shares

def build_expense_response(db: Session, expense: Expense, members_map: dict[str, str] | None = None) -> ExpenseResponse:
    if members_map and expense.paid_by in members_map:
        payer_name = members_map[expense.paid_by]
    elif expense.payer:
        payer_name = expense.payer.name
    else:
        payer = member_repo.get_member(db, expense.paid_by)
        payer_name = payer.name if payer else "Unknown Member"
    
    participants_ids = [p.id for p in expense.participants]
    
    items_response = []
    for item in expense.items:
        items_response.append(
            ExpenseItemResponse(
                id=item.id,
                name=item.name,
                amount=item.amount,
                participants=[p.id for p in item.participants]
            )
        )
        
    shares = calculate_shares_from_orm(db, expense, members_map)
    
    bill_id = expense.bill.id if expense.bill else None
    bill_stored_filename = expense.bill.stored_filename if expense.bill else None
    
    return ExpenseResponse(
        id=expense.id,
        group_id=expense.group_id,
        week_id=expense.week_id,
        description=expense.description,
        category=expense.category,
        date=expense.date,
        type=expense.type,
        source=expense.source,
        paid_by=expense.paid_by,
        paid_by_name=payer_name,
        total_amount=expense.total_amount,
        notes=expense.notes,
        participants=participants_ids,
        items=items_response,
        shares=shares,
        bill_id=bill_id,
        bill_stored_filename=bill_stored_filename,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )

def validate_and_create_expense(db: Session, group_id: str, expense_in: ExpenseCreate) -> ExpenseResponse:
    # 1. Basic validation
    if expense_in.total_amount <= 0:
        raise HTTPException(status_code=400, detail="Expense amount must be greater than 0.")
        
    # Validate paid-by member exists and belongs to the group
    payer = member_repo.get_member(db, expense_in.paid_by)
    if not payer or payer.group_id != group_id:
        raise HTTPException(status_code=400, detail="Paid-by member not found or does not belong to group.")
    if not payer.is_active:
        raise HTTPException(status_code=400, detail="Cannot create expense with an inactive payer.")
        
    # Validate participants
    if expense_in.type in ("simple", "custom") or (expense_in.type != "itemized" and not expense_in.items):
        if not expense_in.participants or len(expense_in.participants) == 0:
            raise HTTPException(status_code=400, detail="Simple split requires at least one participant.")
        for p_id in expense_in.participants:
            p = member_repo.get_member(db, p_id)
            if not p or p.group_id != group_id:
                raise HTTPException(status_code=400, detail=f"Participant {p_id} not found in group.")
            if not p.is_active:
                raise HTTPException(status_code=400, detail=f"Participant {p.name} is inactive.")
    else:  # itemized
        if not expense_in.items or len(expense_in.items) == 0:
            raise HTTPException(status_code=400, detail="Itemized split requires at least one item.")
            
        items_total = Decimal("0.00")
        for item in expense_in.items:
            if item.amount <= 0:
                raise HTTPException(status_code=400, detail=f"Item '{item.name}' amount must be greater than 0.")
            if not item.participants or len(item.participants) == 0:
                raise HTTPException(status_code=400, detail=f"Item '{item.name}' requires at least one participant.")
                
            items_total += Decimal(str(item.amount))
            for p_id in item.participants:
                p = member_repo.get_member(db, p_id)
                if not p or p.group_id != group_id:
                    raise HTTPException(status_code=400, detail=f"Item participant {p_id} not found in group.")
                if not p.is_active:
                    raise HTTPException(status_code=400, detail=f"Participant {p.name} is inactive.")
                    
        # Check total matches sum of itemized items
        if abs(items_total - Decimal(str(expense_in.total_amount))) > Decimal("0.005"):
            raise HTTPException(
                status_code=400,
                detail=f"Sum of items ({items_total}) must match total expense amount ({expense_in.total_amount})."
            )
            
    # 2. Assign week dynamically
    week = week_service.get_or_create_week(db, group_id, expense_in.date)
    if week.status == "closed":
        week_service.reopen_week(db, week.id)
        
    # Create the expense in DB
    expense_id = f"exp-{uuid.uuid4().hex[:8]}"
    expense = expense_repo.create_expense(db, group_id, week.id, expense_id, expense_in)
    
    # If bill_id is provided, link it to this expense
    if expense_in.bill_id:
        bill_repo.link_bill_to_expense(db, expense_in.bill_id, expense.id)
        
    return build_expense_response(db, expense)

def validate_and_update_expense(db: Session, group_id: str, expense_id: str, expense_in: ExpenseUpdate) -> ExpenseResponse:
    existing_expense = expense_repo.get_expense(db, expense_id)
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
        
    # Validate amount > 0
    if expense_in.total_amount <= 0:
        raise HTTPException(status_code=400, detail="Expense amount must be greater than 0.")
        
    # Validate payer
    payer = member_repo.get_member(db, expense_in.paid_by)
    if not payer or payer.group_id != group_id:
        raise HTTPException(status_code=400, detail="Paid-by member not found or does not belong to group.")
        
    # Validate participants (allow inactive if they were already in the historical expense, but standard is to enforce active only for updates)
    if expense_in.type in ("simple", "custom") or (expense_in.type != "itemized" and not expense_in.items):
        if not expense_in.participants or len(expense_in.participants) == 0:
            raise HTTPException(status_code=400, detail="Simple split requires at least one participant.")
        for p_id in expense_in.participants:
            p = member_repo.get_member(db, p_id)
            if not p or p.group_id != group_id:
                raise HTTPException(status_code=400, detail=f"Participant {p_id} not found in group.")
    else:  # itemized
        if not expense_in.items or len(expense_in.items) == 0:
            raise HTTPException(status_code=400, detail="Itemized split requires at least one item.")
            
        items_total = Decimal("0.00")
        for item in expense_in.items:
            if item.amount <= 0:
                raise HTTPException(status_code=400, detail=f"Item '{item.name}' amount must be greater than 0.")
            if not item.participants or len(item.participants) == 0:
                raise HTTPException(status_code=400, detail=f"Item '{item.name}' requires at least one participant.")
                
            items_total += Decimal(str(item.amount))
            for p_id in item.participants:
                p = member_repo.get_member(db, p_id)
                if not p or p.group_id != group_id:
                    raise HTTPException(status_code=400, detail=f"Item participant {p_id} not found in group.")
                    
        if abs(items_total - Decimal(str(expense_in.total_amount))) > Decimal("0.005"):
            raise HTTPException(
                status_code=400,
                detail=f"Sum of items ({items_total}) must match total expense amount ({expense_in.total_amount})."
            )
            
    new_week = week_service.get_or_create_week(db, group_id, expense_in.date)
    expense = expense_repo.update_expense(db, expense_id, new_week.id, expense_in)
    
    # Ensure bill links remain intact
    if expense_in.bill_id:
        bill_repo.link_bill_to_expense(db, expense_in.bill_id, expense.id)
        
    return build_expense_response(db, expense)

def delete_expense_with_check(db: Session, group_id: str, expense_id: str) -> bool:
    expense = expense_repo.get_expense(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
        
    # Check closed week
    week = week_service.get_or_create_week(db, group_id, expense.date)
    if week.status == "closed":
        week_service.reopen_week(db, week.id)
        
    # Set linked bill expense_id to None instead of physical delete of bill or path
    if expense.bill:
        expense.bill.expense_id = None
        db.add(expense.bill)
        db.flush()
        
    return expense_repo.delete_expense(db, expense_id)
