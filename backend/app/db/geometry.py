from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session


def point_wkt(latitude: float, longitude: float) -> str:
    return f"POINT({longitude} {latitude})"


def line_wkt(path: list[list[float]]) -> str:
    return "LINESTRING(" + ", ".join(f"{lng} {lat}" for lat, lng in path) + ")"


def database_geometry(db: Session, wkt: str) -> Any:
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        return WKTElement(wkt, srid=4326)
    return wkt
