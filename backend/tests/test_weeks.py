import pytest

def test_closed_week_modifications_lock(client):
    # Add member B
    b_id = client.post("/api/members", json={"name": "Person B"}).json()["id"]

    # 1. Add expense for Aug 8, 2026 (week is week-2026-08-03)
    resp = client.post(
        "/api/expenses",
        json={
            "description": "Travel",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 900.00,
            "participants": [b_id]
        }
    )
    assert resp.status_code == 200
    exp_id = resp.json()["id"]
    week_id = resp.json()["week_id"]
    assert week_id == "week-2026-08-03"

    # 2. Close the week
    resp_close = client.post(f"/api/weeks/{week_id}/close")
    assert resp_close.status_code == 200
    assert resp_close.json()["status"] == "closed"

    # 3. Attempt to add new expense inside closed week (Aug 9, 2026) -> should return 409 Conflict
    resp_add_conflict = client.post(
        "/api/expenses",
        json={
            "description": "Ice Cream",
            "category": "Groceries",
            "date": "2026-08-09",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 100.00,
            "participants": [b_id]
        }
    )
    assert resp_add_conflict.status_code == 409
    assert "closed week" in resp_add_conflict.json()["detail"]

    # 4. Attempt to update existing expense inside closed week -> should return 409 Conflict
    resp_put_conflict = client.put(
        f"/api/expenses/{exp_id}",
        json={
            "description": "Updated description",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 1000.00,
            "participants": [b_id]
        }
    )
    assert resp_put_conflict.status_code == 409

    # 5. Attempt to delete existing expense inside closed week -> should return 409 Conflict
    resp_del_conflict = client.delete(f"/api/expenses/{exp_id}")
    assert resp_del_conflict.status_code == 409

    # 6. Reopen the week
    resp_reopen = client.post(f"/api/weeks/{week_id}/reopen")
    assert resp_reopen.status_code == 200
    assert resp_reopen.json()["status"] == "active"

    # 7. Add expense should succeed now
    resp_add_success = client.post(
        "/api/expenses",
        json={
            "description": "Ice Cream",
            "category": "Groceries",
            "date": "2026-08-09",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 100.00,
            "participants": [b_id]
        }
    )
    assert resp_add_success.status_code == 200
