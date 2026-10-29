from decimal import Decimal
import json
import re
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.utils.calculations import simplify_debts
from app.schemas.settlement import SettlementResponse, MemberSettlementSummary, SettlementTransaction
import app.repositories.member_repository as member_repo

def parse_split_meta(notes: str | None) -> dict:
    if not notes:
        return {}
    match = re.search(r"\[SPLIT_META:(.*?)\]", notes)
    if not match:
        return {}
    try:
        return json.loads(match.group(1))
    except Exception:
        return {}

def calculate_settlement_range(db: Session, group_id: str, from_date: str, to_date: str) -> SettlementResponse:
    members = member_repo.get_members(db, group_id, include_inactive=True)
    
    expenses = db.query(Expense).filter(
        Expense.group_id == group_id,
        Expense.date >= from_date,
        Expense.date <= to_date
    ).all()
    
    total_expenses = sum(Decimal(str(e.total_amount)) for e in expenses)
    
    paid_map = {m.id: Decimal("0.00") for m in members}
    share_map = {m.id: Decimal("0.00") for m in members}
    
    # 2D map of debts: debtor -> creditor -> amount
    debts = {m.id: {other.id: Decimal("0.00") for other in members if other.id != m.id} for m in members}
    
    for expense in expenses:
        meta = parse_split_meta(expense.notes)
        paid_by_map = meta.get("paidByMap")
        custom_shares = meta.get("customShares")
        
        # Calculate paid amounts
        exp_paid = {}
        if paid_by_map and isinstance(paid_by_map, dict) and len(paid_by_map) > 0:
            for p_id, val in paid_by_map.items():
                amt = Decimal(str(val))
                exp_paid[p_id] = amt
                if p_id in paid_map:
                    paid_map[p_id] += amt
        else:
            paid_by = expense.paid_by
            exp_paid[paid_by] = Decimal(str(expense.total_amount))
            if paid_by in paid_map:
                paid_map[paid_by] += Decimal(str(expense.total_amount))
                
        # Calculate share amounts
        exp_shares = {}
        if custom_shares and isinstance(custom_shares, dict) and len(custom_shares) > 0:
            for p_id, val in custom_shares.items():
                amt = Decimal(str(val))
                exp_shares[p_id] = amt
                if p_id in share_map:
                    share_map[p_id] += amt
        elif expense.type in ("simple", "custom") or not expense.items:
            parts = expense.participants
            if len(parts) > 0:
                share = Decimal(str(expense.total_amount)) / len(parts)
                for p in parts:
                    exp_shares[p.id] = share
                    if p.id in share_map:
                        share_map[p.id] += share
        elif expense.type == "itemized":
            for item in expense.items:
                item_parts = item.participants
                if len(item_parts) > 0:
                    share = Decimal(str(item.amount)) / len(item_parts)
                    for p in item_parts:
                        exp_shares[p.id] = exp_shares.get(p.id, Decimal("0.00")) + share
                        if p.id in share_map:
                            share_map[p.id] += share

        # Compute expense net and update debts
        exp_creditors = []
        exp_debtors = []
        all_ids = set(exp_paid.keys()).union(set(exp_shares.keys()))
        for p_id in all_ids:
            p = exp_paid.get(p_id, Decimal("0.00"))
            s = exp_shares.get(p_id, Decimal("0.00"))
            diff = p - s
            if diff > Decimal("0.005"):
                exp_creditors.append({"id": p_id, "amount": diff})
            elif diff < -Decimal("0.005"):
                exp_debtors.append({"id": p_id, "amount": -diff})

        c_list = [dict(c) for c in exp_creditors]
        d_list = [dict(d) for d in exp_debtors]

        while len(c_list) > 0 and len(d_list) > 0:
            d_list.sort(key=lambda x: x["amount"], reverse=True)
            c_list.sort(key=lambda x: x["amount"], reverse=True)
            debtor = d_list[0]
            creditor = c_list[0]
            transfer = min(debtor["amount"], creditor["amount"])
            if transfer > Decimal("0.005") and debtor["id"] in debts and creditor["id"] in debts[debtor["id"]]:
                debts[debtor["id"]][creditor["id"]] += transfer
            debtor["amount"] -= transfer
            creditor["amount"] -= transfer
            if debtor["amount"] <= Decimal("0.005"):
                d_list.pop(0)
            if creditor["amount"] <= Decimal("0.005"):
                c_list.pop(0)

    member_summaries = []
    for m in members:
        paid = paid_map[m.id]
        share = share_map[m.id]
        balance = paid - share
        if paid > 0 or share > 0 or abs(balance) > Decimal("0.005"):
            member_summaries.append(
                MemberSettlementSummary(
                    member_id=m.id,
                    name=m.name,
                    total_paid=paid,
                    total_share=share,
                    net_balance=balance
                )
            )
            
    # Compute net pairwise debts
    transactions = []
    seen_pairs = set()
    for m1 in members:
        for m2 in members:
            if m1.id == m2.id or (m1.id, m2.id) in seen_pairs or (m2.id, m1.id) in seen_pairs:
                continue
            seen_pairs.add((m1.id, m2.id))
            
            m1_to_m2 = debts[m1.id].get(m2.id, Decimal("0.00"))
            m2_to_m1 = debts[m2.id].get(m1.id, Decimal("0.00"))
            
            diff = m1_to_m2 - m2_to_m1
            if diff > Decimal("0.005"):
                transactions.append(
                    SettlementTransaction(
                        from_member_id=m1.id,
                        from_member_name=m1.name,
                        to_member_id=m2.id,
                        to_member_name=m2.name,
                        amount=diff.quantize(Decimal("0.01"))
                    )
                )
            elif diff < -Decimal("0.005"):
                transactions.append(
                    SettlementTransaction(
                        from_member_id=m2.id,
                        from_member_name=m2.name,
                        to_member_id=m1.id,
                        to_member_name=m1.name,
                        amount=(-diff).quantize(Decimal("0.01"))
                    )
                )
                
    return SettlementResponse(
        from_date=from_date,
        to_date=to_date,
        total_expenses=total_expenses,
        members=member_summaries,
        settlement=transactions
    )
