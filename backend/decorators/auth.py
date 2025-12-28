import time
from functools import wraps

import requests
from fastapi import HTTPException, Request


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

    try:
        response = requests.get(
            "https://www.googleapis.com/oauth2/v3/tokeninfo",
            params={"access_token": token},
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token.")

        token_info = response.json()
        if "exp" in token_info and time.time() > int(token_info["exp"]):
            raise HTTPException(status_code=401, detail="Token has expired.")

        required_scopes = {"https://www.googleapis.com/auth/userinfo.email"}
        if not required_scopes.issubset(set(token_info.get("scope", "").split())):
            raise HTTPException(status_code=403, detail="Insufficient token scopes.")

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

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization header is missing.")

        parts = auth_header.split()
        if parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=401, detail="Authorization header must start with Bearer."
            )
        elif len(parts) == 1:
            raise HTTPException(status_code=401, detail="Token not found.")
        elif len(parts) > 2:
            raise HTTPException(
                status_code=401, detail="Authorization header must be a single Bearer token."
            )

        token = parts[1]

        try:
            response = requests.get(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"access_token": token},
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token.")

            token_info = response.json()
            if "exp" in token_info and time.time() > int(token_info["exp"]):
                raise HTTPException(status_code=401, detail="Token has expired.")

            required_scopes = {"https://www.googleapis.com/auth/userinfo.email"}
            if not required_scopes.issubset(set(token_info.get("scope", "").split())):
                raise HTTPException(status_code=403, detail="Insufficient token scopes.")

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Token validation failed: {str(e)}")

        return await f(*args, **kwargs)

    return decorated
