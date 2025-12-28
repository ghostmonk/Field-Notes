import hashlib
import time
from functools import wraps
from threading import Lock

import requests
from fastapi import HTTPException, Request

# Token cache: {token_hash: expiration_timestamp}
# Using hash to avoid storing raw tokens in memory
_token_cache: dict[str, float] = {}
_cache_lock = Lock()
_CACHE_TTL = 300  # 5 minutes


def _hash_token(token: str) -> str:
    """Create a hash of the token for cache key."""
    return hashlib.sha256(token.encode()).hexdigest()


def _get_cached_token(token: str) -> bool:
    """Check if token is in cache and not expired."""
    token_hash = _hash_token(token)
    with _cache_lock:
        if token_hash in _token_cache:
            if time.time() < _token_cache[token_hash]:
                return True
            # Expired, remove from cache
            del _token_cache[token_hash]
    return False


def _cache_token(token: str, ttl: float = _CACHE_TTL) -> None:
    """Add token to cache with TTL."""
    token_hash = _hash_token(token)
    expiration = time.time() + ttl
    with _cache_lock:
        _token_cache[token_hash] = expiration
        # Cleanup: remove expired entries if cache grows large
        if len(_token_cache) > 1000:
            current_time = time.time()
            expired = [k for k, v in _token_cache.items() if v < current_time]
            for k in expired:
                del _token_cache[k]


async def verify_auth(request: Request) -> bool:
    """Verify authorization header and return True if valid, raise HTTPException if invalid."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header is missing.")

    parts = auth_header.split()
    if parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization header must start with Bearer.")
    elif len(parts) == 1:
        raise HTTPException(status_code=401, detail="Token not found.")
    elif len(parts) > 2:
        raise HTTPException(
            status_code=401, detail="Authorization header must be a single Bearer token."
        )

    token = parts[1]

    # Check cache first
    if _get_cached_token(token):
        return True

    try:
        response = requests.get(
            "https://www.googleapis.com/oauth2/v3/tokeninfo",
            params={"access_token": token},
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token.")

        token_info = response.json()
        token_exp = int(token_info.get("exp", 0))
        current_time = time.time()

        if token_exp and current_time > token_exp:
            raise HTTPException(status_code=401, detail="Token has expired.")

        required_scopes = {"https://www.googleapis.com/auth/userinfo.email"}
        if not required_scopes.issubset(set(token_info.get("scope", "").split())):
            raise HTTPException(status_code=403, detail="Insufficient token scopes.")

        # Cache the valid token
        # Use the shorter of: cache TTL or time until token expires
        if token_exp:
            time_until_exp = token_exp - current_time
            cache_ttl = min(_CACHE_TTL, time_until_exp)
        else:
            cache_ttl = _CACHE_TTL

        if cache_ttl > 0:
            _cache_token(token, cache_ttl)

        return True

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token validation failed: {str(e)}")


def requires_auth(f):
    @wraps(f)
    async def decorated(*args, **kwargs):
        request: Request = kwargs.get("request")
        if not request:
            raise HTTPException(status_code=500, detail="Request object is missing.")
        await verify_auth(request)
        return await f(*args, **kwargs)

    return decorated
