import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Setup python path to import backend app
ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.db.geometry import database_geometry, point_wkt  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models import Camera, TrafficSnapshot  # noqa: E402
from app.traffic.analytics import classify_traffic  # noqa: E402

REAL_CAMERAS = [
    {
        "id": 1,
        "name": "CCTV SP Charitas (Palembang)",
        "road_name": "Jl. Jenderal Sudirman",
        "latitude": -2.976768,
        "longitude": 104.754340,
        "stream_url": "https://stream.palembang.go.id/cam8/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (25, 50, 80),
        "counting_line": [[0.20, 0.60], [0.80, 0.60]],
    },
    {
        "id": 2,
        "name": "CCTV Simpang Polda (Palembang)",
        "road_name": "Jl. Demang Lebar Daun",
        "latitude": -2.961082,
        "longitude": 104.737709,
        "stream_url": "https://stream.palembang.go.id/cam3/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (20, 45, 75),
        "counting_line": [[0.20, 0.55], [0.85, 0.55]],
    },
    {
        "id": 3,
        "name": "CCTV Benteng Kuto Besak (Palembang)",
        "road_name": "Jl. Merdeka / BKB",
        "latitude": -2.991300,
        "longitude": 104.761266,
        "stream_url": "https://stream.palembang.go.id/cam2/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (18, 38, 65),
        "counting_line": [[0.10, 0.55], [0.90, 0.55]],
    },
    {
        "id": 4,
        "name": "CCTV Masjid Agung (Palembang)",
        "road_name": "Jl. Jenderal Sudirman",
        "latitude": -2.988190,
        "longitude": 104.760447,
        "stream_url": "https://stream.palembang.go.id/cam9/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (22, 45, 70),
        "counting_line": [[0.48, 0.38], [0.55, 0.72]],
    },
    {
        "id": 5,
        "name": "CCTV SP BANDARA (Palembang)",
        "road_name": "Jl. Bandara SMB II",
        "latitude": -2.903870,
        "longitude": 104.727468,
        "stream_url": "https://stream.palembang.go.id/cam45/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (15, 35, 60),
        "counting_line": [[0.15, 0.60], [0.85, 0.60]],
    },
    {
        "id": 6,
        "name": "CCTV SP BOM BARU (Palembang)",
        "road_name": "Jl. RE Martadinata",
        "latitude": -2.977623,
        "longitude": 104.778817,
        "stream_url": "https://stream.palembang.go.id/cam42/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (18, 40, 68),
        "counting_line": [[0.20, 0.65], [0.85, 0.65]],
    },
    {
        "id": 7,
        "name": "CCTV SP Soekarno Hatta (Palembang)",
        "road_name": "Jl. Soekarno Hatta",
        "latitude": -2.936266,
        "longitude": 104.702125,
        "stream_url": "https://stream.palembang.go.id/cam48/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (20, 48, 75),
        "counting_line": [[0.15, 0.60], [0.80, 0.60]],
    },
    {
        "id": 8,
        "name": "CCTV Punti Kayu (Palembang)",
        "road_name": "Jl. Kolonel H. Burlian",
        "latitude": -2.942646,
        "longitude": 104.728219,
        "stream_url": "https://stream.palembang.go.id/cam14/index.m3u8",
        "stream_type": "hls",
        "is_demo": False,
        "thresholds": (20, 42, 70),
        "counting_line": [[0.05, 0.55], [0.95, 0.55]],
    },
]


def sync():
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    with SessionLocal() as db:
        for item in REAL_CAMERAS:
            cam_id = item["id"]
            cam = db.get(Camera, cam_id)
            low, med, high = item["thresholds"]
            if cam:
                cam.name = item["name"]
                cam.road_name = item["road_name"]
                cam.latitude = item["latitude"]
                cam.longitude = item["longitude"]
                cam.location = database_geometry(db, point_wkt(item["latitude"], item["longitude"]))
                cam.stream_url = item["stream_url"]
                cam.stream_type = item["stream_type"]
                cam.is_demo = item["is_demo"]
                cam.low_threshold = low
                cam.medium_threshold = med
                cam.high_threshold = high
                cam.counting_line = item["counting_line"]
            else:
                cam = Camera(
                    id=cam_id,
                    name=item["name"],
                    road_name=item["road_name"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    location=database_geometry(db, point_wkt(item["latitude"], item["longitude"])),
                    stream_url=item["stream_url"],
                    stream_type=item["stream_type"],
                    is_active=True,
                    is_demo=item["is_demo"],
                    low_threshold=low,
                    medium_threshold=med,
                    high_threshold=high,
                    counting_line=item["counting_line"],
                )
                db.add(cam)
            db.flush()

            # Seed 20 minutes of realistic initial snapshots if none exist or refresh them
            for minute in range(20, -1, -1):
                total = 8 + ((20 - minute) * (cam_id + 1)) % 19 + cam_id * 3
                classified = classify_traffic(total * 5, cam.low_threshold, cam.medium_threshold, cam.high_threshold)
                db.add(
                    TrafficSnapshot(
                        camera_id=cam.id,
                        timestamp=now - timedelta(minutes=minute),
                        motorcycle_count=round(total * 0.52),
                        car_count=round(total * 0.35),
                        bus_count=round(total * 0.04),
                        truck_count=total - round(total * 0.52) - round(total * 0.35) - round(total * 0.04),
                        total_count=total,
                        congestion_score=classified.score,
                        traffic_status=classified.status,
                    )
                )
        db.commit()
    print("[SYNC] Palembang Real CCTV Feeds synced successfully!")

if __name__ == "__main__":
    sync()
