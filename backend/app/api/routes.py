from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.geometry import database_geometry, line_wkt
from app.db.session import get_db
from app.models import Pothole, Route, User
from app.routing.spatial import cameras_near_route, potholes_near_route
from app.schemas.api import Briefing, PotholeRead, RouteCreate, RouteRead, RouteTraffic, RouteUpdate
from app.services.briefing import build_briefing
from app.traffic.analytics import camera_metrics

router = APIRouter(prefix="/routes", tags=["routes"])


def route_or_404(db: Session, route_id: int) -> Route:
    route = db.get(Route, route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


def ensure_user(db: Session, user_id: int) -> None:
    if db.get(User, user_id) is None:
        raise HTTPException(status_code=422, detail="User does not exist")


@router.post("", response_model=RouteRead, status_code=201)
async def create_route(payload: RouteCreate, db: Session = Depends(get_db)) -> Route:
    ensure_user(db, payload.user_id)
    route = Route(
        **payload.model_dump(),
        geometry=database_geometry(db, line_wkt(payload.path)),
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@router.get("", response_model=list[RouteRead])
async def list_routes(db: Session = Depends(get_db)) -> list[Route]:
    return list(db.scalars(select(Route).order_by(Route.created_at.desc())))


@router.get("/{route_id}", response_model=RouteRead)
async def get_route(route_id: int, db: Session = Depends(get_db)) -> Route:
    return route_or_404(db, route_id)


@router.put("/{route_id}", response_model=RouteRead)
async def update_route(route_id: int, payload: RouteUpdate, db: Session = Depends(get_db)) -> Route:
    route = route_or_404(db, route_id)
    ensure_user(db, payload.user_id)
    for field, value in payload.model_dump().items():
        setattr(route, field, value)
    route.geometry = database_geometry(db, line_wkt(payload.path))
    db.commit()
    db.refresh(route)
    return route


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(route_id: int, db: Session = Depends(get_db)) -> Response:
    db.delete(route_or_404(db, route_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{route_id}/traffic", response_model=RouteTraffic)
async def route_traffic(
    route_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RouteTraffic:
    route = route_or_404(db, route_id)
    return RouteTraffic(
        route=RouteRead.model_validate(route),
        cameras=[
            camera_metrics(db, item)
            for item in cameras_near_route(db, route, settings.camera_route_buffer_meters)
        ],
    )


@router.get("/{route_id}/potholes", response_model=list[PotholeRead])
async def route_potholes(
    route_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[Pothole]:
    return potholes_near_route(db, route_or_404(db, route_id), settings.pothole_route_buffer_meters)


@router.get("/{route_id}/briefing", response_model=Briefing)
async def route_briefing(
    route_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Briefing:
    return build_briefing(db, route_or_404(db, route_id), settings)
