import hashlib
import os
import time
from datetime import datetime, timezone
from functools import wraps
from threading import Lock

import httpx
from database import get_users_collection
from fastapi import HTTPException, Request
from glogger import logger
from models.user import UserInfo, UserRole
from pymongo.errors import DuplicateKeyError

# Admin email - this user gets admin role (required environment variable)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
if not ADMIN_EMAIL:
    raise ValueError("ADMIN_EMAIL environment variable is required")

# Token cache: {token_hash: (expiration_timestamp, UserInfo)}
# Using hash to avoid storing raw tokens in memory
_token_cache: dict[str, tuple[float, UserInfo]] = {}
_cache_lock = Lock()
_CACHE_TTL = 300  # 5 minutes


def _hash_token(token: str) -> str:
    """Create a hash of the token for cache key."""
    return hashlib.sha256(token.encode()).hexdigest()


def _get_cached_user(token: str) -> UserInfo | None:
    """Check if token is in cache and return UserInfo if valid."""
    token_hash = _hash_token(token)
    with _cache_lock:
        if token_hash in _token_cache:
            expiration, user_info = _token_cache[token_hash]
            if time.time() < expiration:
                return user_info
            # Expired, remove from cache
            del _token_cache[token_hash]
    return None


def _cache_user(token: str, user_info: UserInfo, ttl: float = _CACHE_TTL) -> None:
    """Add token and user info to cache with TTL."""
    token_hash = _hash_token(token)
    expiration = time.time() + ttl
    with _cache_lock:
        _token_cache[token_hash] = (expiration, user_info)
        # Cleanup: remove expired entries if cache grows large
        if len(_token_cache) > 1000:
            current_time = time.time()
            # Use list() snapshot to avoid RuntimeError from dict mutation during iteration
            expired = [k for k, (exp, _) in list(_token_cache.items()) if exp < current_time]
            for k in expired:
                _token_cache.pop(k, None)


async def get_or_create_user(
    email: str, name: str, avatar_url: str | None, provider_user_id: str
) -> UserInfo:
    """Get existing user or create new one from OAuth info."""
    collection = await get_users_collection()

    # Try to find existing user by email
    user_doc = await collection.find_one({"email": email})

    if user_doc:
        # Update auth provider info if not already present
        existing_providers = user_doc.get("auth_providers", [])
        google_provider_exists = any(
            p.get("provider") == "google" and p.get("provider_user_id") == provider_user_id
            for p in existing_providers
        )

        if not google_provider_exists:
            await collection.update_one(
                {"_id": user_doc["_id"]},
                {
                    "$push": {
                        "auth_providers": {
                            "provider": "google",
                            "provider_user_id": provider_user_id,
                            "email": email,
                        }
                    },
                    "$set": {"updatedDate": datetime.now(timezone.utc)},
                },
            )

        return UserInfo(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            role=user_doc.get("role", "commenter"),
        )

    # Create new user
    current_time = datetime.now(timezone.utc)
    role: UserRole = "admin" if email == ADMIN_EMAIL else "commenter"

    new_user = {
        "email": email,
        "name": name,
        "avatar_url": avatar_url,
        "role": role,
        "auth_providers": [
            {
                "provider": "google",
                "provider_user_id": provider_user_id,
                "email": email,
            }
        ],
        "createdDate": current_time,
        "updatedDate": current_time,
    }

    try:
        result = await collection.insert_one(new_user)
        return UserInfo(
            id=str(result.inserted_id),
            email=email,
            role=role,
        )
    except DuplicateKeyError:
        # Race condition: another request created the user, fetch it
        logger.info(f"User {email} created by concurrent request, fetching existing")
        user_doc = await collection.find_one({"email": email})
        if user_doc:
            return UserInfo(
                id=str(user_doc["_id"]),
                email=user_doc["email"],
                role=user_doc.get("role", "commenter"),
            )
        raise HTTPException(status_code=500, detail="Failed to create or find user")


def _extract_bearer_token(request: Request) -> str:
    """Extract and validate Bearer token from Authorization header."""
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

    return parts[1]


async def verify_auth_and_get_user(request: Request) -> UserInfo:
    """Verify authorization header and return UserInfo."""
    token = _extract_bearer_token(request)

    # Check cache first
    cached_user = _get_cached_user(token)
    if cached_user:
        return cached_user

    try:
        async with httpx.AsyncClient() as client:
            # Validate token with Google
            response = await client.get(
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

            # Get user profile info from Google
            profile_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token}"},
            )
            if profile_response.status_code != 200:
                # Log detailed error but continue - we can still authenticate with email from token
                logger.warning(
                    f"Failed to fetch user profile from Google: status={profile_response.status_code}, "
                    f"response={profile_response.text[:200] if hasattr(profile_response, 'text') else 'N/A'}"
                )
            profile = profile_response.json() if profile_response.status_code == 200 else {}

        # Extract user info
        email = token_info.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Token does not contain email.")

        name = profile.get("name", email.split("@")[0])
        avatar_url = profile.get("picture")
        provider_user_id = token_info.get("sub", "")

        # Get or create user in database
        user_info = await get_or_create_user(email, name, avatar_url, provider_user_id)

        # Cache the user info
        if token_exp:
            time_until_exp = token_exp - current_time
            cache_ttl = min(_CACHE_TTL, time_until_exp)
        else:
            cache_ttl = _CACHE_TTL

        if cache_ttl > 0:
            _cache_user(token, user_info, cache_ttl)

        return user_info

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token validation failed: {str(e)}")


async def verify_auth(request: Request) -> bool:
    """Verify authorization header and return True if valid.

    This is a backward-compatible wrapper around verify_auth_and_get_user.
    """
    await verify_auth_and_get_user(request)
    return True


def requires_auth(f):
    """Decorator that validates auth and attaches user to request.state."""

    @wraps(f)
    async def decorated(*args, **kwargs):
        request: Request = kwargs.get("request")
        if not request:
            raise HTTPException(status_code=500, detail="Request object is missing.")

        user_info = await verify_auth_and_get_user(request)
        request.state.user = user_info

        return await f(*args, **kwargs)

    return decorated


def check_write_permission(user: UserInfo, resource_user_id: str | None) -> bool:
    """Check if user has write permission for a resource.

    Returns True if:
    - User has admin role, OR
    - User owns the resource (user.id matches resource_user_id)

    Note: If resource_user_id is None (legacy content before migration),
    only admins can edit. This is intentional security behavior.
    """
    # Alert on legacy content without user_id - indicates data integrity issue
    if resource_user_id is None:
        logger.warning(
            "Legacy content detected without user_id - data integrity issue. "
            "Run migrations to assign ownership."
        )

    if user.role == "admin":
        return True
    if resource_user_id and user.id == resource_user_id:
        return True
    return False
