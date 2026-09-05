import asyncio
import math
import sys
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path

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
async def create_camera(payload: CameraCreate, db: Session = Depends(get_db)) -> Camera:
    camera = Camera(
        **payload.model_dump(),
        location=database_geometry(db, point_wkt(payload.latitude, payload.longitude)),
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


@router.get("", response_model=list[CameraRead])
async def list_cameras(db: Session = Depends(get_db)) -> list[Camera]:
    return list(db.scalars(select(Camera).order_by(Camera.name)))


@router.get("/{camera_id}", response_model=CameraRead)
async def get_camera(camera_id: int, db: Session = Depends(get_db)) -> Camera:
    return get_camera_or_404(db, camera_id)


@router.get("/{camera_id}/traffic/current", response_model=TrafficCurrent)
async def get_current_traffic(camera_id: int, db: Session = Depends(get_db)) -> TrafficCurrent:
    return camera_metrics(db, get_camera_or_404(db, camera_id))


@router.get("/{camera_id}/traffic/history", response_model=list[SnapshotRead])
async def get_traffic_history(
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
    line: list[list[float]],
    counts: Counter[str],
    recently_crossed: bool = False,
) -> None:
    h, w = frame.shape[:2]
    # 1. Draw counting line
    lx1 = int(line[0][0] * w)
    ly1 = int(line[0][1] * h)
    lx2 = int(line[1][0] * w)
    ly2 = int(line[1][1] * h)
    line_color = (0, 255, 255) if recently_crossed else (0, 215, 255)
    thickness = 3 if recently_crossed else 2
    cv2.line(frame, (lx1, ly1), (lx2, ly2), line_color, thickness)
    cv2.putText(
        frame,
        "GARIS HITUNG",
        (max(10, min(lx1, lx2) + 20), max(20, min(ly1, ly2) - 8)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        line_color,
        1,
        cv2.LINE_AA,
    )

    # 2. Draw tracks
    colors = {
        "car": (48, 209, 88),         # Vibrant Green
        "motorcycle": (0, 140, 255),  # Vibrant Orange (BGR)
        "bus": (0, 215, 255),         # Yellow / Gold
        "truck": (245, 130, 48),      # Deep Sky Blue / Teal
    }
    for track in tracks:
        left, top, right, bottom = map(int, track.bounding_box)
        left = max(0, min(w - 1, left))
        top = max(0, min(h - 1, top))
        right = max(0, min(w - 1, right))
        bottom = max(0, min(h - 1, bottom))
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

    # 3. HUD footer
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


class ThreadedCameraReader:
    """Non-blocking background video capture reader for smooth live streaming."""

    def __init__(self, source: str, is_live: bool = True) -> None:
        self.source = source
        self.is_live = is_live
        self.cap: cv2.VideoCapture | None = None
        self.frame = None
        self.running = True
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._reader_loop, daemon=True)
        self.thread.start()

    def _reader_loop(self) -> None:
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                try:
                    cap = cv2.VideoCapture(self.source)
                    if self.is_live:
                        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    if not cap.isOpened():
                        time.sleep(0.5)
                        continue
                    self.cap = cap
                except Exception:
                    time.sleep(0.5)
                    continue

            ok, f = self.cap.read()
            if ok and f is not None:
                with self.lock:
                    self.frame = f
                if not self.is_live:
                    time.sleep(0.033)
                else:
                    time.sleep(0.015)
            else:
                if self.is_live:
                    try:
                        self.cap.release()
                    except Exception:
                        pass
                    self.cap = None
                    time.sleep(0.5)
                else:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    time.sleep(0.01)

    def read(self):
        with self.lock:
            if self.frame is not None:
                return self.frame.copy()
            return None

    def stop(self) -> None:
        self.running = False
        with self.lock:
            if self.cap is not None:
                try:
                    self.cap.release()
                except Exception:
                    pass
                self.cap = None


async def _generate_video_stream(camera: Camera, video_source: str, request: Request):
    is_live = video_source.startswith("http://") or video_source.startswith("https://")
    exclusion_zones = CAMERA_EXCLUSION_ZONES.get(camera.id, [])
    if not exclusion_zones and camera.name and "masjid agung" in camera.name.lower():
        exclusion_zones = CAMERA_EXCLUSION_ZONES.get(4, [])

    processor = YoloByteTrackProcessor(
        model_path=str(PROJECT_ROOT / "yolo11n.pt"),
        confidence=0.08,
        device="cpu",
        exclusion_zones=exclusion_zones,
    )
    line = camera.counting_line or [[0.1, 0.55], [0.9, 0.55]]
    counter = LineCrossingCounter(line)
    session_counts: Counter[str] = Counter()
    window_counts: Counter[str] = Counter()
    events: list[tuple[Track, str]] = []
    last_db_save = time.monotonic()
    last_crossed_time = 0.0

    reader = ThreadedCameraReader(video_source, is_live=is_live)
    executor = ThreadPoolExecutor(max_workers=1)
    future = None
    latest_tracks: list[Track] = []
    frame_interval = 0.040  # ~25 FPS smooth playback

    try:
        while True:
            if await request.is_disconnected():
                break

            loop_start = time.monotonic()
            frame = reader.read()
            if frame is None:
                await asyncio.sleep(0.02)
                continue

            h, w = frame.shape[:2]
            target_w = 640
            target_h = int(h * target_w / w)
            frame_small = cv2.resize(frame, (target_w, target_h))

            # 1. Asynchronously retrieve completed inference or dispatch new one
            if future is None or future.done():
                if future is not None:
                    try:
                        latest_tracks = future.result()
                        for track in latest_tracks:
                            direction = counter.update(track, target_w, target_h)
                            if direction:
                                session_counts[track.vehicle_type] += 1
                                window_counts[track.vehicle_type] += 1
                                events.append((track, direction))
                                last_crossed_time = time.monotonic()
                    except Exception:
                        pass
                # Submit current frame copy to background thread without blocking video stream
                future = executor.submit(processor.process, frame_small.copy())
            else:
                # Smooth inter-frame box motion: glide boxes smoothly between inferences
                interp_tracks = []
                for t in latest_tracks:
                    vx, vy = t.velocity
                    if 0.2 < math.hypot(vx, vy) < 25.0:
                        dx = vx * 0.10
                        dy = vy * 0.10
                        b = t.bounding_box
                        nb = [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]
                        interp_tracks.append(
                            Track(
                                tracker_id=t.tracker_id,
                                vehicle_type=t.vehicle_type,
                                confidence=t.confidence,
                                bounding_box=nb,
                                velocity=t.velocity,
                            )
                        )
                    else:
                        interp_tracks.append(t)
                latest_tracks = interp_tracks

            recently_crossed = (time.monotonic() - last_crossed_time < 1.2)

            # Save real counts to database every 6 seconds
            if time.monotonic() - last_db_save >= 6:
                if window_counts or events:
                    with SessionLocal() as db_session:
                        cam_in_db = db_session.get(Camera, camera.id)
                        if cam_in_db:
                            save_window(db_session, cam_in_db, window_counts, events)
                    window_counts, events = Counter(), []
                last_db_save = time.monotonic()

            # 2. Annotate and render frame smoothly
            _annotate_frame(frame_small, latest_tracks, line, session_counts, recently_crossed)

            ret, buf = cv2.imencode(".jpg", frame_small, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ret:
                continue
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n"
            )

            # Keep video streaming at steady, smooth 25 FPS
            elapsed = time.monotonic() - loop_start
            sleep_time = max(0.005, frame_interval - elapsed)
            await asyncio.sleep(sleep_time)
    finally:
        reader.stop()
        executor.shutdown(wait=False)



@router.get("/{camera_id}/stream/video")
async def stream_video(camera_id: int, request: Request, db: Session = Depends(get_db)):
    camera = get_camera_or_404(db, camera_id)
    if camera.stream_type == "hls" and camera.stream_url:
        video_source = camera.stream_url
    else:
        video_path = PROJECT_ROOT / "vision" / "samples" / "traffic.mp4"
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="Video sample not found")
        video_source = str(video_path)
    return StreamingResponse(
        _generate_video_stream(camera, video_source, request),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.websocket("/{camera_id}/stream/metadata")
async def stream_metadata(websocket: WebSocket, camera_id: int) -> None:
    """Send lightweight processed metadata; video frames are never persisted here."""
    await websocket.accept()
    try:
        while True:
            with SessionLocal() as db:
                camera = db.get(Camera, camera_id)
                if camera is None:
                    await websocket.send_json({"error": "Camera not found"})
                    await websocket.close(code=1008)
                    return
                events = list(
                    db.scalars(
                        select(VehicleEvent)
                        .where(VehicleEvent.camera_id == camera_id)
                        .order_by(VehicleEvent.last_seen.desc())
                        .limit(20)
                    )
                )
                metrics = camera_metrics(db, camera)
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
