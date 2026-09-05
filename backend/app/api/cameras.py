import asyncio
import math
import os
import sys
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
import shutil
import subprocess
import numpy as np

# Limit CPU threads for deep learning to keep 2 cores free for HLS decoding & streaming
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["OPENVINO_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "timeout;5000000"
try:
    import torch

    torch.set_num_threads(2)
except Exception:
    pass

import cv2
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from vision.traffic_worker.tracking import (  # noqa: E402
    CAMERA_EXCLUSION_ZONES,
    LineCrossingCounter,
    Track,
    YoloByteTrackProcessor,
)
from vision.traffic_worker.worker import save_window  # noqa: E402

from app.db.geometry import database_geometry, point_wkt  # noqa: E402
from app.db.session import SessionLocal, get_db  # noqa: E402
from app.models import Camera, TrafficSnapshot, VehicleEvent  # noqa: E402
from app.schemas.api import CameraCreate, CameraRead, SnapshotRead, TrafficCurrent  # noqa: E402
from app.traffic.analytics import camera_metrics  # noqa: E402

router = APIRouter(prefix="/cameras", tags=["cameras"])


def get_camera_or_404(db: Session, camera_id: int) -> Camera:
    camera = db.get(Camera, camera_id)
    if camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.post("", response_model=CameraRead, status_code=201)
def create_camera(payload: CameraCreate, db: Session = Depends(get_db)) -> Camera:
    camera = Camera(
        **payload.model_dump(),
        location=database_geometry(db, point_wkt(payload.latitude, payload.longitude)),
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


@router.get("", response_model=list[CameraRead])
def list_cameras(db: Session = Depends(get_db)) -> list[Camera]:
    return list(db.scalars(select(Camera).order_by(Camera.name)))


@router.get("/{camera_id}", response_model=CameraRead)
def get_camera(camera_id: int, db: Session = Depends(get_db)) -> Camera:
    return get_camera_or_404(db, camera_id)


@router.get("/{camera_id}/traffic/current", response_model=TrafficCurrent)
def get_current_traffic(camera_id: int, db: Session = Depends(get_db)) -> TrafficCurrent:
    return camera_metrics(db, get_camera_or_404(db, camera_id))


@router.get("/{camera_id}/traffic/history", response_model=list[SnapshotRead])
def get_traffic_history(
    camera_id: int,
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
) -> list[TrafficSnapshot]:
    camera = get_camera_or_404(db, camera_id)
    since = datetime.now(UTC) - timedelta(hours=hours)
    history = list(
        db.scalars(
            select(TrafficSnapshot)
            .where(TrafficSnapshot.camera_id == camera_id, TrafficSnapshot.timestamp >= since)
            .order_by(TrafficSnapshot.timestamp)
        )
    )
    if not history and camera.is_demo:
        history = list(
            db.scalars(
                select(TrafficSnapshot)
                .where(TrafficSnapshot.camera_id == camera_id)
                .order_by(TrafficSnapshot.timestamp.desc())
                .limit(60)
            )
        )
        history.reverse()
    return history


def _annotate_frame(
    frame,
    tracks: list[Track],
    counts: Counter[str],
) -> None:
    h, w = frame.shape[:2]

    # 1. Draw vehicle bounding boxes and labels
    colors = {
        "car": (48, 209, 88),         # Vibrant Green
        "motorcycle": (0, 140, 255),  # Vibrant Orange (BGR)
        "bus": (0, 215, 255),         # Yellow / Gold
        "truck": (245, 130, 48),      # Deep Sky Blue / Teal
    }
    for track in tracks:
        try:
            b = track.bounding_box
            if not b or len(b) < 4:
                continue
            left, top, right, bottom = [
                int(x) if math.isfinite(x) else 0 for x in b[:4]
            ]
            left = max(0, min(w - 1, left))
            top = max(0, min(h - 1, top))
            right = max(0, min(w - 1, right))
            bottom = max(0, min(h - 1, bottom))
            if right <= left or bottom <= top:
                continue
            color = colors.get(track.vehicle_type, (48, 209, 88))
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

            vehicle_label = {
                "car": "MOBIL",
                "motorcycle": "MOTOR",
                "bus": "BUS",
                "truck": "TRUK",
            }.get(track.vehicle_type, track.vehicle_type.upper())
            tag = f"{vehicle_label} #{track.tracker_id.replace('vehicle_', '')}"
            (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
            tag_y1 = top - th - 6 if top - th - 6 >= 0 else top
            tag_y2 = top if top - th - 6 >= 0 else top + th + 6
            text_y = max(th + 2, top - 4) if top - th - 6 >= 0 else top + th + 2
            cv2.rectangle(
                frame,
                (left, tag_y1),
                (left + tw + 8, tag_y2),
                color,
                -1,
            )
            cv2.putText(
                frame,
                tag,
                (left + 4, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.42,
                (16, 24, 20),
                1,
                cv2.LINE_AA,
            )
        except Exception:
            continue

    # 3. HUD footer bar
    total = sum(counts.values())
    hud = (
        f"YOLO TRACKING | Terhitung: {total} "
        f"(Motor: {counts['motorcycle']}, Mobil: {counts['car']}, "
        f"Bus: {counts['bus']}, Truk: {counts['truck']})"
    )
    cv2.rectangle(frame, (0, h - 24), (w, h), (12, 29, 26), -1)
    cv2.putText(
        frame,
        hud,
        (12, h - 7),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (201, 242, 96),
        1,
        cv2.LINE_AA,
    )


HAS_FFMPEG = bool(shutil.which("ffmpeg"))


class ThreadedCameraReader:
    """Bulletproof non-blocking background video capture reader for smooth live streaming.
    Uses an isolated FFmpeg subprocess for HLS streams (preventing OpenCV C++ segfaults)
    and falls back to cv2.VideoCapture when appropriate.
    """

    def __init__(self, source: str, is_live: bool = True, target_size: tuple[int, int] = (640, 360)) -> None:
        self.source = source
        self.is_live = is_live
        self.target_size = target_size
        self.frame = None
        self.frame_seq: int = 0
        self.running = True
        self.lock = threading.Lock()
        self._proc: subprocess.Popen | None = None
        self.thread = threading.Thread(
            target=self._reader_loop,
            daemon=True,
            name=f"Reader-{hash(source) % 10000}",
        )
        self.thread.start()

    def _reader_loop(self) -> None:
        use_ffmpeg = HAS_FFMPEG and (self.source.startswith("http://") or self.source.startswith("https://"))
        if use_ffmpeg:
            self._ffmpeg_loop()
        else:
            self._opencv_loop()

    @staticmethod
    def _read_exact(stream, n: int) -> bytes | None:
        buf = bytearray()
        while len(buf) < n:
            chunk = stream.read(n - len(buf))
            if not chunk:
                return None
            buf.extend(chunk)
        return bytes(buf)

    def _ffmpeg_loop(self) -> None:
        w, h = self.target_size
        frame_bytes = w * h * 3
        reconnect_delay = 1.0

        while self.running:
            cmd = [
                "ffmpeg",
                "-loglevel", "error",
                "-re",
                "-reconnect", "1",
                "-reconnect_streamed", "1",
                "-reconnect_delay_max", "2",
                "-i", self.source,
                "-vf", f"scale={w}:{h}",
                "-f", "rawvideo",
                "-pix_fmt", "bgr24",
                "-",
            ]
            try:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    bufsize=frame_bytes * 4,
                )
                self._proc = proc
            except Exception:
                time.sleep(reconnect_delay)
                continue

            try:
                while self.running and proc.poll() is None:
                    raw = self._read_exact(proc.stdout, frame_bytes)
                    if not raw:
                        break
                    f = np.frombuffer(raw, dtype=np.uint8).reshape((h, w, 3))
                    with self.lock:
                        self.frame = f
                        self.frame_seq += 1
            except Exception:
                pass
            finally:
                try:
                    if proc.stdout:
                        proc.stdout.close()
                except Exception:
                    pass
                try:
                    proc.terminate()
                    proc.wait(timeout=0.5)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                self._proc = None

            if self.running:
                time.sleep(reconnect_delay)

    def _opencv_loop(self) -> None:
        cap = None
        reconnect_delay = 0.5
        while self.running:
            if cap is None or not cap.isOpened():
                try:
                    cap = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
                    if not cap.isOpened():
                        time.sleep(reconnect_delay)
                        continue
                except Exception:
                    time.sleep(reconnect_delay)
                    continue

            try:
                ok, f = cap.read()
            except Exception:
                ok = False
                f = None

            if ok and f is not None and f.size > 0:
                with self.lock:
                    self.frame = f
                    self.frame_seq += 1
                if not self.is_live:
                    time.sleep(0.033)
                else:
                    time.sleep(0.012)
            else:
                if cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
                if self.is_live:
                    time.sleep(reconnect_delay)
                else:
                    time.sleep(0.01)

        if cap is not None:
            try:
                cap.release()
            except Exception:
                pass

    def read(self) -> tuple[np.ndarray | None, int]:
        with self.lock:
            if self.frame is not None:
                return self.frame.copy(), self.frame_seq
            return None, 0

    def stop(self) -> None:
        self.running = False
        if self._proc:
            try:
                self._proc.terminate()
            except Exception:
                pass
        if self.thread and self.thread.is_alive() and threading.current_thread() != self.thread:
            self.thread.join(timeout=0.6)


def _async_save_window(
    camera_id: int, counts: Counter[str], events: list[tuple[Track, str]]
) -> None:
    try:
        with SessionLocal() as db_session:
            cam = db_session.get(Camera, camera_id)
            if cam:
                save_window(db_session, cam, counts, events)
    except Exception as exc:
        logging.getLogger("traffic-worker").warning("Async save_window failed for cam %d: %s", camera_id, exc)


class CameraStreamWorker:
    """Singleton worker per camera to avoid duplicate YOLO inferences and HLS decoding."""

    def __init__(
        self,
        camera_id: int,
        camera_name: str,
        video_source: str,
        counting_line: list[list[float]],
        exclusion_zones: list[list[tuple[float, float]]],
    ) -> None:
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.video_source = video_source
        self.counting_line = counting_line
        self.exclusion_zones = exclusion_zones

        self._clients: int = 0
        self._last_client_seen: float = time.monotonic()
        self.running: bool = False
        self.thread: threading.Thread | None = None
        self.lock = threading.Lock()
        self.condition = threading.Condition()
        self.latest_jpeg: bytes | None = None
        self.frame_id: int = 0

    def add_client(self) -> None:
        with self.lock:
            self._clients += 1
            self._last_client_seen = time.monotonic()
            if not self.running:
                self.running = True
                self.thread = threading.Thread(target=self._worker_loop, daemon=True)
                self.thread.start()

    def remove_client(self) -> None:
        with self.lock:
            self._clients = max(0, self._clients - 1)
            self._last_client_seen = time.monotonic()

    def is_healthy(self) -> bool:
        with self.lock:
            if not self.running:
                return False
            if self.thread is None or not self.thread.is_alive():
                return False
            return True

    def _worker_loop(self) -> None:
        is_live = self.video_source.startswith("http://") or self.video_source.startswith("https://")
        reader = ThreadedCameraReader(self.video_source, is_live=is_live, target_size=(640, 360))
        processor = YoloByteTrackProcessor(
            model_path=str(PROJECT_ROOT / "yolo11n.pt"),
            confidence=0.12,
            device="cpu",
            exclusion_zones=self.exclusion_zones,
        )
        counter = LineCrossingCounter(self.counting_line)
        session_counts: Counter[str] = Counter()
        window_counts: Counter[str] = Counter()
        events: list[tuple[Track, str]] = []
        last_db_save = time.monotonic()

        executor = ThreadPoolExecutor(max_workers=1)
        future = None
        latest_tracks: list[Track] = []
        last_frame_time = time.monotonic()
        last_inference_time = 0.0
        min_inference_interval = 0.100  # ~10 inferences/sec: balanced CPU & smooth tracking
        last_read_seq = -1

        try:
            while self.running:
                with self.lock:
                    if self._clients <= 0 and (time.monotonic() - self._last_client_seen > 3.0):
                        break

                loop_start = time.monotonic()
                frame, seq = reader.read()
                if frame is None:
                    time.sleep(0.010)
                    continue
                if seq == last_read_seq:
                    time.sleep(0.008)
                    continue
                last_read_seq = seq

                h, w = frame.shape[:2]
                target_w = 640
                target_h = int(h * target_w / w)
                if (w, h) != (target_w, target_h):
                    frame_small = cv2.resize(frame, (target_w, target_h))
                else:
                    frame_small = frame

                now = time.monotonic()
                dt = min(0.1, max(0.01, now - last_frame_time))
                last_frame_time = now

                # 1. Check completed inference or submit new frame with cadence pacing
                if future is not None and future.done():
                    try:
                        latest_tracks = future.result()
                        for track in latest_tracks:
                            direction = counter.update(track, target_w, target_h)
                            if direction:
                                session_counts[track.vehicle_type] += 1
                                window_counts[track.vehicle_type] += 1
                                events.append((track, direction))
                    except Exception:
                        pass
                    future = None

                if future is None and (now - last_inference_time >= min_inference_interval):
                    last_inference_time = now
                    future = executor.submit(processor.process, frame_small.copy())

                # Periodic database snapshot persistence offloaded to background daemon thread
                # This guarantees video frame generation NEVER stalls on SQLite I/O or lock contention.
                if now - last_db_save >= 6.0:
                    if window_counts or events:
                        save_c = Counter(window_counts)
                        save_e = list(events)
                        threading.Thread(
                            target=_async_save_window,
                            args=(self.camera_id, save_c, save_e),
                            daemon=True,
                            name=f"SaveDB-{self.camera_id}-{int(now)}",
                        ).start()
                        window_counts.clear()
                        events.clear()
                    last_db_save = now

                # 2. Annotate frame
                _annotate_frame(
                    frame_small,
                    latest_tracks,
                    session_counts,
                )

                # 3. High-speed JPEG encoding (Quality 65 for low latency and smooth frame delivery)
                ret, buf = cv2.imencode(".jpg", frame_small, [cv2.IMWRITE_JPEG_QUALITY, 65])
                if ret:
                    frame_bytes = buf.tobytes()
                    with self.condition:
                        self.latest_jpeg = frame_bytes
                        self.frame_id += 1
                        self.condition.notify_all()
        finally:
            reader.stop()
            executor.shutdown(wait=False)
            with self.lock:
                self.running = False


class CameraStreamHub:
    """Registry of active CameraStreamWorker singletons."""

    _instance = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._workers: dict[int, CameraStreamWorker] = {}
        self._workers_lock = threading.Lock()

    @classmethod
    def get_hub(cls) -> "CameraStreamHub":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def get_or_create(
        self,
        camera_id: int,
        camera_name: str,
        video_source: str,
        counting_line: list[list[float]],
        exclusion_zones: list[list[tuple[float, float]]],
    ) -> CameraStreamWorker:
        with self._workers_lock:
            worker = self._workers.get(camera_id)
            if worker is None or not worker.is_healthy():
                worker = CameraStreamWorker(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    video_source=video_source,
                    counting_line=counting_line,
                    exclusion_zones=exclusion_zones,
                )
                self._workers[camera_id] = worker
            else:
                worker.counting_line = counting_line
                worker.exclusion_zones = exclusion_zones
            return worker


def _create_placeholder_jpeg(text: str = "Menghubungkan ke CCTV...") -> bytes:
    img = np.zeros((360, 640, 3), dtype=np.uint8)
    img[:] = (18, 24, 20)  # Dark slate background matching UI
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.65
    thickness = 1
    (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
    tx = (640 - tw) // 2
    ty = (360 + th) // 2
    cv2.putText(img, text, (tx, ty), font, font_scale, (201, 242, 96), thickness, cv2.LINE_AA)
    ret, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return buf.tobytes() if ret else b""


LOADING_JPEG = _create_placeholder_jpeg("Menghubungkan ke CCTV...")


async def _generate_video_stream(camera: Camera, video_source: str):
    exclusion_zones = CAMERA_EXCLUSION_ZONES.get(camera.id, [])
    if not exclusion_zones and camera.name and "masjid agung" in camera.name.lower():
        exclusion_zones = CAMERA_EXCLUSION_ZONES.get(4, [])

    counting_line = camera.counting_line or [[0.1, 0.55], [0.9, 0.55]]
    hub = CameraStreamHub.get_hub()
    worker = hub.get_or_create(
        camera_id=camera.id,
        camera_name=camera.name or "",
        video_source=video_source,
        counting_line=counting_line,
        exclusion_zones=exclusion_zones,
    )
    worker.add_client()
    last_sent_frame_id = -1

    try:
        # Immediately yield a loading frame within 5ms so the browser connection never times out
        first_frame = worker.latest_jpeg or LOADING_JPEG
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n"
            + f"Content-Length: {len(first_frame)}\r\n\r\n".encode("ascii")
            + first_frame
            + b"\r\n"
        )
        last_sent_time = time.monotonic()

        while True:
            now = time.monotonic()
            current_fid = worker.frame_id
            latest_bytes = worker.latest_jpeg

            # Yield new frame as soon as generated
            if latest_bytes is not None and current_fid != last_sent_frame_id:
                last_sent_frame_id = current_fid
                last_sent_time = now
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    + f"Content-Length: {len(latest_bytes)}\r\n\r\n".encode("ascii")
                    + latest_bytes
                    + b"\r\n"
                )
            elif now - last_sent_time >= 3.0:
                # Keep-alive heartbeat only if no frames were generated for 3 full seconds
                last_sent_time = now
                frame_to_send = latest_bytes or LOADING_JPEG
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    + f"Content-Length: {len(frame_to_send)}\r\n\r\n".encode("ascii")
                    + frame_to_send
                    + b"\r\n"
                )

            await asyncio.sleep(0.015)
    finally:
        worker.remove_client()



@router.get("/{camera_id}/stream/video")
def stream_video(camera_id: int, request: Request, db: Session = Depends(get_db)):
    camera = get_camera_or_404(db, camera_id)
    if camera.stream_type == "hls" and camera.stream_url:
        video_source = camera.stream_url
    else:
        video_path = PROJECT_ROOT / "vision" / "samples" / "traffic.mp4"
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="Video sample not found")
        video_source = str(video_path)
    return StreamingResponse(
        _generate_video_stream(camera, video_source),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, pre-check=0, post-check=0, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Accel-Buffering": "no",
        },
    )


def _fetch_camera_metadata(camera_id: int):
    with SessionLocal() as db:
        camera = db.get(Camera, camera_id)
        if camera is None:
            return None, [], None
        events = list(
            db.scalars(
                select(VehicleEvent)
                .where(VehicleEvent.camera_id == camera_id)
                .order_by(VehicleEvent.last_seen.desc())
                .limit(20)
            )
        )
        metrics = camera_metrics(db, camera)
        return camera, events, metrics


@router.websocket("/{camera_id}/stream/metadata")
async def stream_metadata(websocket: WebSocket, camera_id: int) -> None:
    """Send lightweight processed metadata; video frames are never persisted here."""
    await websocket.accept()
    try:
        while True:
            camera, events, metrics = await asyncio.to_thread(_fetch_camera_metadata, camera_id)
            if camera is None:
                await websocket.send_json({"error": "Camera not found"})
                await websocket.close(code=1008)
                return
            await websocket.send_json(
                {
                    "camera_id": camera_id,
                    "generated_at": datetime.now(UTC).isoformat(),
                    "traffic_status": metrics.traffic_status.value,
                    "active_metadata": [
                        {
                            "tracker_id": event.tracker_id,
                            "vehicle_type": event.vehicle_type,
                            "direction": event.direction,
                            "last_seen": event.last_seen.isoformat(),
                        }
                        for event in events
                    ],
                }
            )
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
