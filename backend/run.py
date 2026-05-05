"""
Startup script — python run.py
Uses python -m uvicorn so it works regardless of whether
uvicorn is on the system PATH.
"""
import subprocess
import sys
from app.config.settings import get_settings

settings = get_settings()

if __name__ == "__main__":
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "app.main:app",
        "--host", "localhost",
        "--port", str(settings.PORT),
        "--reload",
        "--log-level", "info",
    ])
