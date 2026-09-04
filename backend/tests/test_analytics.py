from datetime import UTC, datetime, timedelta

import pytest

from app.models import Camera, TrafficSnapshot, TrafficStatus
from app.traffic.analytics import calculate_trend, camera_metrics, classify_traffic


@pytest.mark.parametrize(
    ("volume", "expected"),
    [
        (0, TrafficStatus.LANCAR),
        (20, TrafficStatus.SEDANG),
        (45, TrafficStatus.PADAT),
        (75, TrafficStatus.MACET),
    ],
)
def test_camera_specific_classification(volume, expected):
    assert classify_traffic(volume, 20, 45, 75).status == expected


def test_invalid_thresholds_are_rejected():
    with pytest.raises(ValueError):
        classify_traffic(10, 30, 20, 50)


def test_trend():
    assert calculate_trend(30, 20) == "MENINGKAT"
    assert calculate_trend(10, 20) == "MENURUN"
    assert calculate_trend(21, 20) == "STABIL"


def test_rolling_windows(db):
    now = datetime.now(UTC)
    camera = Camera(
        name="Rolling test",
        road_name="Test road",
        latitude=-2.9,
        longitude=104.7,
        stream_type="local",
        low_threshold=20,
        medium_threshold=45,
        high_threshold=75,
    )
    db.add(camera)
    db.flush()
    for minutes, count in [(1, 10), (4, 8), (7, 20), (14, 5), (18, 99)]:
        db.add(
            TrafficSnapshot(
                camera_id=camera.id,
                timestamp=now - timedelta(minutes=minutes),
                motorcycle_count=count,
                car_count=0,
                bus_count=0,
                truck_count=0,
                total_count=count,
                congestion_score=0,
                traffic_status=TrafficStatus.LANCAR,
            )
        )
    db.commit()
    metrics = camera_metrics(db, camera, now)
    assert metrics.rolling_5_minute == 18
    assert metrics.rolling_15_minute == 43
    assert metrics.trend == "MENURUN"
