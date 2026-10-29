import os
import sys
import json
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

print("==================================================")
print("BILL TO EXPENSE RELATIONSHIP VERIFICATION (STEP 4)")
print("==================================================")

with httpx.Client() as client:
    # 1. Fetch members to get a payer
    resp_members = client.get(f"{BASE_URL}/members?include_inactive=false")
    assert resp_members.status_code == 200
    payer_id = resp_members.json()[0]["id"]
    print(f"Using Payer ID: {payer_id}")

    # 2. POST /api/bills/upload
    # Create a small dummy text content file but name it as PNG
    dummy_img = b"PNG_MOCK_IMAGE_DATA_12345"
    files = {"files": ("receipt.png", dummy_img, "image/png")}
    
    resp_upload = client.post(f"{BASE_URL}/bills/upload", files=files)
    assert resp_upload.status_code == 200, f"Upload failed: {resp_upload.text}"
    uploaded_bills = resp_upload.json()
    assert len(uploaded_bills) > 0
    bill_id = uploaded_bills[0]["id"]
    print(f"1. Uploaded Bill ID: {bill_id}")

    # 3. Create expense and link to this bill
    expense_payload = {
        "description": "Store Bill Expense",
        "category": "Groceries",
        "date": "2026-08-14",
        "type": "simple",
        "paid_by": payer_id,
        "total_amount": 350.00,
        "participants": [payer_id],
        "bill_id": bill_id,
        "source": "bill"
    }
    
    resp_create = client.post(f"{BASE_URL}/expenses", json=expense_payload)
    assert resp_create.status_code == 200, f"Create expense failed: {resp_create.text}"
    expense_id = resp_create.json()["id"]
    print(f"2. Created Expense ID: {expense_id}")

    # 4. GET /api/bills/{bill_id} and check expense_id
    resp_bill_get = client.get(f"{BASE_URL}/bills/{bill_id}")
    assert resp_bill_get.status_code == 200
    fetched_bill = resp_bill_get.json()
    linked_expense_id = fetched_bill["expense_id"]
    print(f"3. Retrieved Bill linked expense_id: {linked_expense_id}")

    # 5. GET /api/expenses/{expense_id} and check bill_id
    resp_exp_get = client.get(f"{BASE_URL}/expenses/{expense_id}")
    assert resp_exp_get.status_code == 200
    fetched_expense = resp_exp_get.json()
    linked_bill_id = fetched_expense["bill_id"]
    print(f"4. Retrieved Expense linked bill_id: {linked_bill_id}")

    # Verify both directions
    assert linked_expense_id == expense_id, "Bill's linked expense_id does not match the created expense ID!"
    assert linked_bill_id == bill_id, "Expense's linked bill_id does not match the uploaded bill ID!"
    
    print("\nSUCCESS: Bill-Expense bidirectional relationship is completely correct!")
    print(f"  bill.expense_id ({linked_expense_id}) == expense.id ({expense_id})")
    print(f"  expense.bill_id ({linked_bill_id}) == bill.id ({bill_id})")

print("==================================================")
print("RELATIONSHIP VERIFICATION COMPLETED")
print("==================================================")
