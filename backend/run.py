"""
Convenience startup script.
Run: python run.py
"""
import uvicorn
from app.config.settings import get_settings

settings = get_settings()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=(settings.ENVIRONMENT == "development"),
        log_level="info",
    )
