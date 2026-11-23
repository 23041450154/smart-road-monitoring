from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.base import Base

settings = get_settings()
is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {"connect_timeout": 5}
engine_kwargs = (
    {"connect_args": connect_args}
    if is_sqlite
    else {
        "connect_args": connect_args,
        "pool_size": 15,
        "max_overflow": 20,
        "pool_recycle": 300,
    }
)
engine = create_engine(settings.database_url, pool_pre_ping=True, **engine_kwargs)

if engine.dialect.name == "sqlite":
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

if engine.dialect.name == "sqlite" and not settings.database_url.endswith((":memory:", "sqlite://")):
    Base.metadata.create_all(bind=engine)

if not settings.database_url.endswith((":memory:", "sqlite://")):
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_traffic_snapshots_cam_ts "
                    "ON traffic_snapshots (camera_id, timestamp)"
                )
            )
    except Exception:
        pass


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session

