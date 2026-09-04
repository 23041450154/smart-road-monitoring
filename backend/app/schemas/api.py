from datetime import datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import PotholeStatus, RouteType, Severity, TrafficStatus


class CameraRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    road_name: str
    latitude: float
    longitude: float
    stream_type: str
    is_active: bool
    is_demo: bool
    low_threshold: int
    medium_threshold: int
    high_threshold: int
    counting_line: list[list[float]] | None = None
    created_at: datetime


class CameraCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    road_name: str = Field(min_length=2, max_length=160)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    stream_url: str | None = None
    stream_type: Literal["local", "hls", "rtsp"] = "local"
    is_active: bool = True
    is_demo: bool = False
    low_threshold: int = Field(default=20, ge=0)
    medium_threshold: int = Field(default=45, ge=1)
    high_threshold: int = Field(default=75, ge=2)
    counting_line: list[list[float]] | None = [[0.1, 0.55], [0.9, 0.55]]

    @model_validator(mode="after")
    def thresholds_in_order(self):
        if not self.low_threshold < self.medium_threshold < self.high_threshold:
            raise ValueError("Thresholds must satisfy low < medium < high")
        return self


class SnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    camera_id: int
    timestamp: datetime
    motorcycle_count: int
    car_count: int
    bus_count: int
    truck_count: int
    total_count: int
    congestion_score: float
    traffic_status: TrafficStatus


class TrafficCurrent(BaseModel):
    camera_id: int
    camera_name: str
    road_name: str
    timestamp: datetime | None
    motorcycle_count: int = 0
    car_count: int = 0
    bus_count: int = 0
    truck_count: int = 0
    total_count: int = 0
    vehicles_per_minute: float = 0
    rolling_5_minute: int = 0
    rolling_15_minute: int = 0
    congestion_score: float = 0
    traffic_status: TrafficStatus = TrafficStatus.LANCAR
    trend: str = "STABIL"
    is_demo: bool = False


class TrafficSummary(BaseModel):
    cctv_online: int
    vehicles_last_5_minutes: int
    congested_roads: int
    detected_potholes: int
    generated_at: datetime
    demo_mode: bool


class RouteBase(BaseModel):
    user_id: int = 1
    name: str = Field(min_length=2, max_length=160)
    route_type: RouteType = RouteType.CUSTOM
    start_latitude: float = Field(ge=-90, le=90)
    start_longitude: float = Field(ge=-180, le=180)
    destination_latitude: float = Field(ge=-90, le=90)
    destination_longitude: float = Field(ge=-180, le=180)
    path: list[list[float]]
    notification_time: time | None = None
    is_active: bool = True

    @field_validator("path")
    @classmethod
    def validate_path(cls, path: list[list[float]]) -> list[list[float]]:
        if len(path) < 2:
            raise ValueError("Route path requires at least two coordinates")
        for point in path:
            if len(point) != 2 or not (-90 <= point[0] <= 90) or not (-180 <= point[1] <= 180):
                raise ValueError("Each path point must be [latitude, longitude]")
        return path


class RouteCreate(RouteBase):
    pass


class RouteUpdate(RouteBase):
    pass


class RouteRead(RouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class PotholeCreate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    road_name: str | None = None
    confidence: float = Field(ge=0, le=1)
    severity: Severity = Severity.UNKNOWN
    image_path: str | None = None
    detected_at: datetime | None = None
    status: PotholeStatus = PotholeStatus.UNVERIFIED


class PotholeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    latitude: float
    longitude: float
    road_name: str | None
    confidence: float
    severity: Severity
    image_path: str | None
    detected_at: datetime
    status: PotholeStatus


class RouteTraffic(BaseModel):
    route: RouteRead
    cameras: list[TrafficCurrent]


class BriefingIssue(BaseModel):
    type: str
    road: str | None
    status: str | None = None
    trend: str | None = None
    severity: str | None = None


class Briefing(BaseModel):
    route_id: int
    route_name: str
    route_type: RouteType
    overall_status: TrafficStatus
    traffic: list[TrafficCurrent]
    potholes: list[PotholeRead]
    issues: list[BriefingIssue]
    message: str
    generated_at: datetime
