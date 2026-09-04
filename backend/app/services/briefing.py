from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import Route, TrafficStatus
from app.routing.spatial import cameras_near_route, potholes_near_route
from app.schemas.api import Briefing, BriefingIssue, PotholeRead
from app.services.briefing_formatter import get_formatter
from app.traffic.analytics import STATUS_WEIGHT, camera_metrics


def build_briefing(db: Session, route: Route, settings: Settings) -> Briefing:
    traffic = [
        camera_metrics(db, camera)
        for camera in cameras_near_route(db, route, settings.camera_route_buffer_meters)
    ]
    potholes = potholes_near_route(db, route, settings.pothole_route_buffer_meters)
    overall = max(
        (item.traffic_status for item in traffic),
        key=lambda status: STATUS_WEIGHT[status],
        default=TrafficStatus.LANCAR,
    )
    issues = [
        BriefingIssue(
            type="traffic",
            road=item.road_name,
            status=item.traffic_status.value,
            trend=item.trend,
        )
        for item in traffic
        if item.traffic_status != TrafficStatus.LANCAR
    ]
    issues.extend(
        BriefingIssue(type="pothole", road=item.road_name, severity=item.severity.value)
        for item in potholes
    )
    template_message = format_indonesian(route.name, overall, traffic, len(potholes))
    structured = {
        "route_name": route.name,
        "overall_status": overall.value,
        "issues": [item.model_dump(exclude_none=True) for item in issues],
    }
    return Briefing(
        route_id=route.id,
        route_name=route.name,
        route_type=route.route_type,
        overall_status=overall,
        traffic=traffic,
        potholes=[PotholeRead.model_validate(item) for item in potholes],
        issues=issues,
        message=get_formatter(settings).format(structured, template_message),
        generated_at=datetime.now(UTC),
    )


def format_indonesian(
    route_name: str, overall: TrafficStatus, traffic: list, pothole_count: int
) -> str:
    if overall == TrafficStatus.LANCAR:
        lines = [f"✅ {route_name} saat ini relatif lancar."]
    else:
        icon = "🚦"
        lines = [f"{icon} Info {route_name.lower()}", ""]
        for item in traffic:
            if item.traffic_status != TrafficStatus.LANCAR:
                trend = {
                    "MENINGKAT": " Volume kendaraan sedang meningkat.",
                    "MENURUN": " Volume kendaraan mulai menurun.",
                    "STABIL": " Volume kendaraan relatif stabil.",
                }[item.trend]
                lines.append(f"{item.road_name} sedang {item.traffic_status.value.lower()}.{trend}")
    if pothole_count:
        lines.extend(["", f"Ada {pothole_count} titik jalan berlubang yang terdata di rute kamu."])
    lines.extend(["", "Hati-hati di jalan. Kondisi lalu lintas dapat berubah selama perjalanan."])
    return "\n".join(lines)
