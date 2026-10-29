import pytest

def test_section_60_e2e_scenario(client):
    # 1. Add members: You, Person B, Person C
    you_id = client.post("/api/members", json={"name": "You"}).json()["id"]
    b_id = client.post("/api/members", json={"name": "Person B"}).json()["id"]
    c_id = client.post("/api/members", json={"name": "Person C"}).json()["id"]

    # 2. Add Monday expense (Aug 10): You pays 900 travel. Shared: You + B + C.
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Monday Travel",
            "category": "Travel",
            "date": "2026-08-10",
            "type": "simple",
            "paid_by": you_id,
            "total_amount": 900.00,
            "participants": [you_id, b_id, c_id]
        }
    )
    assert resp.status_code == 200

    # 3. Add Tuesday expense (Aug 11): B pays 600 groceries. Shared: You + B + C.
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Tuesday Groceries",
            "category": "Groceries",
            "date": "2026-08-11",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 600.00,
            "participants": [you_id, b_id, c_id]
        }
    )
    assert resp.status_code == 200

    # 4. Add Wednesday expense (Aug 12): C pays 450 itemized.
    # Item 1: 150, You + B + C
    # Item 2: 100, B
    # Item 3: 200, You + C
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Wednesday Itemized",
            "category": "Groceries",
            "date": "2026-08-12",
            "type": "itemized",
            "paid_by": c_id,
            "total_amount": 450.00,
            "items": [
                {"name": "Item 1", "amount": 150.00, "participants": [you_id, b_id, c_id]},
                {"name": "Item 2", "amount": 100.00, "participants": [b_id]},
                {"name": "Item 3", "amount": 200.00, "participants": [you_id, c_id]}
            ]
        }
    )
    assert resp.status_code == 200

    # 5. Add Thursday expense (Aug 13): You pays 750 dinner. Shared: You + B + C.
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Thursday Dinner",
            "category": "Entertainment",
            "date": "2026-08-13",
            "type": "simple",
            "paid_by": you_id,
            "total_amount": 750.00,
            "participants": [you_id, b_id, c_id]
        }
    )
    assert resp.status_code == 200

    # 6. Add Friday expense (Aug 14): B pays 300 travel. Shared: You + B.
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Friday Travel",
            "category": "Travel",
            "date": "2026-08-14",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 300.00,
            "participants": [you_id, b_id]
        }
    )
    assert resp.status_code == 200

    # 7. Add Saturday expense (Aug 15): C pays 900 groceries. Shared: You + B + C.
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Saturday Groceries",
            "category": "Groceries",
            "date": "2026-08-15",
            "type": "simple",
            "paid_by": c_id,
            "total_amount": 900.00,
            "participants": [you_id, b_id, c_id]
        }
    )
    assert resp.status_code == 200

    # ==========================================
    # Verification checks:
    # ==========================================

    # A. Daily Settlement for Monday (Aug 10)
    # Total spent: 900. You paid 900, You share 300, B share 300, C share 300.
    # B pays You 300, C pays You 300.
    resp_day = client.get("/api/settlements/daily?date=2026-08-10")
    assert resp_day.status_code == 200
    day_data = resp_day.json()
    assert day_data["total_expenses"] == 900.00
    assert len(day_data["settlement"]) == 2
    
    # B. Weekly Settlement (for week containing Aug 10, i.e. week-2026-08-10)
    # Week id format: week-2026-08-10
    resp_week = client.get("/api/settlements/weekly/week-2026-08-10")
    assert resp_week.status_code == 200
    week_data = resp_week.json()
    assert week_data["total_expenses"] == 3900.00
    
    # Check weekly balances
    members_summary = week_data["members"]
    you_sum = next(m for m in members_summary if m["member_id"] == you_id)
    b_sum = next(m for m in members_summary if m["member_id"] == b_id)
    c_sum = next(m for m in members_summary if m["member_id"] == c_id)
    
    # You paid: 1650, share: 1350, balance: +300
    assert you_sum["total_paid"] == 1650.00
    assert you_sum["total_share"] == 1350.00
    assert you_sum["net_balance"] == 300.00
    
    # B paid: 900, share: 1350, balance: -450
    assert b_sum["total_paid"] == 900.00
    assert b_sum["total_share"] == 1350.00
    assert b_sum["net_balance"] == -450.00
    
    # C paid: 1350, share: 1200, balance: +150
    assert c_sum["total_paid"] == 1350.00
    assert c_sum["total_share"] == 1200.00
    assert c_sum["net_balance"] == 150.00
    
    # Weekly pairwise net transactions:
    # B pays You 200
    # C pays You 100
    # B pays C 250
    txs = week_data["settlement"]
    assert len(txs) == 3
    tx_b_you = next(t for t in txs if t["from_member_id"] == b_id and t["to_member_id"] == you_id)
    assert tx_b_you["amount"] == 200.00
    tx_c_you = next(t for t in txs if t["from_member_id"] == c_id and t["to_member_id"] == you_id)
    assert tx_c_you["amount"] == 100.00
    tx_b_c = next(t for t in txs if t["from_member_id"] == b_id and t["to_member_id"] == c_id)
    assert tx_b_c["amount"] == 250.00

    # C. Custom Settlement for Aug 10 -> Aug 13
    # Expenses: Monday (900), Tuesday (600), Wednesday (450), Thursday (750)
    # Total spent = 2700.00
    # Paid: You: 1650, B: 600, C: 450
    # Shares:
    # Monday: You: 300, B: 300, C: 300
    # Tuesday: You: 200, B: 200, C: 200
    # Wednesday: You: 150, B: 150, C: 150
    # Thursday: You: 250, B: 250, C: 250
    # Total shares: You: 900, B: 900, C: 900
    # Balances: You: +750, B: -300, C: -450
    # pairwise net: B pays You 350, C pays You 400, C pays B 50
    resp_custom_1 = client.get("/api/settlements/custom?from_date=2026-08-10&to_date=2026-08-13")
    assert resp_custom_1.status_code == 200
    custom_1_data = resp_custom_1.json()
    assert custom_1_data["total_expenses"] == 2700.00
    txs_custom_1 = custom_1_data["settlement"]
    assert len(txs_custom_1) == 3
    assert next(t for t in txs_custom_1 if t["from_member_id"] == b_id and t["to_member_id"] == you_id)["amount"] == 350.00
    assert next(t for t in txs_custom_1 if t["from_member_id"] == c_id and t["to_member_id"] == you_id)["amount"] == 400.00
    assert next(t for t in txs_custom_1 if t["from_member_id"] == c_id and t["to_member_id"] == b_id)["amount"] == 50.00

    # D. Custom Settlement for Aug 11 -> Aug 15
    # Expenses: Tuesday (600), Wednesday (450), Thursday (750), Friday (300), Saturday (900)
    # Total spent = 3000.00
    # Paid: You: 750, B: 900 (groceries 600 + travel 300), C: 1350 (itemized 450 + groceries 900)
    # Shares:
    # Tuesday: You: 200, B: 200, C: 200
    # Wednesday: You: 150, B: 150, C: 150
    # Thursday: You: 250, B: 250, C: 250
    # Friday: You: 150, B: 150, C: 0
    # Saturday: You: 300, B: 300, C: 300
    # Total shares: You: 1050, B: 1050, C: 900
    # Balances: You: -300, B: -150, C: +450
    # pairwise net: You pays B 100, You pays C 200, B pays C 250
    resp_custom_2 = client.get("/api/settlements/custom?from_date=2026-08-11&to_date=2026-08-15")
    assert resp_custom_2.status_code == 200
    custom_2_data = resp_custom_2.json()
    assert custom_2_data["total_expenses"] == 3000.00
    txs_custom_2 = custom_2_data["settlement"]
    assert len(txs_custom_2) == 3
    assert next(t for t in txs_custom_2 if t["from_member_id"] == you_id and t["to_member_id"] == b_id)["amount"] == 100.00
    assert next(t for t in txs_custom_2 if t["from_member_id"] == you_id and t["to_member_id"] == c_id)["amount"] == 200.00
    assert next(t for t in txs_custom_2 if t["from_member_id"] == b_id and t["to_member_id"] == c_id)["amount"] == 250.00
