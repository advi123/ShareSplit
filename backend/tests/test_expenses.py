import pytest

def test_manual_simple_expense(client):
    # Add member B and C
    b_id = client.post("/api/members", json={"name": "Person B"}).json()["id"]
    c_id = client.post("/api/members", json={"name": "Person C"}).json()["id"]

    # Add simple expense
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Travel",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 900.00,
            "participants": [b_id, c_id],
            "source": "manual"
        }
    )
    assert resp.status_code == 200
    exp = resp.json()
    assert exp["description"] == "Travel"
    assert exp["total_amount"] == 900.00
    assert exp["paid_by"] == b_id
    
    # Check calculated shares (900 split between 2: 450 each)
    shares = exp["shares"]
    assert len(shares) == 2
    assert next(s for s in shares if s["member_id"] == b_id)["amount"] == 450.00
    assert next(s for s in shares if s["member_id"] == c_id)["amount"] == 450.00

def test_itemized_expense(client):
    b_id = client.post("/api/members", json={"name": "Person B"}).json()["id"]
    c_id = client.post("/api/members", json={"name": "Person C"}).json()["id"]

    # Add itemized expense
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Groceries",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "itemized",
            "paid_by": b_id,
            "total_amount": 450.00,
            "source": "manual",
            "items": [
                # Rice: 150 split between B and C (75 each)
                {"name": "Rice", "amount": 150.00, "participants": [b_id, c_id]},
                # Shampoo: 100 split only C (100)
                {"name": "Shampoo", "amount": 100.00, "participants": [c_id]},
                # Milk: 200 split B (200)
                {"name": "Milk", "amount": 200.00, "participants": [b_id]}
            ]
        }
    )
    assert resp.status_code == 200
    exp = resp.json()
    
    # Check aggregated calculated shares:
    # B: 75 (Rice) + 200 (Milk) = 275
    # C: 75 (Rice) + 100 (Shampoo) = 175
    shares = exp["shares"]
    assert next(s for s in shares if s["member_id"] == b_id)["amount"] == 275.00
    assert next(s for s in shares if s["member_id"] == c_id)["amount"] == 175.00

def test_expense_validation(client):
    b_id = client.post("/api/members", json={"name": "Person B"}).json()["id"]

    # Invalid amount
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Groceries",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": -10.00,
            "participants": [b_id]
        }
    )
    assert resp.status_code == 400

    # Inactive member
    client.delete(f"/api/members/{b_id}")
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Groceries",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 10.00,
            "participants": [b_id]
        }
    )
    assert resp.status_code == 400
