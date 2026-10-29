import os
import sys
import json
import sqlite3
import httpx

BASE_URL = "http://127.0.0.1:8000/api"
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "sharesplit.db"))

print("==================================================")
print("RUNNING API CONTRACT VERIFICATION (STEP 2)")
print("==================================================")
print(f"FastAPI Server URL: {BASE_URL}")
print(f"SQLite DB Path: {DB_PATH}\n")

with httpx.Client() as client:
    # 1. Fetch active members to get a valid payer ID
    resp_members = client.get(f"{BASE_URL}/members?include_inactive=false")
    assert resp_members.status_code == 200, f"Failed to get members: {resp_members.text}"
    members = resp_members.json()
    if not members:
        # Create a member if none exist
        resp_create_member = client.post(
            f"{BASE_URL}/members",
            json={"name": "Test Payer", "nickname": "Payer"}
        )
        assert resp_create_member.status_code == 200
        payer_id = resp_create_member.json()["id"]
    else:
        payer_id = members[0]["id"]

    print(f"Using Payer ID: {payer_id}")

    # 2. POST /api/expenses
    expense_payload = {
        "description": "Contract Dinner",
        "category": "Food",
        "date": "2026-08-14",
        "type": "simple",
        "paid_by": payer_id,
        "total_amount": 1200.00,
        "participants": [payer_id]
    }
    
    resp_create = client.post(f"{BASE_URL}/expenses", json=expense_payload)
    assert resp_create.status_code == 200, f"Failed to create expense: {resp_create.text}"
    
    created_data = resp_create.json()
    created_id = created_data["id"]
    created_amount = created_data["total_amount"]
    print(f"POST Response: Status=200, Created ID={created_id}, Amount={created_amount}")

    # 3. Immediately call GET /api/expenses/{returned_id}
    resp_get = client.get(f"{BASE_URL}/expenses/{created_id}")
    assert resp_get.status_code == 200, f"Failed to GET expense: {resp_get.text}"
    
    fetched_data = resp_get.json()
    fetched_id = fetched_data["id"]
    fetched_amount = fetched_data["total_amount"]
    print(f"GET Response: Status=200, Retrieved ID={fetched_id}, Amount={fetched_amount}")

    # 4. Directly query SQLite database file
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, total_amount, description FROM expenses WHERE id = ?", (created_id,))
    db_row = cursor.fetchone()
    conn.close()

    assert db_row is not None, f"Expense with ID {created_id} not found in SQLite file!"
    db_id, db_amount, db_description = db_row
    print(f"SQLite Database Row: ID={db_id}, Amount={db_amount}, Description='{db_description}'\n")

    # Prove CREATE ID == RESPONSE ID == GET ID == DATABASE ID
    assert created_id == fetched_id == db_id, "IDs mismatch!"
    print("PROVED CONTRACT SUCCESS:")
    print(f"  CREATE ID ({created_id}) == RESPONSE ID ({created_id}) == GET ID ({fetched_id}) == DATABASE ID ({db_id})")

print("==================================================")
print("CONTRACT VERIFICATION COMPLETED SUCCESSFULLY")
print("==================================================")
