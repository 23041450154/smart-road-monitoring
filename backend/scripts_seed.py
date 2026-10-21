from app.core.security import get_password_hash
from app.db.base import Base
from app.db.seed import seed_demo
from app.db.session import SessionLocal, engine
from app.models import User, UserRole
from app.models.entities import utcnow
from sqlalchemy import select

if __name__ == "__main__":
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_demo(session)
        demo_accounts = [
            {
                "name": "Dosen Penguji (User)",
                "email": "user@test.com",
                "password": "test",
                "role": UserRole.USER,
                "phone": "081234567890",
            },
            {
                "name": "Dosen Penguji (Admin)",
                "email": "admin@test.com",
                "password": "test",
                "role": UserRole.ADMIN,
                "phone": "081112223334",
            },
            {
                "name": "Pengguna Demo",
                "email": "demo@test.com",
                "password": "test",
                "role": UserRole.USER,
                "phone": "081234567891",
            },
            {
                "name": "Administrator",
                "email": "admin@naufal.me",
                "password": "Garena123",
                "role": UserRole.ADMIN,
                "phone": "081112223334",
            },
            {
                "name": "Pengguna Demo Lokal",
                "email": "demo@example.local",
                "password": "demo123",
                "role": UserRole.USER,
                "phone": "081234567890",
            },
        ]

        for item in demo_accounts:
            target = session.scalar(select(User).where(User.email == item["email"]))
            if not target:
                target = User(
                    name=item["name"],
                    email=item["email"],
                    hashed_password=get_password_hash(item["password"]),
                    role=item["role"],
                    phone_number=item["phone"],
                    wa_notifications_enabled=True,
                    notification_lead_minutes=5,
                    is_verified=True,
                    created_at=utcnow(),
                )
                session.add(target)
            else:
                target.hashed_password = get_password_hash(item["password"])
                target.role = item["role"]
                target.is_verified = True

        session.commit()
    try:
        from sync_all_palembang_cctv import sync_all
        sync_all()
    except Exception as e:
        print(f"[DATABASE] CCTV sync error: {e}")
    print("[DATABASE] demo_seed_complete")

