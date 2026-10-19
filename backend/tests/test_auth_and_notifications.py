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
        json={"email": "admin@smartroad.local", "password": "admin123"},
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
