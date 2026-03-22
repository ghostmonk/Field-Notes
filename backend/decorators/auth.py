import hashlib
import os
import time
from datetime import datetime, timezone
from functools import wraps
from threading import Lock

import httpx
from cachetools import TTLCache
from database import get_users_collection
from fastapi import HTTPException, Request
from glogger import logger
from models.user import UserInfo, UserRole
from pydantic import EmailStr, ValidationError
from pymongo import ReturnDocument

# Admin email - this user gets admin role (required environment variable)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
if not ADMIN_EMAIL:
    raise ValueError("ADMIN_EMAIL environment variable is required")

# Token cache using TTLCache with automatic expiration and size limit
# Key: hashed token, Value: UserInfo
# maxsize=1000 prevents memory exhaustion, ttl=300 (5 min) auto-expires entries
_CACHE_TTL = 300  # 5 minutes
_CACHE_MAX_SIZE = 1000
_token_cache: TTLCache[str, UserInfo] = TTLCache(maxsize=_CACHE_MAX_SIZE, ttl=_CACHE_TTL)
_cache_lock = Lock()


def _hash_token(token: str) -> str:
    """Create a hash of the token for cache key."""
    return hashlib.sha256(token.encode()).hexdigest()


def _get_cached_user(token: str) -> UserInfo | None:
    """Check if token is in cache and return UserInfo if valid."""
    token_hash = _hash_token(token)
    with _cache_lock:
        return _token_cache.get(token_hash)


def _cache_user(token: str, user_info: UserInfo) -> None:
    """Add token and user info to cache."""
    token_hash = _hash_token(token)
    with _cache_lock:
        _token_cache[token_hash] = user_info


# Dev auth constants — only active when ALLOW_DEV_AUTH=true
DEV_TOKEN_PREFIX = "dev-mock-"
_DEV_USERS = {
    "admin": {"email": ADMIN_EMAIL, "name": "Dev Admin"},
    "commenter": {"email": "dev-commenter@dev.example.com", "name": "Dev Commenter"},
}


async def _handle_dev_token(token: str) -> UserInfo | None:
    """Authenticate using a dev mock token. Returns None if not a dev token."""
    if not token.startswith(DEV_TOKEN_PREFIX):
        return None

    if os.environ.get("ALLOW_DEV_AUTH") != "true":
        raise HTTPException(status_code=401, detail="Dev auth is not enabled.")

    role = token[len(DEV_TOKEN_PREFIX) :]
    dev_user = _DEV_USERS.get(role)
    if not dev_user:
        raise HTTPException(status_code=401, detail=f"Unknown dev role: {role}")

    return await get_or_create_user(
        email=dev_user["email"],
        name=dev_user["name"],
        avatar_url=None,
        provider_user_id=f"dev-{role}",
    )


async def get_or_create_user(
    email: str, name: str, avatar_url: str | None, provider_user_id: str
) -> UserInfo:
    """Get existing user or create new one from OAuth info.

    Uses atomic find_one_and_update with upsert to avoid race conditions.
    """
    collection = await get_users_collection()
    current_time = datetime.now(timezone.utc)
    role: UserRole = "admin" if email == ADMIN_EMAIL else "commenter"

    auth_provider = {
        "provider": "google",
        "provider_user_id": provider_user_id,
        "email": email,
    }

    # Atomic upsert: creates user if not exists, updates auth provider if exists
    # $setOnInsert only applies on insert, $set always applies, $addToSet adds if not present
    user_doc = await collection.find_one_and_update(
        {"email": email},
        {
            "$setOnInsert": {
                "email": email,
                "name": name,
                "avatar_url": avatar_url,
                "role": role,
                "createdDate": current_time,
            },
            "$set": {"updatedDate": current_time},
            "$addToSet": {"auth_providers": auth_provider},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    if not user_doc:
        raise HTTPException(status_code=500, detail="Failed to create or find user")

    return UserInfo(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        name=user_doc.get("name", user_doc["email"].split("@")[0]),
        role=user_doc.get("role", "commenter"),
    )


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

    # Dev token bypass — only when ALLOW_DEV_AUTH=true
    dev_user = await _handle_dev_token(token)
    if dev_user:
        _cache_user(token, dev_user)
        return dev_user

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

        # Validate email format using Pydantic's EmailStr
        try:
            EmailStr._validate(email)
        except ValidationError:
            raise HTTPException(status_code=401, detail="Invalid email format in token.")

        name = profile.get("name", email.split("@")[0])
        avatar_url = profile.get("picture")
        provider_user_id = token_info.get("sub", "")

        # Get or create user in database
        user_info = await get_or_create_user(email, name, avatar_url, provider_user_id)

        # Cache the user info (TTLCache handles expiration automatically)
        _cache_user(token, user_info)

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
