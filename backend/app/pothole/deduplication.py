from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Pothole
from app.routing.spatial import haversine_meters


def find_duplicate(
    db: Session, latitude: float, longitude: float, radius_meters: float
) -> Pothole | None:
    for pothole in db.scalars(select(Pothole)):
        if (
            haversine_meters([latitude, longitude], [pothole.latitude, pothole.longitude])
            <= radius_meters
        ):
            return pothole
    return None
