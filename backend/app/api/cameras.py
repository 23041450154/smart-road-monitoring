import asyncio
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.geometry import database_geometry, point_wkt
from app.db.session import SessionLocal, get_db
from app.models import Camera, TrafficSnapshot, VehicleEvent
from app.schemas.api import CameraCreate, CameraRead, SnapshotRead, TrafficCurrent
from app.traffic.analytics import camera_metrics

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
    get_camera_or_404(db, camera_id)
    since = datetime.now(UTC) - timedelta(hours=hours)
    return list(
        db.scalars(
            select(TrafficSnapshot)
            .where(TrafficSnapshot.camera_id == camera_id, TrafficSnapshot.timestamp >= since)
            .order_by(TrafficSnapshot.timestamp)
        )
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
