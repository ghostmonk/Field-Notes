"""
API handlers for user operations.
"""

from decorators.auth import requires_auth
from fastapi import APIRouter, Request
from models.user import UserInfo

router = APIRouter()


@router.get("/me", response_model=UserInfo)
@requires_auth
async def get_current_user(request: Request) -> UserInfo:
    """Get the current authenticated user's info."""
    return request.state.user
