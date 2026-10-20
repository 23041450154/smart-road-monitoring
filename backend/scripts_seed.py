from app.core.security import get_password_hash
from app.db.base import Base
from app.db.seed import seed_demo
from app.db.session import SessionLocal, engine
from app.models import User, UserRole
from sqlalchemy import select

if __name__ == "__main__":
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_demo(session)
        admin = session.scalar(select(User).where(User.email == "admin@naufal.me"))
        if not admin:
            old_admin = session.scalar(select(User).where(User.email == "admin@smartroad.local"))
            if old_admin:
                old_admin.name = "Administrator"
                old_admin.email = "admin@naufal.me"
                old_admin.hashed_password = get_password_hash("Garena123")
                old_admin.role = UserRole.ADMIN
                old_admin.is_verified = True
            else:
                admin = User(
                    name="Administrator",
                    email="admin@naufal.me",
                    hashed_password=get_password_hash("Garena123"),
                    role=UserRole.ADMIN,
                    phone_number="081112223334",
                    wa_notifications_enabled=True,
                    notification_lead_minutes=5,
                    is_verified=True,
                )
                session.add(admin)
        else:
            admin.hashed_password = get_password_hash("Garena123")
            admin.role = UserRole.ADMIN
            admin.is_verified = True
        session.commit()
    try:
        from sync_all_palembang_cctv import sync_all
        sync_all()
    except Exception as e:
        print(f"[DATABASE] CCTV sync error: {e}")
    print("[DATABASE] demo_seed_complete")

