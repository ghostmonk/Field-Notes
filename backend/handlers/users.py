"""
API handlers for user operations.
"""

from decorators.auth import requires_auth
from fastapi import APIRouter, Request
from models.user import UserInfo

router = APIRouter()


@router.get("/me")
@requires_auth
async def get_current_user(request: Request):
    """Get the current authenticated user's info."""
    user: UserInfo = request.state.user
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
    }
