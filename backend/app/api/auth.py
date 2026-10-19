from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import Route, User, UserRole
from app.models.entities import utcnow
from app.schemas.api import TokenResponse, UserLogin, UserRead, UserRegister, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    if cleaned.startswith("08"):
        cleaned = "628" + cleaned[2:]
    elif cleaned.startswith("+62"):
        cleaned = "62" + cleaned[3:]
    return cleaned


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenResponse:
    normalized_email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alamat email sudah terdaftar. Silakan masuk.",
        )

    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.USER,
        phone_number=normalize_phone(payload.phone_number),
        wa_notifications_enabled=True,
        notification_lead_minutes=5,
        created_at=utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    user_read = UserRead.model_validate(user)
    user_read.routes_count = 0
    return TokenResponse(access_token=token, token_type="bearer", user=user_read)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    normalized_email = payload.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password yang Anda masukkan salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.id, role=user.role.value)
    routes_count = db.scalar(
        select(func.count(Route.id)).where(Route.user_id == user.id)
    ) or 0

    user_read = UserRead.model_validate(user)
    user_read.routes_count = routes_count
    return TokenResponse(access_token=token, token_type="bearer", user=user_read)


@router.get("/me", response_model=UserRead)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    routes_count = db.scalar(
        select(func.count(Route.id)).where(Route.user_id == current_user.id)
    ) or 0
    user_read = UserRead.model_validate(current_user)
    user_read.routes_count = routes_count
    return user_read


@router.put("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.phone_number is not None:
        current_user.phone_number = normalize_phone(payload.phone_number)
    if payload.wa_notifications_enabled is not None:
        current_user.wa_notifications_enabled = payload.wa_notifications_enabled
    if payload.notification_lead_minutes is not None:
        current_user.notification_lead_minutes = payload.notification_lead_minutes

    db.commit()
    db.refresh(current_user)

    routes_count = db.scalar(
        select(func.count(Route.id)).where(Route.user_id == current_user.id)
    ) or 0
    user_read = UserRead.model_validate(current_user)
    user_read.routes_count = routes_count
    return user_read
