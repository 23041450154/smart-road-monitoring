import json
import ssl
import urllib.request
from datetime import UTC, datetime, timedelta

from app.db.geometry import database_geometry, point_wkt
from app.db.session import SessionLocal
from app.models import Camera, TrafficSnapshot
from app.traffic.analytics import classify_traffic

CUSTOM_CONFIGS = {
    "https://stream.palembang.go.id/cam8/index.m3u8": {
        "name": "CCTV SP Charitas (Palembang)",
        "road_name": "Jl. Jenderal Sudirman",
        "thresholds": (25, 50, 80),
        "counting_line": [[0.20, 0.60], [0.80, 0.60]],
    },
    "https://stream.palembang.go.id/cam3/index.m3u8": {
        "name": "CCTV Simpang Polda (Palembang)",
        "road_name": "Jl. Demang Lebar Daun",
        "thresholds": (20, 45, 75),
        "counting_line": [[0.20, 0.55], [0.85, 0.55]],
    },
    "https://stream.palembang.go.id/cam2/index.m3u8": {
        "name": "CCTV Benteng Kuto Besak (Palembang)",
        "road_name": "Jl. Merdeka / BKB",
        "thresholds": (18, 38, 65),
        "counting_line": [[0.10, 0.55], [0.90, 0.55]],
    },
    "https://stream.palembang.go.id/cam9/index.m3u8": {
        "name": "CCTV Masjid Agung (Palembang)",
        "road_name": "Jl. Jenderal Sudirman",
        "thresholds": (22, 45, 70),
        "counting_line": [[0.40, 0.67], [0.72, 0.76]],
    },
    "https://stream.palembang.go.id/cam5/index.m3u8": {
        "name": "CCTV Simpang Angkatan 45 (Palembang)",
        "road_name": "Jl. Angkatan 45 / POM IX",
        "thresholds": (20, 45, 75),
        "counting_line": [[0.15, 0.65], [0.85, 0.65]],
    },
    "https://stream.palembang.go.id/cam21/index.m3u8": {
        "name": "CCTV SP Samsat (Palembang)",
        "road_name": "Jl. POM IX / Angkatan 45",
        "thresholds": (20, 45, 75),
        "counting_line": [[0.20, 0.60], [0.80, 0.60]],
    },
    "https://stream.palembang.go.id/cam13/index.m3u8": {
        "name": "CCTV KM 12 (Palembang)",
        "road_name": "Jl. Kolonel H. Burlian KM 12",
        "thresholds": (20, 45, 75),
        "counting_line": [[0.15, 0.60], [0.85, 0.60]],
    },
    "https://stream.palembang.go.id/cam14/index.m3u8": {
        "name": "CCTV Punti Kayu (Palembang)",
        "road_name": "Jl. Kolonel H. Burlian",
        "thresholds": (20, 42, 70),
        "counting_line": [[0.05, 0.55], [0.95, 0.55]],
    },
}


def sync_all():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        "https://cctv.palembang.go.id/api/cctv", headers={"User-Agent": "SmartRoadMonitoring/1.0"}
    )
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    cctv_list = payload.get("data", [])
    print(f"[SYNC] Fetched {len(cctv_list)} CCTV cameras from Diskominfo Palembang API")

    now = datetime.now(UTC).replace(second=0, microsecond=0)

    with SessionLocal() as db:
        # Delete demo cameras if they start with DEMO
        demo_cams = db.query(Camera).filter(Camera.name.like("DEMO %")).all()
        for dc in demo_cams:
            db.delete(dc)
        db.commit()

        synced_count = 0
        for item in cctv_list:
            stream_url = item.get("cctv_link")
            if not stream_url:
                continue

            title = item.get("cctv_title", "CCTV Palembang")
            coords = item.get("location", {}).get("coordinates", [104.75, -2.98])
            lon = float(coords[0])
            lat = float(coords[1])

            custom = CUSTOM_CONFIGS.get(stream_url, {})
            name = custom.get("name", title)
            road_name = custom.get(
                "road_name", title.replace("CCTV ", "").replace("SP ", "Simpang ")
            )
            low, med, high = custom.get("thresholds", (20, 45, 75))
            counting_line = custom.get("counting_line", [[0.20, 0.60], [0.80, 0.60]])

            # Check if camera with same stream_url or name exists
            cam = (
                db.query(Camera)
                .filter((Camera.stream_url == stream_url) | (Camera.name == name))
                .first()
            )
            if cam:
                cam.name = name
                cam.road_name = road_name
                cam.latitude = lat
                cam.longitude = lon
                cam.location = database_geometry(db, point_wkt(lat, lon))
                cam.stream_url = stream_url
                cam.stream_type = "hls"
                cam.is_demo = False
                cam.is_active = True
                cam.low_threshold = low
                cam.medium_threshold = med
                cam.high_threshold = high
                cam.counting_line = counting_line
            else:
                cam = Camera(
                    name=name,
                    road_name=road_name,
                    latitude=lat,
                    longitude=lon,
                    location=database_geometry(db, point_wkt(lat, lon)),
                    stream_url=stream_url,
                    stream_type="hls",
                    is_demo=False,
                    is_active=True,
                    low_threshold=low,
                    medium_threshold=med,
                    high_threshold=high,
                    counting_line=counting_line,
                )
                db.add(cam)

            db.flush()
            synced_count += 1

            # Check if camera has snapshots; if not, seed realistic traffic history
            snap_count = (
                db.query(TrafficSnapshot).filter(TrafficSnapshot.camera_id == cam.id).count()
            )
            if snap_count < 10:
                for minute in range(20, -1, -1):
                    total = 8 + ((20 - minute) * (cam.id + 1)) % 19 + (cam.id % 5) * 3
                    classified = classify_traffic(
                        total * 5, cam.low_threshold, cam.medium_threshold, cam.high_threshold
                    )
                    db.add(
                        TrafficSnapshot(
                            camera_id=cam.id,
                            timestamp=now - timedelta(minutes=minute),
                            motorcycle_count=round(total * 0.52),
                            car_count=round(total * 0.35),
                            bus_count=round(total * 0.04),
                            truck_count=max(
                                0,
                                total
                                - round(total * 0.52)
                                - round(total * 0.35)
                                - round(total * 0.04),
                            ),
                            total_count=total,
                            congestion_score=classified.score,
                            traffic_status=classified.status,
                        )
                    )

        db.commit()
        print(f"[SYNC] Successfully synced {synced_count} real CCTV cameras into the database!")


if __name__ == "__main__":
    sync_all()
