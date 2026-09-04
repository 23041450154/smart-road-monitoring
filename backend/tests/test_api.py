def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_traffic_api(client):
    response = client.get("/api/traffic/current")
    assert response.status_code == 200
    assert len(response.json()) >= 3
    assert response.json()[0]["traffic_status"] in {"LANCAR", "SEDANG", "PADAT", "MACET"}


def test_create_camera_location(client):
    response = client.post(
        "/api/cameras",
        json={
            "name": "DEMO Camera API Test",
            "road_name": "Jl. Test",
            "latitude": -2.98,
            "longitude": 104.76,
            "stream_type": "local",
            "is_demo": True,
            "low_threshold": 10,
            "medium_threshold": 20,
            "high_threshold": 30,
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["latitude"] == -2.98


def test_create_and_get_route(client):
    payload = {
        "user_id": 1,
        "name": "Rute API Test",
        "route_type": "custom",
        "start_latitude": -2.976,
        "start_longitude": 104.74,
        "destination_latitude": -2.98,
        "destination_longitude": 104.75,
        "path": [[-2.976, 104.74], [-2.98, 104.75]],
        "notification_time": "07:00:00",
        "is_active": True,
    }
    created = client.post("/api/routes", json=payload)
    assert created.status_code == 201, created.text
    fetched = client.get(f"/api/routes/{created.json()['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["path"] == payload["path"]


def test_briefing_endpoint(client):
    response = client.get("/api/routes/1/briefing")
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["route_name"] == "Rute Berangkat Demo"
    assert payload["overall_status"] in {"LANCAR", "SEDANG", "PADAT", "MACET"}
    assert "Hati-hati" in payload["message"]


def test_pothole_api_deduplicates(client):
    payload = {
        "latitude": -2.9753,
        "longitude": 104.7421,
        "confidence": 0.99,
        "severity": "high",
        "status": "unverified",
    }
    first = client.post("/api/potholes", json=payload)
    second = client.post("/api/potholes", json=payload)
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_pothole_api_defaults_severity_to_unknown(client):
    response = client.post(
        "/api/potholes?deduplicate=false",
        json={
            "latitude": -2.901,
            "longitude": 104.701,
            "confidence": 0.71,
            "image_path": "vision/evidence/measured-detection.jpg",
            "status": "unverified",
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["severity"] == "unknown"
