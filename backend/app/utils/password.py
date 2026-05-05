import bcrypt
import logging

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt directly.
    The resulting hash is decoded to a string for DB storage.
    """
    # bcrypt.hashpw expects bytes, returns bytes
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verifies a plain-text password against a hashed one using bcrypt.
    Includes debug logging as requested.
    """
    try:
        # Debug logs
        print(f"DEBUG - INPUT PASSWORD: {plain}")
        print(f"DEBUG - STORED HASH: {hashed}")
        
        # bcrypt.checkpw expects bytes for both arguments
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        logger.error(f"[auth] Password verification error: {e}")
        print(f"VERIFICATION ERROR: {e}")
        return False
