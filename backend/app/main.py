"""
Student Task Tracker — FastAPI entry point.

STABILITY GUARANTEES:
- App ALWAYS starts, even if MongoDB is down
- Routes ALWAYS register, regardless of external services
- DB connection is attempted once at startup, failure is non-fatal
- No import-time side effects from any module
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import connect_db, close_db
from app.routes.auth import router as auth_router
from app.api.workspace import router as workspace_router
from app.api.task import router as task_router
from app.api.submission import router as submission_router
from app.api.notification import router as notification_router
from app.api.user import router as user_router
from app.api.activity import router as activity_router
from app.api.ai import router as ai_router
from app.services.socket_service import sio_app

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Student Task Tracker",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── GLOBAL ERROR HANDLERS ─────────────────────────────────────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Standardize all HTTP errors into { success, message, error } envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "error":   f"HTTP_{exc.status_code}",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return readable validation errors instead of FastAPI's default 422 body."""
    errors = exc.errors()
    # Build a human-readable summary of the first validation failure
    first = errors[0] if errors else {}
    field   = " → ".join(str(loc) for loc in first.get("loc", []))
    message = first.get("msg", "Validation error")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": f"Validation error on '{field}': {message}",
            "error":   "VALIDATION_ERROR",
            "details": [
                {
                    "field":   " → ".join(str(loc) for loc in e.get("loc", [])),
                    "message": e.get("msg", ""),
                }
                for e in errors
            ],
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all for unexpected server errors — never expose stack traces."""
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred. Please try again.",
            "error":   "INTERNAL_SERVER_ERROR",
        },
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,         prefix="/api/auth")
app.include_router(workspace_router,    prefix="/api")
app.include_router(task_router,         prefix="/api")
app.include_router(submission_router,   prefix="/api")
app.include_router(notification_router, prefix="/api")
app.include_router(user_router,         prefix="/api")
app.include_router(activity_router,     prefix="/api")
app.include_router(ai_router,           prefix="/api")

# ── Socket.IO ─────────────────────────────────────────────────────────────────
app.mount("/socket.io", sio_app)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Backend running", "version": "2.0.0"}
