def test_user_register_and_login(client):
    # Register new user
    reg_payload = {
        "name": "Budi Santoso",
        "email": "budi@example.com",
        "password": "password123",
        "phone_number": "081298765432",
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "budi@example.com"
    assert data["user"]["role"] == "user"
    assert data["user"]["phone_number"] == "6281298765432"  # normalized to 628...
    assert data["user"]["notification_lead_minutes"] == 5

    # Duplicate register should fail
    dup_res = client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 409

    # Login with valid credentials
    login_res = client.post(
        "/api/auth/login",
        json={"email": "budi@example.com", "password": "password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # Login with wrong password
    wrong_res = client.post(
        "/api/auth/login",
        json={"email": "budi@example.com", "password": "wrongpassword"},
    )
    assert wrong_res.status_code == 401


def test_google_auth(client):
    # 1. Google OAuth login for a brand new user (auto-register)
    new_google_res = client.post(
        "/api/auth/google",
        json={"credential": "mock-google-token:citra.lestari@gmail.com:Citra Lestari"},
    )
    assert new_google_res.status_code == 200, new_google_res.text
    new_data = new_google_res.json()
    assert "access_token" in new_data
    assert new_data["user"]["email"] == "citra.lestari@gmail.com"
    assert new_data["user"]["name"] == "Citra Lestari"
    assert new_data["user"]["role"] == "user"

    # 2. Google OAuth login for existing user (e.g., demo user)
    existing_google_res = client.post(
        "/api/auth/google",
        json={"credential": "mock-google-token:demo@example.local:Pengguna Demo"},
    )
    assert existing_google_res.status_code == 200
    existing_data = existing_google_res.json()
    assert existing_data["user"]["email"] == "demo@example.local"
    assert "access_token" in existing_data


def test_gmail_email_verification_flow(client, db):
    target_email = "andi.wijaya@gmail.com"

    # 1. Send OTP to new email
    send_res = client.post(
        "/api/auth/send-verification-otp",
        json={"email": target_email, "name": "Andi Wijaya"},
    )
    assert send_res.status_code == 200, send_res.text
    send_data = send_res.json()
    assert send_data["email"] == target_email
    otp = send_data.get("dev_otp")
    if not otp:
        from app.models import EmailVerification
        rec = (
            db.query(EmailVerification)
            .filter_by(email=target_email)
            .order_by(EmailVerification.id.desc())
            .first()
        )
        otp = rec.code if rec else None
    assert otp is not None
    assert len(otp) == 6

    # 2. Cannot send OTP to already registered email
    dup_res = client.post(
        "/api/auth/send-verification-otp",
        json={"email": "demo@example.local"},
    )
    assert dup_res.status_code == 409

    # 3. Wrong OTP verification should fail
    wrong_verify = client.post(
        "/api/auth/verify-registration",
        json={
            "name": "Andi Wijaya",
            "email": target_email,
            "password": "securepassword123",
            "phone_number": "081233445566",
            "code": "000000",
        },
    )
    assert wrong_verify.status_code == 400

    # 4. Correct OTP verification should succeed and create user
    ok_verify = client.post(
        "/api/auth/verify-registration",
        json={
            "name": "Andi Wijaya",
            "email": target_email,
            "password": "securepassword123",
            "phone_number": "081233445566",
            "code": otp,
        },
    )
    assert ok_verify.status_code == 201, ok_verify.text
    user_data = ok_verify.json()
    assert "access_token" in user_data
    assert user_data["user"]["email"] == target_email
    assert user_data["user"]["name"] == "Andi Wijaya"
    assert user_data["user"]["is_verified"] is True
    assert user_data["user"]["phone_number"] == "6281233445566"

    # 5. User can now login with normal password
    login_res = client.post(
        "/api/auth/login",
        json={"email": target_email, "password": "securepassword123"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == target_email


def test_auth_me_and_update_profile(client):
    # Login as demo user
    login_res = client.post(
        "/api/auth/login",
        json={"email": "demo@example.local", "password": "demo123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch profile
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "demo@example.local"

    # Update profile (change phone and notification lead minutes)
    update_res = client.put(
        "/api/auth/me",
        headers=headers,
        json={
            "phone_number": "08999888777",
            "notification_lead_minutes": 10,
            "wa_notifications_enabled": True,
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["phone_number"] == "628999888777"
    assert update_res.json()["notification_lead_minutes"] == 10

    # Unauthorized access without token
    anon_res = client.get("/api/auth/me")
    assert anon_res.status_code == 401


def test_admin_and_role_guards(client):
    # Admin login
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@naufal.me", "password": "Garena123"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # User login
    user_login = client.post(
        "/api/auth/login",
        json={"email": "demo@example.local", "password": "demo123"},
    )
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Admin accesses admin stats and users list
    stats_res = client.get("/api/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    assert stats_res.json()["total_users"] >= 2

    users_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    assert len(users_res.json()) >= 2

    # Admin creates a new user
    create_res = client.post(
        "/api/admin/users",
        headers=admin_headers,
        json={
            "name": "Budi Santoso",
            "email": "budi@smartroad.local",
            "password": "password123",
            "role": "user",
            "phone_number": "0812340001",
            "is_verified": True,
        },
    )
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Admin updates the user
    update_res = client.put(
        f"/api/admin/users/{created_id}",
        headers=admin_headers,
        json={"name": "Budi Santoso Edit", "wa_notifications_enabled": False},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Budi Santoso Edit"
    assert update_res.json()["wa_notifications_enabled"] is False

    # Admin deletes the user
    del_res = client.delete(f"/api/admin/users/{created_id}", headers=admin_headers)
    assert del_res.status_code == 200

    # Regular user attempting admin endpoints -> 403 Forbidden
    forbidden_res = client.get("/api/admin/users", headers=user_headers)
    assert forbidden_res.status_code == 403

    # Guest attempting admin endpoints -> 401 Unauthorized
    anon_res = client.get("/api/admin/users")
    assert anon_res.status_code == 401


def test_whatsapp_notification_endpoints(client):
    # Notification config
    cfg_res = client.get("/api/notifications/config")
    assert cfg_res.status_code == 200
    assert cfg_res.json()["default_lead_minutes"] == 5

    # Test WA simulation for route 1
    test_res = client.post("/api/notifications/test-whatsapp/1")
    assert test_res.status_code == 200, test_res.text
    data = test_res.json()
    assert data["delivery_channel"] == "whatsapp"
    assert "NOTIFIKASI RUTE PERJALANAN" in data["message"]
    assert "Kondisi Koridor:" in data["message"]

    # Upcoming briefings endpoint
    upcoming_res = client.get("/api/notifications/upcoming-briefings?force_all=true")
    assert upcoming_res.status_code == 200
    items = upcoming_res.json()
    assert len(items) >= 1
    assert items[0]["notification_lead_minutes"] >= 1
    assert items[0]["phone_number"] is not None
    assert "NOTIFIKASI" in items[0]["message"]


def test_guest_monitoring_unrestricted(client):
    # Guests (no login) must be able to view and monitor all traffic data
    cctv_res = client.get("/api/cameras")
    assert cctv_res.status_code == 200

    traffic_res = client.get("/api/traffic/current")
    assert traffic_res.status_code == 200

    potholes_res = client.get("/api/potholes")
    assert potholes_res.status_code == 200

    routes_res = client.get("/api/routes")
    assert routes_res.status_code == 200
