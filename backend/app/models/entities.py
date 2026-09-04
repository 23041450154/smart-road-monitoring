import enum
from datetime import UTC, datetime, time
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class TrafficStatus(str, enum.Enum):
    LANCAR = "LANCAR"
    SEDANG = "SEDANG"
    PADAT = "PADAT"
    MACET = "MACET"


class RouteType(str, enum.Enum):
    COMMUTE_TO_WORK = "commute_to_work"
    COMMUTE_HOME = "commute_home"
    CUSTOM = "custom"


class PotholeStatus(str, enum.Enum):
    ACTIVE = "active"
    REPAIRED = "repaired"
    UNVERIFIED = "unverified"


class Severity(str, enum.Enum):
    UNKNOWN = "unknown"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PortableGeometry(TypeDecorator[Any]):
    """PostGIS geometry in production, plain WKT text for isolated SQLite tests."""

    impl = Text
    cache_ok = True

    def __init__(self, geometry_type: str) -> None:
        super().__init__()
        self.geometry_type = geometry_type

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Geometry(geometry_type=self.geometry_type, srid=4326))
        return dialect.type_descriptor(Text())


point_geometry_type = PortableGeometry("POINT")
line_geometry_type = PortableGeometry("LINESTRING")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Jakarta")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    routes: Mapped[list["Route"]] = relationship(back_populates="user")


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    road_name: Mapped[str] = mapped_column(String(160))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    location: Mapped[Any | None] = mapped_column(point_geometry_type, nullable=True)
    stream_url: Mapped[str | None] = mapped_column(Text)
    stream_type: Mapped[str] = mapped_column(String(20), default="local")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    low_threshold: Mapped[int] = mapped_column(Integer, default=20)
    medium_threshold: Mapped[int] = mapped_column(Integer, default=45)
    high_threshold: Mapped[int] = mapped_column(Integer, default=75)
    counting_line: Mapped[list[list[float]] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    snapshots: Mapped[list["TrafficSnapshot"]] = relationship(
        back_populates="camera", cascade="all, delete-orphan"
    )


class TrafficSnapshot(Base):
    __tablename__ = "traffic_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id", ondelete="CASCADE"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    motorcycle_count: Mapped[int] = mapped_column(Integer, default=0)
    car_count: Mapped[int] = mapped_column(Integer, default=0)
    bus_count: Mapped[int] = mapped_column(Integer, default=0)
    truck_count: Mapped[int] = mapped_column(Integer, default=0)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    congestion_score: Mapped[float] = mapped_column(Float, default=0)
    traffic_status: Mapped[TrafficStatus] = mapped_column(Enum(TrafficStatus))
    camera: Mapped[Camera] = relationship(back_populates="snapshots")


class VehicleEvent(Base):
    __tablename__ = "vehicle_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id", ondelete="CASCADE"), index=True)
    tracker_id: Mapped[str] = mapped_column(String(80))
    vehicle_type: Mapped[str] = mapped_column(String(30))
    direction: Mapped[str | None] = mapped_column(String(20))
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    route_type: Mapped[RouteType] = mapped_column(Enum(RouteType), default=RouteType.CUSTOM)
    start_latitude: Mapped[float] = mapped_column(Float)
    start_longitude: Mapped[float] = mapped_column(Float)
    destination_latitude: Mapped[float] = mapped_column(Float)
    destination_longitude: Mapped[float] = mapped_column(Float)
    geometry: Mapped[Any] = mapped_column(line_geometry_type)
    path: Mapped[list[list[float]]] = mapped_column(JSON)
    notification_time: Mapped[time | None] = mapped_column(Time)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    user: Mapped[User] = relationship(back_populates="routes")


class Pothole(Base):
    __tablename__ = "potholes"

    id: Mapped[int] = mapped_column(primary_key=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    location: Mapped[Any | None] = mapped_column(point_geometry_type, nullable=True)
    road_name: Mapped[str | None] = mapped_column(String(160))
    confidence: Mapped[float] = mapped_column(Float)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), default=Severity.UNKNOWN)
    image_path: Mapped[str | None] = mapped_column(Text)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[PotholeStatus] = mapped_column(
        Enum(PotholeStatus), default=PotholeStatus.UNVERIFIED
    )
