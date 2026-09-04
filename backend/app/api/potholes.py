from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.geometry import database_geometry, point_wkt
from app.db.session import get_db
from app.models import Pothole
from app.pothole.deduplication import find_duplicate
from app.schemas.api import PotholeCreate, PotholeRead

router = APIRouter(prefix="/potholes", tags=["potholes"])


@router.post("", response_model=PotholeRead, status_code=201)
async def create_pothole(
    payload: PotholeCreate,
    deduplicate: bool = Query(default=True),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Pothole:
    if deduplicate:
        duplicate = find_duplicate(
            db, payload.latitude, payload.longitude, settings.pothole_duplicate_radius_meters
        )
        if duplicate:
            return duplicate
    data = payload.model_dump(exclude={"detected_at"}, exclude_none=True)
    pothole = Pothole(
        **data,
        location=database_geometry(db, point_wkt(payload.latitude, payload.longitude)),
    )
    if payload.detected_at:
        pothole.detected_at = payload.detected_at
    db.add(pothole)
    db.commit()
    db.refresh(pothole)
    return pothole


@router.get("", response_model=list[PotholeRead])
async def list_potholes(db: Session = Depends(get_db)) -> list[Pothole]:
    return list(db.scalars(select(Pothole).order_by(Pothole.detected_at.desc())))


@router.get("/{pothole_id}", response_model=PotholeRead)
async def get_pothole(pothole_id: int, db: Session = Depends(get_db)) -> Pothole:
    pothole = db.get(Pothole, pothole_id)
    if pothole is None:
        raise HTTPException(status_code=404, detail="Pothole not found")
    return pothole
