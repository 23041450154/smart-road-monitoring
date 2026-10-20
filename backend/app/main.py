from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text

from app.api.router import api_router
from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.seed import seed_demo
from app.db.session import SessionLocal, engine
from app.models import User, UserRole
from app.models.entities import utcnow


def ensure_sqlite_schema(db_engine):
    with db_engine.connect() as conn:
        cursor = conn.execute(text("PRAGMA table_info(users)"))
        existing_cols = {row[1] for row in cursor.fetchall()}
        if existing_cols:
            if "hashed_password" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)"))
            if "role" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'"))
            if "phone_number" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR(32)"))
            if "wa_notifications_enabled" not in existing_cols:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN wa_notifications_enabled BOOLEAN DEFAULT 1")
                )
            if "notification_lead_minutes" not in existing_cols:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN notification_lead_minutes INTEGER DEFAULT 5")
                )
            conn.execute(text("UPDATE users SET role = 'user' WHERE role = 'USER' OR role IS NULL"))
            conn.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
        ensure_sqlite_schema(engine)

    if settings.demo_mode:
        with SessionLocal() as session:
            seed_demo(session)
            # Ensure demo & admin users exist with valid passwords and roles
            demo_user = session.scalar(
                select(User).where(User.email == "demo@example.local")
            )
            if demo_user:
                if not demo_user.hashed_password:
                    demo_user.hashed_password = get_password_hash("demo123")
                if not demo_user.phone_number:
                    demo_user.phone_number = "081234567890"
                if not demo_user.role:
                    demo_user.role = UserRole.USER
            admin_user = session.scalar(
                select(User).where(User.email == "admin@naufal.me")
            )
            if not admin_user:
                old_admin = session.scalar(
                    select(User).where(User.email == "admin@smartroad.local")
                )
                if old_admin:
                    old_admin.name = "Administrator"
                    old_admin.email = "admin@naufal.me"
                    old_admin.hashed_password = get_password_hash("Garena123")
                    old_admin.role = UserRole.ADMIN
                    old_admin.is_verified = True
                else:
                    admin_user = User(
                        name="Administrator",
                        email="admin@naufal.me",
                        hashed_password=get_password_hash("Garena123"),
                        role=UserRole.ADMIN,
                        phone_number="081112223334",
                        wa_notifications_enabled=True,
                        notification_lead_minutes=5,
                        is_verified=True,
                        created_at=utcnow(),
                    )
                    session.add(admin_user)
            else:
                admin_user.hashed_password = get_password_hash("Garena123")
                admin_user.role = UserRole.ADMIN
                admin_user.is_verified = True
            session.commit()

    # Warm up YOLO model asynchronously at startup
    try:
        from vision.traffic_worker.tracking import YoloByteTrackProcessor

        model_p = PROJECT_ROOT / "yolo11n.pt"
        if model_p.exists():
            YoloByteTrackProcessor(model_path=str(model_p))
    except Exception:
        pass

    yield


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Deterministic traffic and road-condition API for the Palembang capstone demo.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
evidence_dir = PROJECT_ROOT / "vision" / "evidence"
evidence_dir.mkdir(parents=True, exist_ok=True)
app.mount("/evidence", StaticFiles(directory=str(evidence_dir)), name="evidence")



@app.get("/health")
async def health() -> dict[str, str | bool]:
    return {"status": "ok", "service": "smart-road-api", "demo_mode": settings.demo_mode}

