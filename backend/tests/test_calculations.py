from decimal import Decimal
from app.utils.calculations import split_amount_equally, simplify_debts

def test_split_amount_equally():
    # 3-person split of 1000
    shares = split_amount_equally(Decimal("1000.00"), 3)
    assert len(shares) == 3
    assert sum(shares) == Decimal("1000.00")
    # Verify remainder distribution
    assert shares[0] == Decimal("333.34")
    assert shares[1] == Decimal("333.33")
    assert shares[2] == Decimal("333.33")

    # 2-person split of 10
    shares_2 = split_amount_equally(Decimal("10.00"), 2)
    assert len(shares_2) == 2
    assert sum(shares_2) == Decimal("10.00")
    assert shares_2[0] == Decimal("5.00")
    assert shares_2[1] == Decimal("5.00")

def test_simplify_debts_scenario_one():
    # A: +600, B: -400, C: -200
    balances = {
        "A": Decimal("600.00"),
        "B": Decimal("-400.00"),
        "C": Decimal("-200.00")
    }
    txs = simplify_debts(balances)
    assert len(txs) == 2
    
    # Verify B -> A 400
    tx_b_a = next(t for t in txs if t["from_member_id"] == "B" and t["to_member_id"] == "A")
    assert tx_b_a["amount"] == Decimal("400.00")
    
    # Verify C -> A 200
    tx_c_a = next(t for t in txs if t["from_member_id"] == "C" and t["to_member_id"] == "A")
    assert tx_c_a["amount"] == Decimal("200.00")

def test_simplify_debts_scenario_two():
    # A: +300, B: +200, C: -500
    balances = {
        "A": Decimal("300.00"),
        "B": Decimal("200.00"),
        "C": Decimal("-500.00")
    }
    txs = simplify_debts(balances)
    assert len(txs) == 2
    
    # Verify C -> A 300
    tx_c_a = next(t for t in txs if t["from_member_id"] == "C" and t["to_member_id"] == "A")
    assert tx_c_a["amount"] == Decimal("300.00")
    
    # Verify C -> B 200
    tx_c_b = next(t for t in txs if t["from_member_id"] == "C" and t["to_member_id"] == "B")
    assert tx_c_b["amount"] == Decimal("200.00")
