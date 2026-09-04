from dataclasses import dataclass
from datetime import datetime, timezone
from xml.etree import ElementTree


@dataclass(frozen=True)
class GPSPoint:
    timestamp: datetime
    latitude: float
    longitude: float


def load_gpx(path: str) -> list[GPSPoint]:
    root = ElementTree.parse(path).getroot()
    points: list[GPSPoint] = []
    for element in root.iter():
        if not element.tag.endswith("trkpt"):
            continue
        time_node = next(
            (child for child in element if child.tag.endswith("time")), None
        )
        if time_node is None or not time_node.text:
            continue
        timestamp = datetime.fromisoformat(time_node.text.replace("Z", "+00:00"))
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        points.append(
            GPSPoint(
                timestamp, float(element.attrib["lat"]), float(element.attrib["lon"])
            )
        )
    if not points:
        raise ValueError("GPX must contain timestamped track points")
    return sorted(points, key=lambda point: point.timestamp)


def interpolate_gps(points: list[GPSPoint], timestamp: datetime) -> GPSPoint:
    if timestamp <= points[0].timestamp:
        return GPSPoint(timestamp, points[0].latitude, points[0].longitude)
    if timestamp >= points[-1].timestamp:
        return GPSPoint(timestamp, points[-1].latitude, points[-1].longitude)
    for start, end in zip(points, points[1:], strict=False):
        if start.timestamp <= timestamp <= end.timestamp:
            duration = (end.timestamp - start.timestamp).total_seconds()
            ratio = (
                (timestamp - start.timestamp).total_seconds() / duration
                if duration
                else 0
            )
            return GPSPoint(
                timestamp,
                start.latitude + (end.latitude - start.latitude) * ratio,
                start.longitude + (end.longitude - start.longitude) * ratio,
            )
    return GPSPoint(timestamp, points[-1].latitude, points[-1].longitude)
