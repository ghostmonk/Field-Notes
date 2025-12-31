"""
API handlers for user operations.
"""

from decorators.auth import requires_auth
from fastapi import APIRouter, Request
from middleware.rate_limit import limiter
from models.user import UserInfo

router = APIRouter()


@router.get("/me", response_model=UserInfo)
@limiter.limit("30/minute")  # Rate limit: 30 requests per minute per IP
@requires_auth
async def get_current_user(request: Request) -> UserInfo:
    """Get the current authenticated user's info.

    Rate limited to prevent abuse of user creation (which happens on first auth).
    """
    return request.state.user
