from app.db.base import Base
from app.db.seed import seed_demo
from app.db.session import SessionLocal, engine

if __name__ == "__main__":
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_demo(session)
    try:
        from sync_all_palembang_cctv import sync_all
        sync_all()
    except Exception as e:
        print(f"[DATABASE] CCTV sync error: {e}")
    print("[DATABASE] demo_seed_complete")

