"""
Centralised application settings loaded from environment variables.
All constants live here — never scatter magic values across files.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── MongoDB ───────────────────────────────────────────────────────────────
    MONGO_URI: str
    DB_NAME: str = "scholaros"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24  # 1 day

    # ── CORS ──────────────────────────────────────────────────────────────────
    # In production set this to your exact frontend domain, e.g.:
    #   FRONTEND_URL=https://your-app.vercel.app
    # In development the middleware also allows localhost:3000 and :5173.
    FRONTEND_URL: str = "http://localhost:3002"

    # ── Server ────────────────────────────────────────────────────────────────
    PORT: int = 5000
    ENVIRONMENT: str = "development"   # "development" | "production"

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

    # ── Logging ───────────────────────────────────────────────────────────────
    # Overridden automatically based on ENVIRONMENT if not set explicitly.
    LOG_LEVEL: str = "INFO"   # DEBUG | INFO | WARNING | ERROR | CRITICAL

    # ── Rate limiting (auth endpoints) ────────────────────────────────────────
    # Format accepted by slowapi: "5/minute", "10/minute", etc.
    AUTH_RATE_LIMIT: str = "5/minute"
    DEV_AUTH_RATE_LIMIT: str = "100/minute"

    # ── Dashboard / summary cache ─────────────────────────────────────────────
    CACHE_TTL_SECONDS: int = 60   # How long task-summary results are cached per user

    # ── AI Grading ────────────────────────────────────────────────────────────
    # Get your key at: https://aistudio.google.com/app/apikey
    GEMINI_API_KEY: str | None = None

    # ── Alerting (optional) ───────────────────────────────────────────────────
    ALERT_WEBHOOK_URL: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    # ── Derived helpers (not env vars) ────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        valid_envs = {"development", "production"}
        env = self.ENVIRONMENT.lower()
        if env not in valid_envs:
            # Fallback to development if garbage is passed via ENV
            return False
        return env == "production"

    @property
    def effective_log_level(self) -> str:
        """Return WARNING in production unless LOG_LEVEL is explicitly overridden."""
        if self.is_production and self.LOG_LEVEL == "INFO":
            return "WARNING"
        return self.LOG_LEVEL

    @property
    def cors_origins(self) -> list[str]:
        """
        Production: only the configured FRONTEND_URL.
        Development: also allow the two common Vite dev-server ports.
        """
        if self.is_production:
            return [self.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"]
        return list({self.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"})


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere instead of Settings()."""
    return Settings()
