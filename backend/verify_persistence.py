import os
import sys
import json
import httpx

BASE_URL = "http://127.0.0.1:8000/api"
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "sharesplit.db"))
ID_FILE = os.path.join(os.path.dirname(__file__), "persist_expense_id.txt")

def log_header():
    print("==================================================")
    print("DATABASE PERSISTENCE VERIFICATION (STEP 3)")
    print("==================================================")
    print(f"DATABASE_URL: sqlite:///{DB_PATH}")
    print(f"Absolute database path: {DB_PATH}")
    print("--------------------------------------------------")

def do_create():
    log_header()
    with httpx.Client() as client:
        # Create unique description to ensure it's fresh
        import time
        desc = f"Persist Check {int(time.time())}"
        
        # Get a member
        resp_members = client.get(f"{BASE_URL}/members?include_inactive=false")
        assert resp_members.status_code == 200
        members = resp_members.json()
        assert len(members) > 0, "No members found! Start backend first."
        payer_id = members[0]["id"]
        
        payload = {
            "description": desc,
            "category": "Groceries",
            "date": "2026-08-14",
            "type": "simple",
            "paid_by": payer_id,
            "total_amount": 500.00,
            "participants": [payer_id]
        }
        
        resp = client.post(f"{BASE_URL}/expenses", json=payload)
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        
        exp_id = resp.json()["id"]
        with open(ID_FILE, "w") as f:
            f.write(exp_id)
            
        print(f"1. Created expense with ID: {exp_id}")
        print(f"2. Saved ID to: {ID_FILE}")
        print("Please terminate the backend server process, start it again, and run:")
        print("  python verify_persistence.py verify")
        print("==================================================")

def do_verify():
    log_header()
    if not os.path.exists(ID_FILE):
        print(f"Error: {ID_FILE} not found! Run 'create' first.")
        sys.exit(1)
        
    with open(ID_FILE, "r") as f:
        exp_id = f.read().strip()
        
    print(f"Looking up expense ID: {exp_id}")
    with httpx.Client() as client:
        resp = client.get(f"{BASE_URL}/expenses/{exp_id}")
        if resp.status_code == 404:
            print("FAILED: Expense not found! Database was recreated or lost.")
            sys.exit(1)
        elif resp.status_code == 200:
            data = resp.json()
            print(f"SUCCESS: Expense found in database after restart!")
            print(f"  Retrieved ID: {data['id']}")
            print(f"  Description: '{data['description']}'")
            print(f"  Amount: {data['total_amount']}")
            # Cleanup temp file
            try:
                os.remove(ID_FILE)
            except Exception:
                pass
            sys.exit(0)
        else:
            print(f"Unexpected status code {resp.status_code}: {resp.text}")
            sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("create", "verify"):
        print("Usage: python verify_persistence.py [create|verify]")
        sys.argv = ["", "create"]
        
    action = sys.argv[1]
    if action == "create":
        do_create()
    else:
        do_verify()
