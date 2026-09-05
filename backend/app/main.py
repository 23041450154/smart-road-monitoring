from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.seed import seed_demo
from app.db.session import SessionLocal, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
        if settings.demo_mode:
            with SessionLocal() as session:
                seed_demo(session)

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

