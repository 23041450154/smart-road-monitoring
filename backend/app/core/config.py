from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Smart Road Monitoring API"
    app_env: str = "development"
    demo_mode: bool = True
    database_url: str = "sqlite:///./smartroad.db"
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

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
