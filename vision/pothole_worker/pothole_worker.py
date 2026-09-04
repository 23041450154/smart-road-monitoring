import argparse
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

from app.db.geometry import database_geometry, point_wkt
from app.db.session import SessionLocal
from app.models import Pothole, PotholeStatus, Severity
from app.pothole.deduplication import find_duplicate
from vision.pothole_worker.detection import (
    ExplicitDemoPotholeDetector,
    YoloPotholeDetector,
)
from vision.pothole_worker.deduplication import TemporalDuplicateSuppressor
from vision.pothole_worker.gps import interpolate_gps, load_gpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("pothole-worker")
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def resolve_pothole_model_path(configured_path: str | None = None) -> Path:
    value = configured_path or os.getenv(
        "POTHOLE_MODEL_PATH", "vision/models/pothole/best.pt"
    )
    path = Path(value).expanduser()
    return path if path.is_absolute() else PROJECT_ROOT / path


def frame_timestamp(start_time: datetime, frame_number: int, fps: float) -> datetime:
    if frame_number < 1 or fps <= 0:
        raise ValueError(
            "frame_number must be positive and fps must be greater than zero"
        )
    return start_time + timedelta(seconds=(frame_number - 1) / fps)


def run(video_path: str, gpx_path: str, severity: Severity, demo: bool) -> int:
    try:
        import cv2
    except ImportError as exc:
        raise SystemExit("Install backend/requirements-vision.txt") from exc
    points = load_gpx(gpx_path)
    model_path = resolve_pothole_model_path()
    if demo:
        detector = ExplicitDemoPotholeDetector()
        log.warning("[POTHOLE] DEMO detector enabled; detections are synthetic")
    elif model_path.is_file():
        detector = YoloPotholeDetector(
            str(model_path),
            float(os.getenv("POTHOLE_CONFIDENCE_THRESHOLD", "0.40")),
            os.getenv("YOLO_DEVICE", "cpu"),
        )
    else:
        raise SystemExit(
            f"Trained pothole model not found at {model_path}; train/promote a model or explicitly enable --demo"
        )
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise SystemExit(f"Unable to open manual road video: {video_path}")
    fps = capture.get(cv2.CAP_PROP_FPS) or 30
    start_time = points[0].timestamp
    evidence_dir = Path(os.getenv("POTHOLE_EVIDENCE_DIR", "vision/evidence"))
    evidence_dir.mkdir(parents=True, exist_ok=True)
    duplicate_radius = float(os.getenv("POTHOLE_DUPLICATE_RADIUS_METERS", "10"))
    temporal_suppressor = TemporalDuplicateSuppressor(
        window_seconds=float(os.getenv("POTHOLE_TEMPORAL_WINDOW_SECONDS", "2.0")),
        iou_threshold=float(os.getenv("POTHOLE_TEMPORAL_IOU_THRESHOLD", "0.2")),
        center_distance_threshold=float(
            os.getenv("POTHOLE_TEMPORAL_CENTER_THRESHOLD", "0.12")
        ),
    )
    frame_number = saved = 0
    with SessionLocal() as db:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            frame_number += 1
            for detection in detector.detect(frame, frame_number, fps):
                elapsed_seconds = (frame_number - 1) / fps
                if temporal_suppressor.is_duplicate_or_record(
                    detection.bounding_box,
                    elapsed_seconds,
                    frame.shape[1],
                    frame.shape[0],
                ):
                    continue
                timestamp = frame_timestamp(start_time, frame_number, fps)
                gps = interpolate_gps(points, timestamp)
                if find_duplicate(db, gps.latitude, gps.longitude, duplicate_radius):
                    continue
                evidence_path = (
                    evidence_dir
                    / f"pothole-{timestamp.strftime('%Y%m%dT%H%M%S%f')}.jpg"
                )
                left, top, right, bottom = map(int, detection.bounding_box)
                cv2.imwrite(
                    str(evidence_path),
                    frame[max(0, top) : bottom, max(0, left) : right],
                )
                db.add(
                    Pothole(
                        latitude=gps.latitude,
                        longitude=gps.longitude,
                        location=database_geometry(
                            db, point_wkt(gps.latitude, gps.longitude)
                        ),
                        confidence=detection.confidence,
                        severity=severity,
                        image_path=str(evidence_path),
                        detected_at=timestamp,
                        status=PotholeStatus.UNVERIFIED,
                    )
                )
                db.commit()
                saved += 1
                log.info(
                    "[POTHOLE] saved lat=%.6f lon=%.6f", gps.latitude, gps.longitude
                )
    capture.release()
    log.info(
        "[POTHOLE] processing_complete saved=%d at=%s",
        saved,
        datetime.now().isoformat(),
    )
    return saved


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Detect potholes in a manual road recording"
    )
    parser.add_argument("--video", required=True)
    parser.add_argument("--gps", required=True)
    parser.add_argument(
        "--severity", choices=[item.value for item in Severity], default="unknown"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Use clearly labelled synthetic demo detections",
    )
    arguments = parser.parse_args()
    run(arguments.video, arguments.gps, Severity(arguments.severity), arguments.demo)
