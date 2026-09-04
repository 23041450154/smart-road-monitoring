from datetime import UTC, datetime, timedelta

from vision.pothole_worker.gps import GPSPoint, interpolate_gps


def test_gps_interpolation():
    start = datetime(2026, 1, 1, tzinfo=UTC)
    points = [GPSPoint(start, -2.0, 104.0), GPSPoint(start + timedelta(seconds=10), -3.0, 105.0)]
    result = interpolate_gps(points, start + timedelta(seconds=5))
    assert result.latitude == -2.5
    assert result.longitude == 104.5


def test_gps_interpolation_for_half_second_video_timestamp():
    video_start = datetime(2026, 1, 1, tzinfo=UTC)
    points = [
        GPSPoint(video_start + timedelta(seconds=12), -2.9900, 104.7500),
        GPSPoint(video_start + timedelta(seconds=13), -2.9910, 104.7520),
    ]

    result = interpolate_gps(points, video_start + timedelta(seconds=12.5))

    assert result.latitude == -2.9905
    assert result.longitude == 104.751
