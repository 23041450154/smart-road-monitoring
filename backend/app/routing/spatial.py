import math

from geoalchemy2 import Geography
from sqlalchemy import cast, func, select
from sqlalchemy.orm import Session

from app.models import Camera, Pothole, Route

EARTH_RADIUS_METERS = 6_371_000


def haversine_meters(a: list[float], b: list[float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_METERS * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def point_to_route_meters(point: list[float], path: list[list[float]]) -> float:
    if len(path) == 1:
        return haversine_meters(point, path[0])
    lat_scale = 111_320
    lon_scale = lat_scale * math.cos(math.radians(point[0]))
    px, py = (point[1] * lon_scale, point[0] * lat_scale)
    closest = float("inf")
    for start, end in zip(path, path[1:], strict=False):
        ax, ay = start[1] * lon_scale, start[0] * lat_scale
        bx, by = end[1] * lon_scale, end[0] * lat_scale
        dx, dy = bx - ax, by - ay
        ratio = (
            0
            if dx == dy == 0
            else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        )
        closest = min(closest, math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy)))
    return closest


def cameras_near_route(db: Session, route: Route, buffer_meters: float) -> list[Camera]:
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        return list(
            db.scalars(
                select(Camera)
                .select_from(Camera, Route)
                .where(
                    Route.id == route.id,
                    Camera.is_active.is_(True),
                    Camera.location.is_not(None),
                    # PostGIS geography casts ensure the distance is measured in metres.
                    func.ST_DWithin(
                        cast(Camera.location, Geography),
                        cast(Route.geometry, Geography),
                        buffer_meters,
                    ),
                )
            )
        )
    return [
        camera
        for camera in db.scalars(select(Camera).where(Camera.is_active.is_(True)))
        if point_to_route_meters([camera.latitude, camera.longitude], route.path) <= buffer_meters
    ]


def potholes_near_route(db: Session, route: Route, buffer_meters: float) -> list[Pothole]:
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        return list(
            db.scalars(
                select(Pothole)
                .select_from(Pothole, Route)
                .where(
                    Route.id == route.id,
                    Pothole.location.is_not(None),
                    func.ST_DWithin(
                        cast(Pothole.location, Geography),
                        cast(Route.geometry, Geography),
                        buffer_meters,
                    ),
                )
            )
        )
    return [
        pothole
        for pothole in db.scalars(select(Pothole))
        if point_to_route_meters([pothole.latitude, pothole.longitude], route.path) <= buffer_meters
    ]
