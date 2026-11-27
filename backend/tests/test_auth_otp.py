import pytest
from unittest.mock import patch
from app.models.user import User, PasswordResetToken

def test_password_reset_otp_flow(client, db):
    # 1. Register a test user
    reg_payload = {
        "email": "testuser@example.com",
        "password": "initialpassword123",
        "name": "Test User",
        "group_name": "Test Flat"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # 2. Request OTP for non-existent email -> 404
    bad_req = client.post("/api/auth/forgot-password/send-otp", json={"email": "nobody@example.com"})
    assert bad_req.status_code == 404

    # 3. Request OTP with mocked email delivery
    with patch("app.services.auth_service.send_otp_email", return_value={"sent": True, "dev_mode": False}):
        send_res = client.post("/api/auth/forgot-password/send-otp", json={"email": "testuser@example.com"})
        assert send_res.status_code == 200
        data = send_res.json()
        assert data["status"] == "success"
        # The OTP code is securely withheld from the HTTP response
        assert "dev_code" not in data or data.get("dev_code") is None

    # Retrieve OTP directly from database (simulating reading the user's incoming email)
    token_rec = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.email == "testuser@example.com", PasswordResetToken.is_used == False)
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )
    assert token_rec is not None
    otp_code = token_rec.otp_code
    assert len(otp_code) == 6

    # 3.5 Attempt validate code with wrong OTP -> 400
    bad_val = client.post("/api/auth/forgot-password/validate-code", json={
        "email": "testuser@example.com",
        "otp_code": "000000"
    })
    assert bad_val.status_code == 400

    # 3.6 Validate code with correct OTP -> 200
    good_val = client.post("/api/auth/forgot-password/validate-code", json={
        "email": "testuser@example.com",
        "otp_code": otp_code
    })
    assert good_val.status_code == 200
    assert good_val.json()["status"] == "success"

    # 4. Attempt verify with wrong OTP code -> 400
    wrong_verify = client.post("/api/auth/forgot-password/verify", json={
        "email": "testuser@example.com",
        "otp_code": "000000",
        "new_password": "brandnewpassword456"
    })
    assert wrong_verify.status_code == 400

    # 5. Verify with correct OTP code from email -> 200 and returns auth response with access token
    verify_res = client.post("/api/auth/forgot-password/verify", json={
        "email": "testuser@example.com",
        "otp_code": otp_code,
        "new_password": "brandnewpassword456"
    })
    assert verify_res.status_code == 200
    auth_data = verify_res.json()
    assert "access_token" in auth_data
    assert auth_data["user"]["email"] == "testuser@example.com"

    # 6. Verify that the used OTP cannot be reused -> 400
    reuse_res = client.post("/api/auth/forgot-password/verify", json={
        "email": "testuser@example.com",
        "otp_code": otp_code,
        "new_password": "anotherpassword789"
    })
    assert reuse_res.status_code == 400

    # 7. Old password no longer works
    old_login = client.post("/api/auth/login", json={
        "email": "testuser@example.com",
        "password": "initialpassword123"
    })
    assert old_login.status_code == 401

    # 8. New password logs in successfully
    new_login = client.post("/api/auth/login", json={
        "email": "testuser@example.com",
        "password": "brandnewpassword456"
    })
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()
