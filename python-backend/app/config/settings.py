"""
Centralised application settings loaded from environment variables.
All constants live here — never scatter magic values across files.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── MongoDB ───────────────────────────────────────────────────────────────
    MONGO_URI: str
    DB_NAME: str = "student-task-tracker"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24  # 1 day

    # ── CORS ──────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Server ────────────────────────────────────────────────────────────────
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    # ── File uploads ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 5

    # ── Field length limits ───────────────────────────────────────────────────
    MAX_TITLE_LEN: int = 120
    MAX_SUBJECT_LEN: int = 60
    MAX_DESCRIPTION_LEN: int = 500
    MAX_NAME_LEN: int = 80

    # ── Pagination ────────────────────────────────────────────────────────────
    PAGINATION_DEFAULT_LIMIT: int = 20
    PAGINATION_MAX_LIMIT: int = 50

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere instead of Settings()."""
    return Settings()
