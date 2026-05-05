"""
Student Task Tracker — FastAPI entry point.

STABILITY GUARANTEES:
- App ALWAYS starts, even if MongoDB is down
- Routes ALWAYS register, regardless of external services
- DB connection is attempted once at startup, failure is non-fatal
- No import-time side effects from any module
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import connect_db, close_db
from app.routes.auth import router as auth_router
from app.api.workspace import router as workspace_router
from app.api.task import router as task_router
from app.api.submission import router as submission_router
from app.api.notification import router as notification_router
from app.api.user import router as user_router
from app.services.socket_service import sio_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB connection is non-blocking — failure is logged, app continues
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Student Task Tracker",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,         prefix="/api/auth")
app.include_router(workspace_router,    prefix="/api")
app.include_router(task_router,         prefix="/api")
app.include_router(submission_router,   prefix="/api")
app.include_router(notification_router, prefix="/api")
app.include_router(user_router,         prefix="/api")

# ── Socket.IO ─────────────────────────────────────────────────────────────────
app.mount("/socket.io", sio_app)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Backend running"}


# ── Startup route verification (printed once at import) ───────────────────────
_routes = [
    (list(r.methods), r.path)
    for r in app.routes
    if hasattr(r, "methods")
]
print("\n📋 Registered routes:")
for methods, path in _routes:
    print(f"   {methods} {path}")
print()
