from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import Camera, Pothole, PotholeStatus, TrafficSnapshot, TrafficStatus
from app.schemas.api import TrafficCurrent, TrafficSummary
from app.traffic.analytics import camera_metrics

router = APIRouter(prefix="/traffic", tags=["traffic"])


@router.get("/current", response_model=list[TrafficCurrent])
async def current_traffic(db: Session = Depends(get_db)) -> list[TrafficCurrent]:
    cameras = db.scalars(select(Camera).where(Camera.is_active.is_(True)).order_by(Camera.name))
    return [camera_metrics(db, camera) for camera in cameras]


@router.get("/summary", response_model=TrafficSummary)
async def traffic_summary(
    db: Session = Depends(get_db), settings: Settings = Depends(get_settings)
) -> TrafficSummary:
    now = datetime.now(UTC)
    current = [
        camera_metrics(db, camera, now)
        for camera in db.scalars(select(Camera).where(Camera.is_active.is_(True)))
    ]
    vehicles = db.scalar(
        select(func.coalesce(func.sum(TrafficSnapshot.total_count), 0)).where(
            TrafficSnapshot.timestamp >= now - timedelta(minutes=5)
        )
    )
    return TrafficSummary(
        cctv_online=len(current),
        vehicles_last_5_minutes=int(vehicles or 0),
        congested_roads=sum(
            item.traffic_status in {TrafficStatus.PADAT, TrafficStatus.MACET} for item in current
        ),
        detected_potholes=int(
            db.scalar(
                select(func.count(Pothole.id)).where(Pothole.status != PotholeStatus.REPAIRED)
            )
            or 0
        ),
        generated_at=now,
        demo_mode=settings.demo_mode,
    )
