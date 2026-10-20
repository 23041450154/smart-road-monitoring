from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Smart Road Monitoring API"
    app_env: str = "development"
    demo_mode: bool = True
    database_url: str = f"sqlite:///{BACKEND_DIR / 'smartroad.db'}"
    cors_origins: str = "http://localhost:3000"
    camera_route_buffer_meters: float = 500
    pothole_route_buffer_meters: float = 100
    pothole_duplicate_radius_meters: float = 10
    briefing_mode: str = "template"
    llm_api_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    jwt_secret: str = "smart-road-monitoring-jwt-super-secret-key-32chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    google_client_id: str | None = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_name: str = "Smart Road Palembang (LAJU)"
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    email_verification_expire_minutes: int = 15

    @property
    def sender_email(self) -> str:
        return self.smtp_from_email or self.smtp_user or "no-reply@smartroad.local"

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_sqlite_url(cls, value: str) -> str:
        if isinstance(value, str) and value.startswith("sqlite:///./"):
            relative_path = value[len("sqlite:///./") :]
            return f"sqlite:///{BACKEND_DIR / relative_path}"
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

