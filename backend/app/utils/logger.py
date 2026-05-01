"""
Centralised logging configuration.

Format (development):
  2024-01-15 12:34:56 | INFO     | app.api.task | [req-abc123] POST /api/tasks → 201 (45.2ms)

Format (production):
  2024-01-15 12:34:56 | WARNING  | app.services.auth_service | Login failed for user@example.com

Usage:
    from app.utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Task created", extra={"request_id": rid, "user_id": uid})

The request_id is injected automatically by the RequestIDMiddleware in main.py
via a logging Filter — you never need to pass it manually in service code.
"""
import logging
import sys
from app.config.settings import get_settings

settings = get_settings()

# ── Log record filter that injects request_id ─────────────────────────────────
class _RequestIDFilter(logging.Filter):
    """
    Adds a `request_id` attribute to every LogRecord so the formatter
    can reference %(request_id)s without KeyError.
    The actual value is set on the record by the middleware via
    `logging.LoggerAdapter` or by passing extra={"request_id": ...}.
    Falls back to "-" when no request context is active.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = "-"  # type: ignore[attr-defined]
        return True


# ── Formatters ────────────────────────────────────────────────────────────────
_FMT_DEV  = "%(asctime)s | %(levelname)-8s | %(name)s | [%(request_id)s] %(message)s"
_FMT_PROD = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FMT = "%Y-%m-%d %H:%M:%S"


def _build_handler(fmt: str) -> logging.StreamHandler:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt, datefmt=_DATE_FMT))
    handler.addFilter(_RequestIDFilter())
    return handler


def configure_logging() -> None:
    """
    Call once at application startup (inside lifespan).
    Uses settings.effective_log_level so production automatically gets WARNING.
    """
    level_str = settings.effective_log_level
    level     = getattr(logging, level_str.upper(), logging.INFO)
    fmt       = _FMT_PROD if settings.is_production else _FMT_DEV

    root = logging.getLogger()
    root.setLevel(level)

    # Avoid duplicate handlers if called more than once (e.g. during tests)
    if not root.handlers:
        root.addHandler(_build_handler(fmt))
    else:
        # Update existing handlers' formatter and filter in case of reload
        for h in root.handlers:
            h.setFormatter(logging.Formatter(fmt, datefmt=_DATE_FMT))
            # Add filter only if not already present
            if not any(isinstance(f, _RequestIDFilter) for f in h.filters):
                h.addFilter(_RequestIDFilter())

    # Quieten noisy third-party loggers in production
    if settings.is_production:
        for noisy in ("motor", "pymongo", "uvicorn.access"):
            logging.getLogger(noisy).setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        f"Logging configured: level={level_str} env={settings.ENVIRONMENT}"
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Pass __name__ from the calling module."""
    return logging.getLogger(name)
