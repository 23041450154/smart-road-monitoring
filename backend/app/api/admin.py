from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models import Camera, EmailVerification, Route, User
from app.models.entities import utcnow
from app.schemas.api import AdminUserCreate, AdminUserUpdate, UserRead, UserRoleUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStats(BaseModel):
    total_users: int
    users_with_whatsapp: int
    total_routes: int
    active_cameras: int
    verified_users: int = 0


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminStats:
    total_users = db.scalar(select(func.count(User.id))) or 0
    users_with_whatsapp = db.scalar(
        select(func.count(User.id)).where(
            User.phone_number.isnot(None),
            User.wa_notifications_enabled.is_(True),
        )
    ) or 0
    total_routes = db.scalar(select(func.count(Route.id))) or 0
    active_cameras = db.scalar(
        select(func.count(Camera.id)).where(Camera.is_active.is_(True))
    ) or 0
    verified_users = db.scalar(
        select(func.count(User.id)).where(User.is_verified.is_(True))
    ) or 0

    return AdminStats(
        total_users=total_users,
        users_with_whatsapp=users_with_whatsapp,
        total_routes=total_routes,
        active_cameras=active_cameras,
        verified_users=verified_users,
    )


@router.get("/users", response_model=list[UserRead])
async def list_users(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[UserRead]:
    users = list(db.scalars(select(User).order_by(User.created_at.desc())))
    result: list[UserRead] = []
    for user in users:
        count = db.scalar(select(func.count(Route.id)).where(Route.user_id == user.id)) or 0
        read = UserRead.model_validate(user)
        read.routes_count = count
        result.append(read)
    return result


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserRead:
    clean_email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == clean_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar dalam sistem.",
        )

    clean_phone = payload.phone_number.strip() if payload.phone_number else None
    user = User(
        name=payload.name.strip(),
        email=clean_email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        phone_number=clean_phone,
        wa_notifications_enabled=payload.wa_notifications_enabled,
        notification_lead_minutes=payload.notification_lead_minutes,
        is_verified=payload.is_verified,
        created_at=utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    read = UserRead.model_validate(user)
    read.routes_count = 0
    return read


@router.put("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan.")

    if payload.email is not None:
        clean_email = payload.email.strip().lower()
        if clean_email != (user.email or "").lower():
            conflict = db.scalar(select(User).where(User.email == clean_email))
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email sudah digunakan oleh akun lain.",
                )
            user.email = clean_email

    if payload.name is not None:
        user.name = payload.name.strip()

    if payload.role is not None:
        if user.id == current_admin.id and payload.role != current_admin.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Anda tidak dapat mengubah role akun Administrator Anda sendiri.",
            )
        user.role = payload.role

    if payload.phone_number is not None:
        clean_phone = payload.phone_number.strip()
        user.phone_number = clean_phone if clean_phone else None

    if payload.wa_notifications_enabled is not None:
        user.wa_notifications_enabled = payload.wa_notifications_enabled

    if payload.notification_lead_minutes is not None:
        user.notification_lead_minutes = payload.notification_lead_minutes

    if payload.is_verified is not None:
        if user.id == current_admin.id and not payload.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Anda tidak dapat menonaktifkan status verifikasi akun Anda sendiri.",
            )
        user.is_verified = payload.is_verified

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(user)

    routes_count = db.scalar(
        select(func.count(Route.id)).where(Route.user_id == user.id)
    ) or 0
    read = UserRead.model_validate(user)
    read.routes_count = routes_count
    return read


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan.")

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda tidak dapat menghapus akun Administrator Anda sendiri.",
        )

    user_name = user.name
    # Delete verification OTP records for this user
    if user.email:
        db.execute(
            delete(EmailVerification).where(EmailVerification.email == user.email)
        )

    db.delete(user)
    db.commit()
    return {"message": f"Pengguna '{user_name}' berhasil dihapus."}


@router.patch("/users/{user_id}/role", response_model=UserRead)
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan.")

    if user.id == current_admin.id and payload.role != current_admin.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda tidak dapat mengubah role akun Administrator Anda sendiri.",
        )

    user.role = payload.role
    db.commit()
    db.refresh(user)

    routes_count = db.scalar(
        select(func.count(Route.id)).where(Route.user_id == user.id)
    ) or 0
    read = UserRead.model_validate(user)
    read.routes_count = routes_count
    return read
