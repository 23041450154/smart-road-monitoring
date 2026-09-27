"""
Round-Robin Traffic Worker for Smart Road Monitoring.
Continuously rotates through all active CCTV cameras in sequence.
Monitors each camera for a configured duration (e.g. 120 seconds),
counts vehicle traffic with YOLO + ByteTrack, saves snapshots to DB,
and gracefully switches to the next camera with zero memory leaks.
"""

import argparse
import gc
import logging
import os
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

# Add backend and project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "backend"))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Throttling CPU cores for VPS stability (1 core per worker when running 4 workers)
os.environ["OMP_NUM_THREADS"] = os.getenv("OMP_NUM_THREADS", "1")
os.environ["OPENVINO_NUM_THREADS"] = os.getenv("OPENVINO_NUM_THREADS", "1")
os.environ["MKL_NUM_THREADS"] = os.getenv("MKL_NUM_THREADS", "1")
os.environ["CPU_THREADS_NUM"] = os.getenv("CPU_THREADS_NUM", "1")
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "timeout;5000000"

try:
    import torch
    torch.set_num_threads(1)
except Exception:
    pass

import cv2
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Camera, TrafficSnapshot, VehicleEvent
from app.traffic.analytics import classify_traffic
from vision.traffic_worker.tracking import (
    CAMERA_EXCLUSION_ZONES,
    LineCrossingCounter,
    Track,
    YoloByteTrackProcessor,
)

WORKER_TAG = os.getenv("WORKER_TAG", "RR-WORKER")
logging.basicConfig(
    level=logging.INFO,
    format=f"%(asctime)s [%(levelname)s] [{WORKER_TAG}] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(WORKER_TAG)


def save_camera_window(
    db: Session,
    camera: Camera,
    counts: Counter[str],
    events: list[tuple[Track, str]],
    sample_duration_seconds: float,
) -> None:
    """Saves aggregated vehicle snapshot and vehicle events to database."""
    total = sum(counts.values())
    now = datetime.now(timezone.utc)

    # Scale volume to 5-minute standard baseline if sample duration is different
    scale_factor = (300.0 / sample_duration_seconds) if sample_duration_seconds > 0 else 1.0
    effective_5min_volume = int(total * scale_factor)

    result = classify_traffic(
        effective_5min_volume,
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
        "Kamera #%d (%s) -> Total: %d kend (Motor: %d, Mobil: %d, Bus: %d, Truk: %d) | Status: %s (Skor: %.1f) | TERSIMPAN",
        camera.id,
        camera.name,
        total,
        counts["motorcycle"],
        counts["car"],
        counts["bus"],
        counts["truck"],
        result.status.value,
        result.score,
    )


def sample_camera(
    camera_id: int,
    duration_seconds: int = 120,
    model_path: str = "yolo11n.pt",
    confidence: float = 0.08,
) -> None:
    """Samples a single camera for duration_seconds, then cleanly disconnects."""
    with SessionLocal() as db:
        camera = db.get(Camera, camera_id)
        if not camera or not camera.is_active:
            log.warning("Kamera #%d tidak aktif atau tidak ditemukan. Lewati.", camera_id)
            return

        source = (
            camera.stream_url
            if (camera.stream_type == "hls" and camera.stream_url)
            else str(PROJECT_ROOT / "vision/samples/traffic.mp4")
        )
        exclusion_zones = CAMERA_EXCLUSION_ZONES.get(camera_id, [])

        log.info(
            "=== MEMANTAU KAMERA #%d: %s (%s) selama %ds ===",
            camera.id,
            camera.name,
            camera.road_name,
            duration_seconds,
        )

        processor = YoloByteTrackProcessor(
            model_path=model_path,
            confidence=confidence,
            device="cpu",
            exclusion_zones=exclusion_zones,
        )
        counter = LineCrossingCounter(camera.counting_line or [[0.1, 0.55], [0.9, 0.55]])

        cap = None
        counts: Counter[str] = Counter()
        events: list[tuple[Track, str]] = []

        try:
            cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                log.warning(
                    "Gagal membuka stream untuk kamera #%d (%s). Coba fallback sampel...",
                    camera.id,
                    source,
                )
                sample_file = PROJECT_ROOT / "vision/samples/traffic.mp4"
                if sample_file.exists():
                    cap = cv2.VideoCapture(str(sample_file))
                if not cap or not cap.isOpened():
                    log.error(
                        "Tidak dapat membuka stream untuk kamera #%d. Lanjut ke kamera berikutnya.",
                        camera.id,
                    )
                    return

            start_time = time.monotonic()
            last_inference_time = 0.0
            inference_interval = float(os.getenv("YOLO_INFERENCE_INTERVAL", "0.150"))  # ~6-7 inferences/sec
            target_pacing = float(os.getenv("VIDEO_PACING_INTERVAL", "0.100"))          # ~10 FPS video pacing

            while time.monotonic() - start_time < duration_seconds:
                loop_start = time.monotonic()
                ok, frame = cap.read()
                if not ok or frame is None:
                    time.sleep(0.08)
                    continue

                now = time.monotonic()
                if now - last_inference_time >= inference_interval:
                    last_inference_time = now
                    h, w = frame.shape[:2]
                    target_w = 640
                    target_h = int(h * target_w / w)
                    if (w, h) != (target_w, target_h):
                        frame_small = cv2.resize(frame, (target_w, target_h))
                    else:
                        frame_small = frame

                    try:
                        tracks = processor.process(frame_small)
                        for track in tracks:
                            direction = counter.update(track, target_w, target_h)
                            if direction:
                                counts[track.vehicle_type] += 1
                                events.append((track, direction))
                    except Exception as err:
                        log.debug("Inference error: %s", err)

                elapsed = time.monotonic() - loop_start
                # Ensure at least 35ms sleep per frame to guarantee CPU cores stay cool
                sleep_rem = max(0.035, target_pacing - elapsed)
                time.sleep(sleep_rem)

            # Sampling window finished, save to database
            elapsed_total = time.monotonic() - start_time
            save_camera_window(db, camera, counts, events, elapsed_total)

        except Exception as exc:
            log.error("Error saat memproses kamera #%d: %s", camera.id, exc)
        finally:
            if cap is not None:
                try:
                    cap.release()
                except Exception:
                    pass
            # Force garbage collection between camera switches to keep VPS RAM pristine
            del counts
            del events
            del processor
            del counter
            gc.collect()


def run_round_robin(duration_seconds: int = 120, camera_ids: list[int] | None = None) -> None:
    """Main loop: endlessly iterates through all cameras in round-robin fashion."""
    log.info(
        "Memulai Round-Robin Traffic Worker (Durasi per kamera: %ds)...",
        duration_seconds,
    )

    while True:
        try:
            with SessionLocal() as db:
                if camera_ids:
                    cameras = list(
                        db.scalars(
                            select(Camera)
                            .where(Camera.id.in_(camera_ids), Camera.is_active.is_(True))
                            .order_by(Camera.id)
                        )
                    )
                else:
                    cameras = list(
                        db.scalars(
                            select(Camera).where(Camera.is_active.is_(True)).order_by(Camera.id)
                        )
                    )

            if not cameras:
                log.warning("Tidak ada kamera aktif di database. Menunggu 10 detik...")
                time.sleep(10)
                continue

            log.info("Siklus baru Round-Robin: Memantau %d kamera secara bergantian.", len(cameras))
            for cam in cameras:
                sample_camera(cam.id, duration_seconds=duration_seconds)
                time.sleep(2.0)

        except KeyboardInterrupt:
            log.info("Round-Robin Worker dihentikan oleh user (KeyboardInterrupt).")
            break
        except Exception as e:
            log.error(
                "Unhandled error di loop Round-Robin: %s. Melanjutkan dalam 5 detik...",
                e,
            )
            time.sleep(5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run autonomous Round-Robin Traffic Monitoring Daemon"
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=int(os.getenv("ROUND_ROBIN_DURATION_SECONDS", "120")),
        help="Durasi pemantauan per kamera dalam detik (default: 120s / 2 menit)",
    )
    parser.add_argument(
        "--cameras",
        type=int,
        nargs="+",
        default=None,
        help="Daftar ID kamera tertentu (misal: --cameras 1 2 4 5). Default: semua kamera aktif",
    )
    args = parser.parse_args()
    run_round_robin(duration_seconds=args.duration, camera_ids=args.cameras)
