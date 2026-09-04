from datetime import UTC, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.geometry import database_geometry, line_wkt, point_wkt
from app.models import (
    Camera,
    Pothole,
    PotholeStatus,
    Route,
    RouteType,
    Severity,
    TrafficSnapshot,
    User,
)
from app.traffic.analytics import classify_traffic

DEMO_CAMERAS = [
    {
        "name": "DEMO Simpang Charitas",
        "road_name": "Jl. Jenderal Sudirman",
        "latitude": -2.9763,
        "longitude": 104.7501,
        "thresholds": (22, 48, 78),
    },
    {
        "name": "DEMO Simpang Polda",
        "road_name": "Jl. Demang Lebar Daun",
        "latitude": -2.9742,
        "longitude": 104.7354,
        "thresholds": (18, 40, 68),
    },
    {
        "name": "DEMO Bundaran Air Mancur",
        "road_name": "Jl. Merdeka",
        "latitude": -2.9902,
        "longitude": 104.7565,
        "thresholds": (15, 34, 58),
    },
]


def seed_demo(db: Session) -> None:
    if (db.scalar(select(func.count(Camera.id))) or 0) > 0:
        return
    user = User(name="Pengguna Demo", email="demo@example.local")
    db.add(user)
    db.flush()
    cameras: list[Camera] = []
    for item in DEMO_CAMERAS:
        low, medium, high = item["thresholds"]
        camera = Camera(
            name=item["name"],
            road_name=item["road_name"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            location=database_geometry(db, point_wkt(item["latitude"], item["longitude"])),
            stream_url="vision/samples/traffic.mp4",
            stream_type="local",
            is_demo=True,
            low_threshold=low,
            medium_threshold=medium,
            high_threshold=high,
            counting_line=[[0.1, 0.55], [0.9, 0.55]],
        )
        db.add(camera)
        cameras.append(camera)
    db.flush()
    now = datetime.now(UTC).replace(second=0, microsecond=0)
    for camera_index, camera in enumerate(cameras):
        for minute in range(20, -1, -1):
            total = 5 + ((20 - minute) * (camera_index + 2)) % 17 + camera_index * 2
            classified = classify_traffic(
                total * 5, camera.low_threshold, camera.medium_threshold, camera.high_threshold
            )
            db.add(
                TrafficSnapshot(
                    camera_id=camera.id,
                    timestamp=now - timedelta(minutes=minute),
                    motorcycle_count=round(total * 0.48),
                    car_count=round(total * 0.36),
                    bus_count=round(total * 0.05),
                    truck_count=total
                    - round(total * 0.48)
                    - round(total * 0.36)
                    - round(total * 0.05),
                    total_count=total,
                    congestion_score=classified.score,
                    traffic_status=classified.status,
                )
            )
    demo_path = [[-2.9715, 104.732], [-2.9742, 104.7354], [-2.9763, 104.7501], [-2.984, 104.756]]
    db.add(
        Route(
            user_id=user.id,
            name="Rute Berangkat Demo",
            route_type=RouteType.COMMUTE_TO_WORK,
            start_latitude=demo_path[0][0],
            start_longitude=demo_path[0][1],
            destination_latitude=demo_path[-1][0],
            destination_longitude=demo_path[-1][1],
            path=demo_path,
            geometry=database_geometry(db, line_wkt(demo_path)),
            notification_time=time(6, 45),
        )
    )
    for latitude, longitude, road, confidence, severity in [
        (-2.9753, 104.7421, "Jl. Jenderal Sudirman", 0.86, Severity.MEDIUM),
        (-2.9897, 104.7559, "Jl. Merdeka", 0.78, Severity.LOW),
    ]:
        db.add(
            Pothole(
                latitude=latitude,
                longitude=longitude,
                location=database_geometry(db, point_wkt(latitude, longitude)),
                road_name=road,
                confidence=confidence,
                severity=severity,
                status=PotholeStatus.UNVERIFIED,
            )
        )
    db.commit()
