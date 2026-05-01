"""
Shared rate-limiter instance.

REGRESSION PROTECTION:
----------------------
1. Why shared? @auth_limiter.limit looks up app.state.limiter. Object identity must match.
2. IP Detection: get_real_ip MUST handle proxy headers (X-Forwarded-For) correctly
   to avoid rate-limiting the Nginx container IP instead of the client.
3. Order: XFF (First) -> X-Real-IP -> Client Host.
"""
from slowapi import Limiter
from fastapi import Request
from app.utils.logger import get_logger

logger = get_logger(__name__)

def get_real_ip(request: Request) -> str:
    """
    INVARIANT: Always returns a non-empty string. Never returns None. Never raises.
    
    Priority:
    1. X-Forwarded-For (First IP in comma-separated list)
    2. X-Real-IP
    3. request.client.host
    4. Safe fallback: 127.0.0.1
    """
    try:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            # First IP is the original client
            return xff.split(",")[0].strip() or "127.0.0.1"
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        return (request.client.host if request.client else None) or "127.0.0.1"
    except Exception as e:
        # Defensive: Never break the request if IP detection fails
        logger.error(f"[INVARIANT FAILURE] get_real_ip failed: {e}")
        return "127.0.0.1"

# Single shared instance — imported by both main.py and api/auth.py.
# key_func is the heart of the system; must match get_real_ip.
auth_limiter = Limiter(
    key_func=get_real_ip,
    default_limits=[],   # No global default — limits are set per-route in auth.py
)
