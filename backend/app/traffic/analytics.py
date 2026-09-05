from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Camera, TrafficSnapshot, TrafficStatus
from app.schemas.api import TrafficCurrent

STATUS_WEIGHT = {
    TrafficStatus.LANCAR: 0,
    TrafficStatus.SEDANG: 1,
    TrafficStatus.PADAT: 2,
    TrafficStatus.MACET: 3,
}


@dataclass(frozen=True)
class Classification:
    status: TrafficStatus
    score: float


def classify_traffic(volume: int, low: int, medium: int, high: int) -> Classification:
    if not 0 <= low < medium < high:
        raise ValueError("Thresholds must satisfy 0 <= low < medium < high")
    if volume < low:
        status = TrafficStatus.LANCAR
    elif volume < medium:
        status = TrafficStatus.SEDANG
    elif volume < high:
        status = TrafficStatus.PADAT
    else:
        status = TrafficStatus.MACET
    return Classification(status=status, score=round(min(100, volume / high * 100), 2))


def calculate_trend(current: int, previous: int, tolerance: float = 0.1) -> str:
    if previous == 0:
        return "MENINGKAT" if current > 0 else "STABIL"
    change = (current - previous) / previous
    if change >= tolerance:
        return "MENINGKAT"
    if change <= -tolerance:
        return "MENURUN"
    return "STABIL"


def camera_metrics(db: Session, camera: Camera, now: datetime | None = None) -> TrafficCurrent:
    now = now or datetime.now(UTC)
    snapshots = list(
        db.scalars(
            select(TrafficSnapshot)
            .where(
                TrafficSnapshot.camera_id == camera.id,
                TrafficSnapshot.timestamp >= now - timedelta(minutes=20),
            )
            .order_by(TrafficSnapshot.timestamp.desc())
        )
    )
    if not snapshots:
        latest_snap = db.scalar(
            select(TrafficSnapshot)
            .where(TrafficSnapshot.camera_id == camera.id)
            .order_by(TrafficSnapshot.timestamp.desc())
            .limit(1)
        )
        if latest_snap is not None:
            now = _aware(latest_snap.timestamp)
            snapshots = list(
                db.scalars(
                    select(TrafficSnapshot)
                    .where(
                        TrafficSnapshot.camera_id == camera.id,
                        TrafficSnapshot.timestamp >= now - timedelta(minutes=20),
                    )
                    .order_by(TrafficSnapshot.timestamp.desc())
                )
            )
    recent_5 = [s for s in snapshots if _aware(s.timestamp) >= now - timedelta(minutes=5)]
    recent_15 = [s for s in snapshots if _aware(s.timestamp) >= now - timedelta(minutes=15)]
    previous_5 = [
        s
        for s in snapshots
        if now - timedelta(minutes=10) <= _aware(s.timestamp) < now - timedelta(minutes=5)
    ]
    total_5 = sum(s.total_count for s in recent_5)
    total_15 = sum(s.total_count for s in recent_15)
    classification = classify_traffic(
        total_5, camera.low_threshold, camera.medium_threshold, camera.high_threshold
    )
    latest = snapshots[0] if snapshots else None
    return TrafficCurrent(
        camera_id=camera.id,
        camera_name=camera.name,
        road_name=camera.road_name,
        timestamp=latest.timestamp if latest else None,
        motorcycle_count=sum(s.motorcycle_count for s in recent_5),
        car_count=sum(s.car_count for s in recent_5),
        bus_count=sum(s.bus_count for s in recent_5),
        truck_count=sum(s.truck_count for s in recent_5),
        total_count=total_5,
        vehicles_per_minute=round(total_5 / 5, 2),
        rolling_5_minute=total_5,
        rolling_15_minute=total_15,
        congestion_score=classification.score,
        traffic_status=classification.status,
        trend=calculate_trend(total_5, sum(s.total_count for s in previous_5)),
        is_demo=camera.is_demo,
    )


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value
