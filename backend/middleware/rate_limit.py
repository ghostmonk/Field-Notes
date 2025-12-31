"""
Rate limiting middleware using slowapi.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter using client IP as key
# In production behind a proxy, ensure X-Forwarded-For is trusted
limiter = Limiter(key_func=get_remote_address)


def get_limiter() -> Limiter:
    """Get the rate limiter instance."""
    return limiter
