"""API handler for contact form submissions."""

import asyncio
import hashlib
import os

import httpx
from database import get_contact_messages_collection
from fastapi import APIRouter, Depends, HTTPException, Request
from glogger import logger
from middleware.rate_limit import limiter
from models.contact import ContactMessageDoc, ContactSubmission
from motor.motor_asyncio import AsyncIOMotorCollection
from services.email_service import send_contact_notification

router = APIRouter()

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
MIN_ELAPSED_MS = 3000


async def _verify_turnstile(token: str, remote_ip: str) -> bool:
    """Verify a Cloudflare Turnstile token."""
    secret = os.environ.get("TURNSTILE_SECRET_KEY")
    if not secret:
        if os.getenv("ALLOW_DEV_AUTH"):
            logger.warning("TURNSTILE_SECRET_KEY not set — skipping verification (dev mode)")
            return True
        logger.error("TURNSTILE_SECRET_KEY not set — rejecting submission (production)")
        return False

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                TURNSTILE_VERIFY_URL,
                data={
                    "secret": secret,
                    "response": token,
                    "remoteip": remote_ip,
                },
            )
            result = response.json()
            return result.get("success", False)
    except Exception as e:
        logger.error("Turnstile verification error", exception=e)
        return False


def _get_client_ip(request: Request) -> str:
    """Get the real client IP, accounting for proxy forwarding."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _hash_ip(ip: str) -> str:
    """Hash an IP address for privacy-safe storage."""
    return hashlib.sha256(ip.encode()).hexdigest()


@router.post("/contact")
@limiter.limit("3/hour", key_func=lambda request: _get_client_ip(request))
async def submit_contact(
    request: Request,
    submission: ContactSubmission,
    collection: AsyncIOMotorCollection = Depends(get_contact_messages_collection),
):
    """Accept a public contact form submission."""
    remote_ip = _get_client_ip(request)
    ip_hash = _hash_ip(remote_ip)

    if submission.turnstile_token:
        if not await _verify_turnstile(submission.turnstile_token, remote_ip):
            raise HTTPException(status_code=400, detail="Human verification failed")
    else:
        logger.warning(f"Contact submission without Turnstile token from {ip_hash}")

    if submission.honeypot:
        logger.info(f"Honeypot triggered from {ip_hash}")
        return {"status": "ok"}

    if submission.elapsed_ms < MIN_ELAPSED_MS:
        logger.info(f"Timing check failed ({submission.elapsed_ms}ms) from {ip_hash}")
        return {"status": "ok"}

    user_id = None
    if hasattr(request.state, "user") and request.state.user:
        user_id = request.state.user.id

    doc = ContactMessageDoc(
        name=submission.name,
        email=submission.email,
        message=submission.message,
        ip_hash=ip_hash,
        user_id=user_id,
    )
    await collection.insert_one(doc.model_dump())

    # Fire-and-forget — response returns immediately, email sends in background
    asyncio.create_task(
        asyncio.to_thread(
            send_contact_notification,
            submission.name,
            submission.email,
            submission.message,
        )
    )

    logger.info(f"Contact message stored (ip_hash={ip_hash})")
    return {"status": "ok"}
