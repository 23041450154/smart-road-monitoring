from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Camera, TrafficSnapshot, TrafficStatus
from app.schemas.api import (
    AreaHourlyInsight,
    CityHourlyInsightsResponse,
    HourlyProfileItem,
    HourlyProfileResponse,
    PeakAreaHighlight,
    TrafficCurrent,
    TrafficPredictionResponse,
)

WIB = ZoneInfo("Asia/Jakarta")

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


def get_camera_hourly_profile(db: Session, camera: Camera) -> HourlyProfileResponse:
    snapshots = list(
        db.scalars(
            select(TrafficSnapshot)
            .where(TrafficSnapshot.camera_id == camera.id)
            .order_by(TrafficSnapshot.timestamp)
        )
    )

    hour_buckets: dict[int, list[TrafficSnapshot]] = {h: [] for h in range(24)}
    for s in snapshots:
        ts = _aware(s.timestamp).astimezone(WIB)
        hour_buckets[ts.hour].append(s)

    profile_items: list[HourlyProfileItem] = []

    # Typical daily pattern curve as baseline (urban traffic Palembang)
    typical_factors = [
        0.10, 0.07, 0.05, 0.05, 0.08, 0.25, 0.55, 0.90, 0.85, 0.65, 0.60, 0.65,
        0.70, 0.65, 0.65, 0.75, 0.95, 1.00, 0.85, 0.70, 0.55, 0.40, 0.25, 0.15
    ]

    for h in range(24):
        bucket = hour_buckets[h]
        if bucket:
            avg_count = sum(s.total_count for s in bucket) / len(bucket)
            avg_score = sum(s.congestion_score for s in bucket) / len(bucket)
            # Volume scaled to 5-minute window equivalent to match camera thresholds
            scaled_volume = int((avg_score / 100.0) * camera.high_threshold)
            classification = classify_traffic(
                scaled_volume, camera.low_threshold, camera.medium_threshold, camera.high_threshold
            )
            vpm = round(avg_count, 1) if avg_count > 0 else 0.0
            score = round(avg_score, 1)
            status = classification.status
            sample_count = len(bucket)
        else:
            factor = typical_factors[h]
            estimated_volume = int(camera.high_threshold * factor)
            classification = classify_traffic(
                estimated_volume, camera.low_threshold, camera.medium_threshold, camera.high_threshold
            )
            avg_count = float(estimated_volume)
            vpm = round(estimated_volume / 5.0, 1)
            score = classification.score
            status = classification.status
            sample_count = 0

        profile_items.append(
            HourlyProfileItem(
                hour=h,
                hour_label=f"{h:02d}:00",
                avg_total_count=round(avg_count, 1),
                avg_vehicles_per_minute=vpm,
                avg_congestion_score=score,
                traffic_status=status,
                sample_count=sample_count,
                is_peak_hour=False,
            )
        )

    morning_candidates = [item for item in profile_items if 6 <= item.hour <= 9]
    evening_candidates = [item for item in profile_items if 16 <= item.hour <= 19]

    morning_peak = max(morning_candidates, key=lambda x: x.avg_congestion_score) if morning_candidates else None
    evening_peak = max(evening_candidates, key=lambda x: x.avg_congestion_score) if evening_candidates else None

    morning_label = None
    evening_label = None
    if morning_peak and morning_peak.avg_congestion_score >= 50:
        morning_peak.is_peak_hour = True
        morning_label = f"{morning_peak.hour:02d}:00 - {morning_peak.hour + 1:02d}:00"
    if evening_peak and evening_peak.avg_congestion_score >= 50:
        evening_peak.is_peak_hour = True
        evening_label = f"{evening_peak.hour:02d}:00 - {evening_peak.hour + 1:02d}:00"

    return HourlyProfileResponse(
        camera_id=camera.id,
        camera_name=camera.name,
        road_name=camera.road_name,
        profile=profile_items,
        morning_peak=morning_label,
        evening_peak=evening_label,
        total_samples=len(snapshots),
    )


def predict_camera_traffic(db: Session, camera: Camera, hour: int) -> TrafficPredictionResponse:
    if not 0 <= hour <= 23:
        raise ValueError("Hour must be between 0 and 23")

    profile_res = get_camera_hourly_profile(db, camera)
    target = profile_res.profile[hour]

    confidence = "TINGGI" if target.sample_count >= 10 else ("SEDANG" if target.sample_count > 0 else "MODEL")
    time_label = f"{hour:02d}:00"

    if target.traffic_status == TrafficStatus.MACET:
        recommendation = (
            f"Lalu lintas pada pukul {time_label} di {camera.road_name} diprediksi MACET (puncak kemacetan). "
            f"Disarankan menunda keberangkatan atau mencari jalur alternatif."
        )
    elif target.traffic_status == TrafficStatus.PADAT:
        recommendation = (
            f"Lalu lintas pada pukul {time_label} di {camera.road_name} diprediksi PADAT merayap. "
            f"Estimasi waktu tempuh bertambah ~15-20 menit. Berangkat lebih awal disarankan."
        )
    elif target.traffic_status == TrafficStatus.SEDANG:
        recommendation = (
            f"Lalu lintas pada pukul {time_label} cukup ramai namun kendaraan masih mengalir normal. "
            f"Waktu tempuh relatif aman dan lancar."
        )
    else:
        recommendation = (
            f"Lalu lintas pada pukul {time_label} diprediksi LANCAR tanpa hambatan berarti. "
            f"Waktu yang sangat ideal untuk melintasi ruas {camera.road_name}."
        )

    return TrafficPredictionResponse(
        camera_id=camera.id,
        camera_name=camera.name,
        road_name=camera.road_name,
        queried_hour=hour,
        queried_time_label=time_label,
        predicted_status=target.traffic_status,
        congestion_score=target.avg_congestion_score,
        avg_vehicles_per_minute=target.avg_vehicles_per_minute,
        confidence_level=confidence,
        is_peak_hour=target.is_peak_hour,
        sample_count=target.sample_count,
        recommendation=recommendation,
    )


def get_city_hourly_insights(db: Session, now: datetime | None = None) -> CityHourlyInsightsResponse:
    now_local = (now or datetime.now(UTC)).astimezone(WIB) if (now and now.tzinfo) else datetime.now(WIB)
    curr_hour = now_local.hour

    cameras = list(
        db.scalars(
            select(Camera)
            .where(Camera.is_active.is_(True))
            .order_by(Camera.name)
        )
    )

    area_insights: list[AreaHourlyInsight] = []
    morning_highlights: list[PeakAreaHighlight] = []
    evening_highlights: list[PeakAreaHighlight] = []

    for cam in cameras:
        profile_res = get_camera_hourly_profile(db, cam)
        statuses = [item.traffic_status for item in profile_res.profile]
        scores = [item.avg_congestion_score for item in profile_res.profile]
        vpms = [item.avg_vehicles_per_minute for item in profile_res.profile]

        max_score = max(scores) if scores else 0.0

        insight = AreaHourlyInsight(
            camera_id=cam.id,
            camera_name=cam.name,
            road_name=cam.road_name,
            morning_peak=profile_res.morning_peak,
            evening_peak=profile_res.evening_peak,
            peak_score=max_score,
            hourly_status=statuses,
            hourly_scores=scores,
            hourly_vpm=vpms,
        )
        area_insights.append(insight)

        # Morning window (06:00 - 09:00)
        m_slice = profile_res.profile[6:10]
        if m_slice:
            m_peak_item = max(m_slice, key=lambda x: x.avg_congestion_score)
            if m_peak_item.avg_congestion_score >= 35:
                morning_highlights.append(
                    PeakAreaHighlight(
                        camera_id=cam.id,
                        camera_name=cam.name,
                        road_name=cam.road_name,
                        peak_window=f"{m_peak_item.hour:02d}:00 - {m_peak_item.hour + 1:02d}:00",
                        traffic_status=m_peak_item.traffic_status,
                        congestion_score=m_peak_item.avg_congestion_score,
                        avg_vehicles_per_minute=m_peak_item.avg_vehicles_per_minute,
                    )
                )

        # Evening window (16:00 - 19:00)
        e_slice = profile_res.profile[16:20]
        if e_slice:
            e_peak_item = max(e_slice, key=lambda x: x.avg_congestion_score)
            if e_peak_item.avg_congestion_score >= 35:
                evening_highlights.append(
                    PeakAreaHighlight(
                        camera_id=cam.id,
                        camera_name=cam.name,
                        road_name=cam.road_name,
                        peak_window=f"{e_peak_item.hour:02d}:00 - {e_peak_item.hour + 1:02d}:00",
                        traffic_status=e_peak_item.traffic_status,
                        congestion_score=e_peak_item.avg_congestion_score,
                        avg_vehicles_per_minute=e_peak_item.avg_vehicles_per_minute,
                    )
                )

    morning_highlights.sort(key=lambda x: x.congestion_score, reverse=True)
    evening_highlights.sort(key=lambda x: x.congestion_score, reverse=True)

    return CityHourlyInsightsResponse(
        current_hour=curr_hour,
        current_time_label=f"{curr_hour:02d}:00 WIB",
        areas=area_insights,
        city_morning_peak="07:00 - 08:30 WIB",
        city_evening_peak="16:30 - 18:30 WIB",
        morning_peak_areas=morning_highlights[:5],
        evening_peak_areas=evening_highlights[:5],
        quietest_hours=["22:00 - 05:00 WIB", "10:30 - 11:30 WIB"],
    )

