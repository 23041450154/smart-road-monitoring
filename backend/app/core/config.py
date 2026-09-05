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

