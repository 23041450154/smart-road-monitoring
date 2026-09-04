from app.db.seed import seed_demo
from app.db.session import SessionLocal

if __name__ == "__main__":
    with SessionLocal() as session:
        seed_demo(session)
    print("[DATABASE] demo_seed_complete")
