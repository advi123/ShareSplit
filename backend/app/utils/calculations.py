from decimal import Decimal, ROUND_HALF_UP

def split_amount_equally(amount: Decimal, num_participants: int) -> list[Decimal]:
    if num_participants <= 0:
        return []
    # Base share rounded to 2 decimal places
    base_share = (amount / num_participants).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    shares = [base_share] * num_participants
    # Compensate remainder on the first participant
    diff = amount - sum(shares)
    if diff != 0:
        shares[0] += diff
    return shares

def simplify_debts(balances: dict[str, Decimal]) -> list[dict]:
    debtors = []  # List of [member_id, debt_amount]
    creditors = []  # List of [member_id, credit_amount]
    
    for m_id, bal in balances.items():
        if bal < -Decimal("0.005"):
            debtors.append([m_id, -bal])
        elif bal > Decimal("0.005"):
            creditors.append([m_id, bal])
            
    # Sort descending to settle largest debts first
    debtors.sort(key=lambda x: x[1], reverse=True)
    creditors.sort(key=lambda x: x[1], reverse=True)
    
    transactions = []
    d_idx = 0
    c_idx = 0
    
    while d_idx < len(debtors) and c_idx < len(creditors):
        d_id, d_amt = debtors[d_idx]
        c_id, c_amt = creditors[c_idx]
        
        if d_amt < Decimal("0.005"):
            d_idx += 1
            continue
        if c_amt < Decimal("0.005"):
            c_idx += 1
            continue
            
        settle_amt = min(d_amt, c_amt)
        transactions.append({
            "from_member_id": d_id,
            "to_member_id": c_id,
            "amount": settle_amt
        })
        
        debtors[d_idx][1] -= settle_amt
        creditors[c_idx][1] -= settle_amt
        
        if debtors[d_idx][1] < Decimal("0.005"):
            d_idx += 1
        if creditors[c_idx][1] < Decimal("0.005"):
            c_idx += 1
            
    return transactions
