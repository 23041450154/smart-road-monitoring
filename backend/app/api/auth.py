from datetime import timedelta
import secrets

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import EmailVerification, Route, User, UserRole
from app.models.entities import utcnow
from app.schemas.api import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResetPasswordRequest,
    SendOtpRequest,
    SendOtpResponse,
    TokenResponse,
    UserLogin,
    UserRead,
    UserRegister,
    UserUpdate,
    VerifyRegistrationRequest,
)
from app.services.email import send_verification_email

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


def generate_otp() -> str:
    """Generates a random 6-digit numeric OTP code."""
    return f"{secrets.randbelow(900000) + 100000}"


@router.post("/send-verification-otp", response_model=SendOtpResponse)
async def send_verification_otp(
    payload: SendOtpRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> SendOtpResponse:
    settings = get_settings()
    normalized_email = payload.email.strip().lower()

    # Check if already registered
    existing_user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alamat email sudah terdaftar. Silakan masuk.",
        )

    # Invalidate existing unused codes for this email
    prev_codes = db.scalars(
        select(EmailVerification).where(
            EmailVerification.email == normalized_email,
            EmailVerification.is_used == False,
        )
    ).all()
    for prev in prev_codes:
        prev.is_used = True

    # Generate fresh 6-digit OTP code
    code = generate_otp()
    expires_at = utcnow() + timedelta(minutes=settings.email_verification_expire_minutes)

    verification = EmailVerification(
        email=normalized_email,
        code=code,
        expires_at=expires_at,
        is_used=False,
        created_at=utcnow(),
    )
    db.add(verification)
    db.commit()

    # Send OTP in background so user transitions instantly to OTP verification without delay
    background_tasks.add_task(
        send_verification_email,
        to_email=normalized_email,
        code=code,
        user_name=payload.name,
    )

    dev_otp = code if (settings.demo_mode and not settings.smtp_user) else None

    return SendOtpResponse(
        message=f"Kode verifikasi telah dikirim ke {normalized_email}",
        email=normalized_email,
        expires_in_minutes=settings.email_verification_expire_minutes,
        dev_otp=dev_otp,
    )


@router.post(
    "/verify-registration", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def verify_registration(
    payload: VerifyRegistrationRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    normalized_email = payload.email.strip().lower()

    # Check if already registered
    existing_user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alamat email sudah terdaftar. Silakan masuk.",
        )

    # Find latest active OTP
    verification = db.scalar(
        select(EmailVerification)
        .where(
            EmailVerification.email == normalized_email,
            EmailVerification.is_used == False,
            EmailVerification.expires_at > utcnow(),
        )
        .order_by(EmailVerification.id.desc())
    )

    if not verification or verification.code.strip() != payload.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode verifikasi tidak valid atau telah kedaluwarsa. Silakan periksa kembali atau minta kode baru.",
        )

    verification.is_used = True

    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.USER,
        phone_number=normalize_phone(payload.phone_number),
        wa_notifications_enabled=True,
        notification_lead_minutes=5,
        is_verified=True,
        created_at=utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    user_read = UserRead.model_validate(user)
    user_read.routes_count = 0
    return TokenResponse(access_token=token, token_type="bearer", user=user_read)


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


@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> TokenResponse:
    settings = get_settings()

    # Allow simulation for demo / development test suites without Google network dependency
    if settings.demo_mode and payload.credential.startswith("mock-google-"):
        parts = payload.credential.split(":", 2)
        demo_email = parts[1] if len(parts) > 1 else "google_demo@example.com"
        demo_name = parts[2] if len(parts) > 2 else "Pengguna Google Demo"
        google_data = {
            "email": demo_email,
            "email_verified": "true",
            "name": demo_name,
            "aud": settings.google_client_id or "demo-client-id",
        }
    else:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": payload.credential},
                )
                if resp.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token autentikasi Google tidak valid atau telah kedaluwarsa.",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                google_data = resp.json()
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Tidak dapat terhubung ke server autentikasi Google: {exc}",
            )

    # Validate audience if client ID is configured
    if settings.google_client_id and google_data.get("aud") != settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Google audience tidak sesuai dengan konfigurasi aplikasi.",
        )

    email = google_data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profil Google tidak memuat alamat email yang valid.",
        )

    # Ensure email is verified by Google
    email_verified = google_data.get("email_verified")
    if str(email_verified).lower() not in ("true", "1"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email akun Google belum diverifikasi oleh Google.",
        )

    normalized_email = email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))

    if not user:
        display_name = google_data.get("name") or normalized_email.split("@")[0]
        user = User(
            name=display_name.strip()[:120],
            email=normalized_email,
            hashed_password=None,
            role=UserRole.USER,
            phone_number=None,
            wa_notifications_enabled=True,
            notification_lead_minutes=5,
            created_at=utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

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


@router.post("/forgot-password", response_model=SendOtpResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> SendOtpResponse:
    settings = get_settings()
    normalized_email = payload.email.strip().lower()

    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alamat email tidak ditemukan atau belum terdaftar.",
        )

    # Invalidate previous unused OTP codes for this email
    prev_codes = db.scalars(
        select(EmailVerification).where(
            EmailVerification.email == normalized_email,
            EmailVerification.is_used == False,
        )
    ).all()
    for prev in prev_codes:
        prev.is_used = True

    code = generate_otp()
    expires_at = utcnow() + timedelta(minutes=settings.email_verification_expire_minutes)

    verification = EmailVerification(
        email=normalized_email,
        code=code,
        expires_at=expires_at,
        is_used=False,
        created_at=utcnow(),
    )
    db.add(verification)
    db.commit()

    background_tasks.add_task(
        send_verification_email,
        to_email=normalized_email,
        code=code,
        user_name=user.name,
        purpose="reset_password",
    )

    dev_otp = code if (settings.demo_mode and not settings.smtp_user) else None

    return SendOtpResponse(
        message=f"Kode reset kata sandi telah dikirim ke {normalized_email}",
        email=normalized_email,
        expires_in_minutes=settings.email_verification_expire_minutes,
        dev_otp=dev_otp,
    )


@router.post("/reset-password", response_model=TokenResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    normalized_email = payload.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alamat email tidak ditemukan.",
        )

    verification = db.scalar(
        select(EmailVerification)
        .where(
            EmailVerification.email == normalized_email,
            EmailVerification.is_used == False,
            EmailVerification.expires_at > utcnow(),
        )
        .order_by(EmailVerification.id.desc())
    )

    if not verification or verification.code.strip() != payload.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP reset tidak valid atau telah kedaluwarsa. Silakan minta kode baru.",
        )

    verification.is_used = True
    user.hashed_password = get_password_hash(payload.new_password)
    user.is_verified = True
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    routes_count = db.scalar(
        select(func.count(Route.id)).where(Route.user_id == user.id)
    ) or 0
    user_read = UserRead.model_validate(user)
    user_read.routes_count = routes_count
    return TokenResponse(access_token=token, token_type="bearer", user=user_read)


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if current_user.hashed_password:
        if not payload.current_password or not verify_password(
            payload.current_password, current_user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kata sandi saat ini tidak sesuai.",
            )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Kata sandi berhasil diperbarui."}
