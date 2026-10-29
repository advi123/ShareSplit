import pytest

def test_member_crud_operations(client):
    # 1. Add member
    resp = client.post("/api/members", json={"name": "Alice", "nickname": "Ali"})
    assert resp.status_code == 200
    alice = resp.json()
    assert alice["name"] == "Alice"
    assert alice["nickname"] == "Ali"
    assert alice["is_active"] is True
    alice_id = alice["id"]

    # 2. Get members
    resp = client.get("/api/members")
    assert resp.status_code == 200
    members = resp.json()
    assert any(m["id"] == alice_id for m in members)

    # 3. Edit member
    resp = client.put(f"/api/members/{alice_id}", json={"name": "Alicia", "nickname": "Ally"})
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["name"] == "Alicia"
    assert updated["nickname"] == "Ally"

    # 4. Deactivate member (no history: should physically delete)
    resp = client.delete(f"/api/members/{alice_id}")
    assert resp.status_code == 200
    assert resp.json()["action"] == "deleted"

    # Get members again: Alice should be gone
    resp = client.get("/api/members")
    assert not any(m["id"] == alice_id for m in resp.json())

def test_deactivate_member_with_history(client):
    # Add member
    resp_m = client.post("/api/members", json={"name": "Alice"})
    alice_id = resp_m.json()["id"]

    # Add expense paid by Alice to create history
    resp_e = client.post(
        "/api/expenses",
        json={
            "description": "Travel",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "simple",
            "paid_by": alice_id,
            "total_amount": 900.00,
            "participants": [alice_id],
            "source": "manual"
        }
    )
    assert resp_e.status_code == 200

    # Deactivate Alice: she has history so she should be deactivated (is_active = False)
    resp_d = client.delete(f"/api/members/{alice_id}")
    assert resp_d.status_code == 200
    assert resp_d.json()["action"] == "deactivated"

    # Verify Alice is inactive and not in active member list
    resp_list_active = client.get("/api/members")
    assert not any(m["id"] == alice_id for m in resp_list_active.json())

    # Verify Alice is in include_inactive list
    resp_list_all = client.get("/api/members?include_inactive=true")
    alice_inactive = next(m for m in resp_list_all.json() if m["id"] == alice_id)
    assert alice_inactive["is_active"] is False

    # Reactivate Alice
    resp_r = client.post(f"/api/members/{alice_id}/reactivate")
    assert resp_r.status_code == 200
    assert resp_r.json()["is_active"] is True
