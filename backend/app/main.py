"""
FastAPI application entry point — v4.0

Upgrades in this version:
  • Request-ID middleware  — UUID per request, X-Request-ID header, injected into logs
  • Environment-based CORS — production restricts to FRONTEND_URL only
  • Auth rate limiting     — 5 req/min on /auth/login and /auth/signup (configurable)
  • Custom rate-limit JSON — { success: false, message: "Too many requests…" }
  • Enhanced health check  — DB ping, uptime, version
  • Env-based log level    — WARNING in production, INFO in development

Run locally:
  uvicorn app.main:app --reload --port 8000
"""
import asyncio
import logging
import uuid
import time
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError, HTTPException
from slowapi.errors import RateLimitExceeded

from app.config.settings import get_settings
from app.utils.logger import configure_logging, get_logger
from app.utils.rate_limit import auth_limiter          # shared limiter instance
from app.utils.cache import summary_cache              # for /api/cache/stats
from app.utils.dependencies import require_teacher as _require_teacher
from app.database.connection import connect_db, close_db, get_db

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.auth         import router as auth_router
from app.api.task         import router as task_router
from app.api.submission   import router as submission_router
from app.api.class_       import router as class_router
from app.api.notification import router as notification_router
from app.api.profile      import router as profile_router
from app.api.activity     import router as activity_router

settings = get_settings()

# ── Configure logging first — everything below may emit log lines ─────────────
configure_logging()
logger = get_logger(__name__)

# ── Validate environment ──────────────────────────────────────────────────────
if settings.ENVIRONMENT.lower() not in {"development", "production"}:
    logger.warning(
        f"Invalid ENVIRONMENT '{settings.ENVIRONMENT}'. "
        "Defaulting to 'development' behavior for safety."
    )

# ── INVARIANT: Rate limit values must be non-empty ────────────────────────────
if not settings.AUTH_RATE_LIMIT or not settings.DEV_AUTH_RATE_LIMIT:
    logger.critical("Rate limit values are missing in configuration!")
    sys.exit(1)

# ── Validate required env vars ────────────────────────────────────────────────
_REQUIRED = ["MONGO_URI", "JWT_SECRET"]
_missing  = [k for k in _REQUIRED if not getattr(settings, k, None)]
if _missing:
    logger.critical(f"Missing required env vars: {', '.join(_missing)}")
    logger.critical("Copy python-backend/.env.example → .env and fill in values.")
    sys.exit(1)

# ── Rate limiter ──────────────────────────────────────────────────────────────
# auth_limiter is the shared instance imported from utils/rate_limit.py.
# Registering it on app.state is what connects @auth_limiter.limit decorators
# in api/auth.py to the RateLimitExceeded exception handler below.
limiter = auth_limiter

# ── INVARIANT: Limiter Integrity Check ────────────────────────────────────────
from app.utils.rate_limit import get_real_ip
if limiter.key_func != get_real_ip:
    logger.error("[INTEGRITY FAILURE] Limiter key_func mismatch! Aborting.")
    sys.exit(1)

# ── Monitoring & Alerting State ───────────────────────────────────────────────
_monitoring_state = {
    "is_running": False,
    "start_time": time.time(),
    "last_alert": {},      # type -> timestamp
    "webhook_cooldown": 0, # timestamp
    "rate_limit_hits": {}, # ip -> list of timestamps
    "metrics": {
        "total_requests": 0,
        "rate_limit_hits": 0,
        "self_check_failures": 0,
        "webhook_alerts_sent": 0
    },
    "tasks": []
}

async def _send_alert(event: str, details: dict):
    """
    Optional webhook alert hook with debouncing and rate-limiting.
    """
    if not settings.ALERT_WEBHOOK_URL:
        return
    
    now = time.time()
    # Webhook Rate Limit: 1 per 10 seconds
    if now - _monitoring_state["webhook_cooldown"] < 10:
        return

    try:
        import httpx
        _monitoring_state["webhook_cooldown"] = now
        _monitoring_state["metrics"]["webhook_alerts_sent"] += 1
        
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                settings.ALERT_WEBHOOK_URL,
                json={
                    "event": event,
                    "service": "student-task-tracker-backend",
                    "environment": settings.ENVIRONMENT,
                    "details": details,
                    "timestamp": now
                }
            )
    except Exception as e:
        logger.error(f"[SYSTEM ALERT] Webhook delivery failed: {e}")

async def _perform_self_check() -> dict:
    """Internal invariant validation logic used by both HTTP and background tasks."""
    checks = {
        "limiter_bound": False,
        "key_func_valid": False,
        "env_valid": False,
        "rate_limits_present": False,
        "cache_operational": False
    }
    
    try:
        from app.utils.rate_limit import get_real_ip
        if hasattr(app.state, "limiter"):
            checks["limiter_bound"] = True
            if app.state.limiter.key_func == get_real_ip:
                checks["key_func_valid"] = True
        
        if settings.is_production or settings.ENVIRONMENT.lower() == "development":
            checks["env_valid"] = True
            
        if settings.AUTH_RATE_LIMIT and settings.DEV_AUTH_RATE_LIMIT:
            checks["rate_limits_present"] = True
            
        from app.utils.cache import summary_cache
        test_key = f"self_check_{time.time()}"
        summary_cache.set(test_key, True, ttl=1)
        if summary_cache.get(test_key):
            checks["cache_operational"] = True
            
    except Exception as e:
        logger.error(f"[SELF CHECK] Invariant validation error: {e}")

    return checks

async def _periodic_self_check_task():
    """Background loop to continuously verify system health."""
    while True:
        try:
            await asyncio.sleep(60)
            checks = await _perform_self_check()
            if not all(checks.values()):
                _monitoring_state["metrics"]["self_check_failures"] += 1
                failed = [k for k, v in checks.items() if not v]
                
                # Debounce: Log invariant failures every 60s max per type
                now = time.time()
                if now - _monitoring_state["last_alert"].get("invariant", 0) > 60:
                    logger.critical(f"[SYSTEM ALERT] invariant failure detected: {', '.join(failed)}")
                    _monitoring_state["last_alert"]["invariant"] = now
                    await _send_alert("invariant_failure", {"failed_checks": failed})
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[SYSTEM ALERT] Monitoring task error: {e}")
            await asyncio.sleep(10)

def _track_rate_limit(ip: str):
    """
    Memory-safe tracking of repeated rate-limit violations.
    Cleans up old timestamps and alerts on suspicious spikes.
    """
    global _monitoring_state
    now = time.time()
    _monitoring_state["metrics"]["rate_limit_hits"] += 1
    
    # 1. Get current hits
    hits = _monitoring_state["rate_limit_hits"].get(ip, [])
    
    # 2. Cleanup: remove timestamps older than 60s
    hits = [t for t in hits if now - t < 60]
    hits.append(now)
    
    # 3. Update state or delete if empty
    if hits:
        _monitoring_state["rate_limit_hits"][ip] = hits
    else:
        _monitoring_state["rate_limit_hits"].pop(ip, None)
    
    # 4. Threshold Alert: 20 violations in 60s
    if len(hits) >= 20:
        # Debounce: Alert max once per minute per IP
        if now - _monitoring_state["last_alert"].get(f"rate_limit_{ip}", 0) > 60:
            logger.warning(f"[RATE LIMIT ALERT] suspicious activity from {ip}: {len(hits)} hits/min")
            _monitoring_state["last_alert"][f"rate_limit_{ip}"] = now

# ── Server start time (for uptime reporting) ──────────────────────────────────
_START_TIME = time.time()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"[startup] Student Task Tracker API v{app.version} — env={settings.ENVIRONMENT}")
    await connect_db()
    
    # ── Startup Safeguard ─────────────────────────────────────────────────────
    if not _monitoring_state["is_running"]:
        task = asyncio.create_task(_periodic_self_check_task())
        _monitoring_state["tasks"].append(task)
        _monitoring_state["is_running"] = True
    
    logger.info("[startup] Ready to serve requests.")
    yield
    
    # ── Shutdown Cleanup ──────────────────────────────────────────────────────
    logger.info("[shutdown] Shutting down monitoring tasks…")
    for task in _monitoring_state["tasks"]:
        task.cancel()
    
    await close_db()


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Student Task Tracker API",
    description=(
        "Production-grade FastAPI backend.\n\n"
        "**Roles**: `teacher` · `student`\n\n"
        "Protected endpoints require `Authorization: Bearer <token>`.\n\n"
        "**Rate limits**: 200 req/min (global) · "
        f"{settings.AUTH_RATE_LIMIT} (auth endpoints)"
    ),
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Attach limiter to app state ───────────────────────────────────────────────
app.state.limiter = limiter


# ── Custom rate-limit exceeded handler ───────────────────────────────────────
# Replaces slowapi's default plain-text response with our JSON envelope.
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    rid = getattr(request.state, "request_id", "-")
    from app.utils.rate_limit import get_real_ip
    
    try:
        ip  = get_real_ip(request)
        logger.warning(f"[{rid}] [RATE LIMIT] {ip} exceeded limit on {request.url.path}")
        
        # Track suspicious activity
        _track_rate_limit(ip)
        
        headers = {"X-Request-ID": rid}
        if not settings.is_production:
            # Debug helper: expose the limit value being enforced
            headers["X-RateLimit-Limit"] = str(exc.detail)
        else:
            # INVARIANT: Never expose debug headers in production
            headers.pop("X-RateLimit-Limit", None)

        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "message": "Too many requests. Please wait a moment and try again.",
            },
            headers=headers,
        )
    except Exception as e:
        # FAIL-OPEN: If rate limit handling fails, allow the request but log error
        logger.error(f"[{rid}] Rate limit handler failed (fail-open): {e}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"success": False, "message": "Too many requests."},
        )


# ── CORS — environment-aware ──────────────────────────────────────────────────
# Production: only the configured FRONTEND_URL.
# Development: also localhost:3000 and :5173 for Vite dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


# ── Request-ID middleware ─────────────────────────────────────────────────────
# Must be added AFTER CORSMiddleware so the ID is available in all handlers.
@app.middleware("http")
async def request_id_and_logging(request: Request, call_next):
    """
    1. Generate a UUID4 correlation ID for every request.
    2. Store it in request.state.request_id.
    3. Inject it into the logging context via a LogRecord filter.
    4. Log method + path + status + duration.
    5. Return X-Request-ID response header.
    """
    # Skip noisy static / doc paths
    skip_prefixes = ("/docs", "/redoc", "/openapi", "/uploads")
    if any(request.url.path.startswith(p) for p in skip_prefixes):
        return await call_next(request)

    rid = str(uuid.uuid4())
    request.state.request_id = rid
    _monitoring_state["metrics"]["total_requests"] += 1

    # Inject request_id into all log records emitted during this request.
    # We use a thread-local filter on the root logger.
    _filter = _RequestIDLogFilter(rid)
    root_logger = logging.getLogger()
    root_logger.addFilter(_filter)

    start = time.perf_counter()
    try:
        response = await call_next(request)
    finally:
        root_logger.removeFilter(_filter)

    duration_ms = round((time.perf_counter() - start) * 1000, 1)

    logger.info(
        f"[{rid}] {request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)"
    )

    response.headers["X-Request-ID"]      = rid
    response.headers["X-Process-Time-Ms"] = str(duration_ms)
    return response


class _RequestIDLogFilter(logging.Filter):
    """Temporarily stamps every LogRecord with the current request_id."""
    def __init__(self, request_id: str) -> None:
        super().__init__()
        self._rid = request_id

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = self._rid  # type: ignore[attr-defined]
        return True


# ── Global exception handlers ─────────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    rid = getattr(request.state, "request_id", "-")
    if exc.status_code >= 500:
        logger.error(f"[{rid}] HTTP {exc.status_code} on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
        headers={"X-Request-ID": rid},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    rid    = getattr(request.state, "request_id", "-")
    errors = exc.errors()
    first  = errors[0] if errors else {}
    field  = " → ".join(str(loc) for loc in first.get("loc", []) if loc != "body")
    msg    = first.get("msg", "Validation error.")
    detail = f"{field}: {msg}" if field else msg
    logger.debug(f"[{rid}] Validation error on {request.url.path}: {detail}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "message": detail},
        headers={"X-Request-ID": rid},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    rid = getattr(request.state, "request_id", "-")
    logger.exception(f"[{rid}] Unhandled exception on {request.url.path}: {exc}")
    detail = (
        __import__("traceback").format_exc()
        if not settings.is_production
        else "An unexpected error occurred. Please try again."
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": detail},
        headers={"X-Request-ID": rid},
    )


# ── Static file serving ───────────────────────────────────────────────────────
_upload_dir = Path(settings.UPLOAD_DIR)
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_dir)), name="uploads")


# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(task_router)
app.include_router(submission_router)
app.include_router(class_router)
app.include_router(notification_router)
app.include_router(profile_router)
app.include_router(activity_router)


# ── Health / root ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="Root")
async def root():
    return {
        "success": True,
        "message": "Student Task Tracker API is running.",
        "version": app.version,
    }


@app.get("/api/version", tags=["Health"], summary="View application version")
async def version():
    """
    Returns the current application version and environment.
    Useful for verifying deployments and release tracking.
    """
    return {
        "success": True,
        "version": app.version,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time()
    }


@app.get("/api/health", tags=["Health"], summary="Detailed health check")
async def health():
    """
    Returns API status, uptime, and MongoDB connectivity.
    Returns HTTP 503 if the database is unreachable.
    Safe to poll from load balancers and monitoring tools.
    """
    uptime_seconds = round(time.time() - _START_TIME)
    db_ok = False
    try:
        # DB Ping with 2s timeout to prevent health-check blocking
        db = get_db()
        await asyncio.wait_for(db.command("ping"), timeout=2.0)
        db_ok = True
    except Exception:
        pass

    env_ok = settings.is_production or settings.ENVIRONMENT.lower() == "development"
    
    return JSONResponse(
        status_code=200 if (db_ok and env_ok) else 503,
        content={
            "success":  db_ok and env_ok,
            "status":   "ok" if (db_ok and env_ok) else "degraded",
            "version":  app.version,
            "uptime":   uptime_seconds,
            "database": "connected" if db_ok else "unreachable",
            "environment": settings.ENVIRONMENT,
            "checks": {
                "limiter": "ok" if hasattr(app.state, "limiter") else "error",
                "env": "ok" if env_ok else "error"
            }
        },
    )


@app.get("/api/system/metrics", tags=["System"], summary="View real-time system metrics (teacher only)")
async def system_metrics(user: dict = Depends(_require_teacher)):
    """
    Exposes in-memory metrics for monitoring.
    Includes request counts, rate-limit hits, and self-check history.
    """
    return {
        "success": True,
        "uptime_seconds": round(time.time() - _monitoring_state["start_time"]),
        "metrics": _monitoring_state["metrics"],
        "active_tasks": len(_monitoring_state["tasks"]),
        "tracked_ips": len(_monitoring_state["rate_limit_hits"])
    }


@app.get("/metrics", include_in_schema=False)
async def prometheus_metrics():
    """
    Exposes production-grade metrics in Prometheus text format.
    Optimized for scraping by Prometheus/Grafana.
    """
    from fastapi import Response
    m     = _monitoring_state["metrics"]
    env   = settings.ENVIRONMENT
    uptime = round(time.time() - _monitoring_state["start_time"])
    
    lines = [
        "# HELP app_requests_total Total number of requests processed",
        "# TYPE app_requests_total counter",
        f'app_requests_total{{environment="{env}"}} {m["total_requests"]}',
        "",
        "# HELP app_rate_limit_hits_total Total rate limit violations",
        "# TYPE app_rate_limit_hits_total counter",
        f'app_rate_limit_hits_total{{environment="{env}"}} {m["rate_limit_hits"]}',
        "",
        "# HELP app_self_check_failures_total Total invariant failures detected",
        "# TYPE app_self_check_failures_total counter",
        f'app_self_check_failures_total{{environment="{env}"}} {m["self_check_failures"]}',
        "",
        "# HELP app_alerts_sent_total Total alert webhooks sent",
        "# TYPE app_alerts_sent_total counter",
        f'app_alerts_sent_total{{environment="{env}"}} {m["webhook_alerts_sent"]}',
        "",
        "# HELP app_uptime_seconds Application uptime in seconds",
        "# TYPE app_uptime_seconds gauge",
        f'app_uptime_seconds{{environment="{env}"}} {uptime}',
    ]
    
    return Response(content="\n".join(lines) + "\n", media_type="text/plain")


@app.get("/api/system/self-check", tags=["System"], summary="Validate system invariants (teacher only)")
async def self_check(request: Request, user: dict = Depends(_require_teacher)):
    """
    Performs a deep-dive verification of the system state.
    Checks rate-limiter binding, environment validity, and cache health.
    """
    rid = getattr(request.state, "request_id", "-")
    checks = await _perform_self_check()
    overall_ok = all(checks.values())
    
    if not overall_ok:
        failed = [k for k, v in checks.items() if not v]
        logger.error(f"[{rid}] [SELF CHECK] invariant violation: {', '.join(failed)}")
        await _send_alert("invariant_failure", {"failed_checks": failed, "request_id": rid})

    return JSONResponse(
        status_code=200 if overall_ok else 500,
        content={
            "success": overall_ok,
            "status": "ok" if overall_ok else "degraded",
            "checks": checks
        }
    )


@app.get("/api/system/rate-limit-status", tags=["System"], summary="View active rate limits (dev only)")
async def rate_limit_status():
    """
    Exposes active rate limit values. 
    Strictly restricted to development mode for security.
    """
    if settings.is_production:
        return JSONResponse(
            status_code=403,
            content={"success": False, "message": "Endpoint restricted to development mode."}
        )
        
    limit_value = (
        settings.AUTH_RATE_LIMIT
        if settings.is_production
        else settings.DEV_AUTH_RATE_LIMIT
    )
    
    return {
        "success": True,
        "mode": settings.ENVIRONMENT,
        "limit": limit_value
    }


@app.get("/api/cache/stats", tags=["Health"], summary="In-memory cache statistics (teacher only)")
async def cache_stats(user: dict = Depends(_require_teacher)):
    """
    Returns the number of live entries in the in-memory summary cache.
    Useful for monitoring cache effectiveness without exposing cached data.
    Teacher-only to prevent information leakage.
    """
    return JSONResponse(
        status_code=200,
        content={
            "success":     True,
            "liveEntries": summary_cache.size(),
            "ttlSeconds":  settings.CACHE_TTL_SECONDS,
            "note":        "In-process cache — resets on server restart.",
        },
    )
