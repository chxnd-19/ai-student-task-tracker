"""
Lightweight in-memory TTL cache.

Designed for short-lived, per-user dashboard data (task summary counts).
Not a replacement for Redis — use this only for single-process deployments.

Usage:
    from app.utils.cache import DashboardCache
    cache = DashboardCache()                    # one instance per module

    cache.set("user_123", {"pending": 2, ...})
    result = cache.get("user_123")              # None if expired or missing
    cache.invalidate("user_123")                # call after task create/update/delete
    cache.clear()                               # wipe everything (e.g. on shutdown)
"""
import time
import threading
from typing import Any

from app.config.settings import get_settings

settings = get_settings()


class TTLCache:
    """
    Thread-safe in-memory key→value store with per-entry TTL.

    Parameters
    ----------
    ttl : int
        Seconds before a cached entry is considered stale.
    """

    def __init__(self, ttl: int | None = None) -> None:
        self._ttl   = ttl if ttl is not None else settings.CACHE_TTL_SECONDS
        self._store: dict[str, tuple[Any, float]] = {}   # key → (value, expires_at)
        self._lock  = threading.Lock()

    # ── Public API ────────────────────────────────────────────────────────────

    def get(self, key: str) -> Any | None:
        """Return the cached value, or None if missing / expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Store a value with the configured TTL."""
        _ttl = ttl if ttl is not None else self._ttl
        with self._lock:
            self._store[key] = (value, time.monotonic() + _ttl)

    def invalidate(self, key: str) -> None:
        """Remove a single entry (e.g. after a mutation)."""
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        """Remove all entries whose key starts with `prefix`."""
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]

    def clear(self) -> None:
        """Wipe the entire cache."""
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        """Return the number of live (non-expired) entries."""
        now = time.monotonic()
        with self._lock:
            return sum(1 for _, (_, exp) in self._store.items() if now <= exp)


# ── Module-level singleton used by task_service ───────────────────────────────
# Import this instance directly:
#   from app.utils.cache import summary_cache
summary_cache = TTLCache()
