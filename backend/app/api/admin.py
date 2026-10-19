from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import Camera, Route, User
from app.schemas.api import UserRead, UserRoleUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStats(BaseModel):
    total_users: int
    users_with_whatsapp: int
    total_routes: int
    active_cameras: int


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

    return AdminStats(
        total_users=total_users,
        users_with_whatsapp=users_with_whatsapp,
        total_routes=total_routes,
        active_cameras=active_cameras,
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
