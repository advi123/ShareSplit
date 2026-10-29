import io
import pytest

def test_bill_upload_and_linking(client):
    # 1. Create a dummy file upload
    file_content = b"fake image bytes"
    file_name = "test_receipt.jpg"
    files = {"files": (file_name, io.BytesIO(file_content), "image/jpeg")}
    
    resp = client.post("/api/bills/upload", files=files)
    assert resp.status_code == 200
    bills_data = resp.json()
    assert len(bills_data) == 1
    bill = bills_data[0]
    assert bill["original_filename"] == file_name
    bill_id = bill["id"]
    
    # 2. Add member B to payer
    b_id = client.post("/api/members", json={"name": "Person B"}).json()["id"]

    # 3. Create expense linked with this bill
    resp_e = client.post(
        "/api/expenses",
        json={
            "description": "Blinkit bill",
            "category": "Groceries",
            "date": "2026-08-08",
            "type": "simple",
            "paid_by": b_id,
            "total_amount": 400.00,
            "participants": [b_id],
            "source": "bill",
            "bill_id": bill_id
        }
    )
    assert resp_e.status_code == 200
    exp = resp_e.json()
    assert exp["bill_id"] == bill_id
    assert exp["bill_stored_filename"] is not None
    expense_id = exp["id"]

    # 4. Fetch bill image
    resp_img = client.get(f"/api/bills/{bill_id}/image")
    assert resp_img.status_code == 200
    assert resp_img.content == file_content

    # 5. Delete bill image metadata
    resp_d = client.delete(f"/api/bills/{bill_id}")
    assert resp_d.status_code == 200

    # 6. Verify expense still exists but bill link is updated or kept as manual
    resp_get_e = client.get(f"/api/expenses/{expense_id}")
    assert resp_get_e.status_code == 200
    assert resp_get_e.json()["bill_id"] is None
