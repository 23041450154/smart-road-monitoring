import argparse
import logging
import os
import time
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Camera, TrafficSnapshot, VehicleEvent
from app.traffic.analytics import classify_traffic
from vision.shared.stream_sources import StreamError, create_stream
from vision.traffic_worker.tracking import (
    LineCrossingCounter,
    Track,
    YoloByteTrackProcessor,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("traffic-worker")


def save_window(
    db: Session, camera: Camera, counts: Counter[str], events: list[tuple[Track, str]]
) -> None:
    total = sum(counts.values())
    now = datetime.now(timezone.utc)
    previous_volume = int(
        db.scalar(
            select(func.coalesce(func.sum(TrafficSnapshot.total_count), 0)).where(
                TrafficSnapshot.camera_id == camera.id,
                TrafficSnapshot.timestamp >= now - timedelta(minutes=5),
            )
        )
        or 0
    )
    result = classify_traffic(
        previous_volume + total,
        camera.low_threshold,
        camera.medium_threshold,
        camera.high_threshold,
    )
    db.add(
        TrafficSnapshot(
            camera_id=camera.id,
            timestamp=now,
            motorcycle_count=counts["motorcycle"],
            car_count=counts["car"],
            bus_count=counts["bus"],
            truck_count=counts["truck"],
            total_count=total,
            congestion_score=result.score,
            traffic_status=result.status,
        )
    )
    for track, direction in events:
        db.add(
            VehicleEvent(
                camera_id=camera.id,
                tracker_id=track.tracker_id,
                vehicle_type=track.vehicle_type,
                direction=direction,
                first_seen=now,
                last_seen=now,
            )
        )
    db.commit()
    log.info(
        "[TRAFFIC] status=%s total=%d [DATABASE] snapshot_saved",
        result.status.value,
        total,
    )


def run(camera_id: int, show: bool = False) -> None:
    with SessionLocal() as db:
        camera = db.get(Camera, camera_id)
        if camera is None:
            raise SystemExit(f"Camera {camera_id} not found")
        source_type = os.getenv("CAMERA_SOURCE", camera.stream_type)
        source_url = os.getenv("CAMERA_STREAM_URL", camera.stream_url or "")
        processor = YoloByteTrackProcessor(
            os.getenv("YOLO_MODEL", "yolo11n.pt"),
            float(os.getenv("YOLO_CONFIDENCE", "0.35")),
            os.getenv("YOLO_DEVICE", "cpu"),
        )
        counter = LineCrossingCounter(
            camera.counting_line or [[0.1, 0.55], [0.9, 0.55]]
        )
        window_seconds = int(os.getenv("TRAFFIC_SNAPSHOT_SECONDS", "60"))
        backoff = max(1, int(os.getenv("CAMERA_RECONNECT_SECONDS", "2")))
        counts: Counter[str] = Counter()
        events: list[tuple[Track, str]] = []
        window_started = time.monotonic()
        while True:
            source = create_stream(source_type, source_url)
            try:
                source.open()
                backoff = max(1, int(os.getenv("CAMERA_RECONNECT_SECONDS", "2")))
                log.info("[CAMERA] started camera=%s", camera.name)
                while True:
                    ok, frame = source.read()
                    if not ok:
                        raise StreamError("Stream ended or disconnected")
                    height, width = frame.shape[:2]
                    tracks = processor.process(frame)
                    for track in tracks:
                        direction = counter.update(track, width, height)
                        if direction:
                            counts[track.vehicle_type] += 1
                            events.append((track, direction))
                    log.debug("[TRACKER] active_tracks=%d", len(tracks))
                    if time.monotonic() - window_started >= window_seconds:
                        save_window(db, camera, counts, events)
                        counts, events, window_started = Counter(), [], time.monotonic()
                    if show:
                        _draw(frame, tracks)
            except StreamError as exc:
                log.warning("[CAMERA] %s; reconnecting in %ds", exc, backoff)
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
            finally:
                source.close()


def _draw(frame, tracks: list[Track]) -> None:
    import cv2

    for track in tracks:
        left, top, right, bottom = map(int, track.bounding_box)
        cv2.rectangle(frame, (left, top), (right, bottom), (48, 209, 88), 2)
        cv2.putText(
            frame,
            f"{track.vehicle_type.upper()} #{track.tracker_id.split('_')[-1]}",
            (left, max(20, top - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (48, 209, 88),
            2,
        )
    cv2.imshow("Smart Road Monitoring - press q to close", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        raise KeyboardInterrupt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run authorized/local traffic video analytics"
    )
    parser.add_argument("--camera-id", type=int, default=1)
    parser.add_argument("--show", action="store_true")
    args = parser.parse_args()
    run(args.camera_id, args.show)
