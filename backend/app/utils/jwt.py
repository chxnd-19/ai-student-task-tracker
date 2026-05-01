"""
JWT creation and verification utilities.
"""
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.config.settings import get_settings

settings = get_settings()


def create_access_token(user_id: str, role: str) -> str:
    """Create a signed JWT with { id, role } payload."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    payload = {
        "id": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT.
    Returns the payload dict on success.
    Raises JWTError on failure (expired, invalid signature, etc.).
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
