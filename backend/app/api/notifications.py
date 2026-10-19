from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import Route, TrafficStatus, User, UserRole
from app.schemas.api import UpcomingBriefingItem, WhatsAppTestResponse
from app.services.briefing import build_briefing

router = APIRouter(prefix="/notifications", tags=["notifications"])

JAKARTA_TZ = ZoneInfo("Asia/Jakarta")


def format_whatsapp_briefing(
    user_name: str,
    route_name: str,
    scheduled_time_str: str,
    lead_minutes: int,
    briefing,
) -> str:
    """Formats a concise WhatsApp message formatted with WA markdown (*bold*, _italic_)."""
    status_emoji = {
        TrafficStatus.LANCAR: "🟢 *LANCAR*",
        TrafficStatus.SEDANG: "🟡 *SEDANG*",
        TrafficStatus.PADAT: "🟠 *PADAT*",
        TrafficStatus.MACET: "🔴 *MACET*",
    }.get(briefing.overall_status, "⚪ *NORMAL*")

    lead_header = (
        f"Halo *{user_name}*! Pengingat otomatis {lead_minutes} menit "
        f"sebelum estimasi perjalanan Anda (*{scheduled_time_str} WIB*)."
    )

    lines = [
        "🚨 *LAJU — NOTIFIKASI RUTE PERJALANAN*",
        lead_header,
        "",
        f"📍 *Rute:* {route_name}",
        f"🚦 *Kondisi Koridor:* {status_emoji}",
        "",
        "📊 *Pantauan Titik Kamera:*",
    ]

    if briefing.traffic:
        for t in briefing.traffic:
            traffic_text = (
                f"• *{t.road_name}*: {t.traffic_status.value} "
                f"({t.vehicles_per_minute} kend./menit, tren {t.trend.lower()})"
            )
            lines.append(traffic_text)
    else:
        lines.append("• Belum ada kamera sensor aktif di koridor ini.")

    if briefing.potholes:
        lines.append("")
        lines.append(
            f"⚠️ *Perhatian:* Terdeteksi *{len(briefing.potholes)} titik jalan berlubang* "
            "di sepanjang rute. Harap kurangi kecepatan berkendara."
        )

    lines.append("")
    if briefing.overall_status == TrafficStatus.MACET:
        lines.append(
            "💡 *Saran:* Lalu lintas sangat padat. Pertimbangkan berangkat lebih awal "
            "atau mencari rute alternatif."
        )
    elif briefing.overall_status == TrafficStatus.PADAT:
        lines.append(
            "💡 *Saran:* Kepadatan mulai meningkat di beberapa persimpangan. "
            "Waspada perlambatan laju kendaraan."
        )
    else:
        lines.append(
            "💡 *Saran:* Jalur relatif kondusif. Tetap patuhi rambu lalu lintas "
            "dan berkendara dengan aman."
        )

    lines.append("")
    lines.append("— _Sistem Pemantauan Cerdas Lalu Lintas Palembang (LAJU)_")
    return "\n".join(lines)


@router.get("/config")
async def get_notification_config(settings: Settings = Depends(get_settings)):
    now = datetime.now(JAKARTA_TZ)
    return {
        "timezone": "Asia/Jakarta",
        "current_time": now.strftime("%H:%M:%S"),
        "default_lead_minutes": 5,
        "whatsapp_channel_ready": True,
        "demo_mode": settings.demo_mode,
    }


@router.get("/upcoming-briefings", response_model=list[UpcomingBriefingItem])
async def get_upcoming_briefings(
    minutes_ahead: int = Query(
        default=5,
        ge=1,
        le=60,
        description="Filter rute yang jadwalnya dalam N menit ke depan",
    ),
    force_all: bool = Query(
        default=False,
        description="Sertakan seluruh rute aktif pengguna yang memiliki nomor WhatsApp",
    ),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[UpcomingBriefingItem]:
    """Endpoint bot WA / n8n / cron untuk mengambil notifikasi rute 5 menit sebelum rute."""
    now = datetime.now(JAKARTA_TZ)
    now_minutes = now.hour * 60 + now.minute

    routes = list(
        db.scalars(
            select(Route)
            .join(User, Route.user_id == User.id)
            .where(
                Route.is_active.is_(True),
                User.wa_notifications_enabled.is_(True),
                User.phone_number.isnot(None),
            )
        )
    )

    results: list[UpcomingBriefingItem] = []
    for route in routes:
        user = route.user
        if not user or not user.phone_number:
            continue

        lead_min = user.notification_lead_minutes or minutes_ahead

        # Determine target departure time
        if route.notification_time:
            route_hour = route.notification_time.hour
            route_minute = route.notification_time.minute
        elif route.route_type.value == "commute_to_work":
            route_hour, route_minute = 6, 45
        elif route.route_type.value == "commute_home":
            route_hour, route_minute = 16, 45
        else:
            route_hour, route_minute = 7, 0

        route_sched_minutes = route_hour * 60 + route_minute
        time_diff = route_sched_minutes - now_minutes

        # In force_all mode, we include all routes for testing purposes.
        # Otherwise, check if departure is within lead_min window (e.g. 0 <= time_diff <= lead_min)
        is_due = force_all or (0 <= time_diff <= lead_min)

        if is_due:
            briefing = build_briefing(db, route, settings)
            time_str = f"{route_hour:02d}:{route_minute:02d}"
            msg = format_whatsapp_briefing(
                user_name=user.name,
                route_name=route.name,
                scheduled_time_str=time_str,
                lead_minutes=lead_min,
                briefing=briefing,
            )
            results.append(
                UpcomingBriefingItem(
                    user_id=user.id,
                    user_name=user.name,
                    phone_number=user.phone_number,
                    route_id=route.id,
                    route_name=route.name,
                    scheduled_time=time_str,
                    notification_lead_minutes=lead_min,
                    minutes_until_departure=max(0, time_diff) if not force_all else lead_min,
                    overall_status=briefing.overall_status,
                    message=msg,
                    send_ready=bool(user.phone_number),
                )
            )

    return results


@router.post("/test-whatsapp/{route_id}", response_model=WhatsAppTestResponse)
async def test_whatsapp_notification(
    route_id: int,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> WhatsAppTestResponse:
    """Simulasi pengiriman notifikasi WhatsApp 5 menit sebelum keberangkatan rute."""
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Rute tidak ditemukan.")

    user = route.user
    if not user:
        if current_user:
            user = current_user
        else:
            user = db.scalar(select(User).limit(1))

    # Security check: if current user is logged in, ensure they own the route or are admin
    if current_user and current_user.role != UserRole.ADMIN and current_user.id != route.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda hanya dapat menguji notifikasi rute milik Anda sendiri.",
        )

    briefing = build_briefing(db, route, settings)

    if route.notification_time:
        time_str = route.notification_time.strftime("%H:%M")
    else:
        time_str = "07:00"

    lead_min = (user.notification_lead_minutes if user else 5) or 5
    user_name = user.name if user else "Pengguna"
    phone = user.phone_number if user else "6281234567890"

    msg = format_whatsapp_briefing(
        user_name=user_name,
        route_name=route.name,
        scheduled_time_str=time_str,
        lead_minutes=lead_min,
        briefing=briefing,
    )

    return WhatsAppTestResponse(
        route_id=route.id,
        route_name=route.name,
        recipient_name=user_name,
        recipient_phone=phone,
        overall_status=briefing.overall_status,
        message=msg,
        delivery_channel="whatsapp",
        simulated_status="delivered_to_outbox",
    )
