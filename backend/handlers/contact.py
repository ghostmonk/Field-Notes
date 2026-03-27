"""API handler for contact form submissions."""

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
        logger.warning("TURNSTILE_SECRET_KEY not set, bypassing verification (dev mode)")
        return True

    try:
        async with httpx.AsyncClient() as client:
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
        logger.error(f"Turnstile verification error: {e}")
        return False


def _hash_ip(ip: str) -> str:
    """Hash an IP address for privacy-safe storage."""
    return hashlib.sha256(ip.encode()).hexdigest()


@router.post("/contact")
@limiter.limit("3/hour")
async def submit_contact(
    request: Request,
    submission: ContactSubmission,
    collection: AsyncIOMotorCollection = Depends(get_contact_messages_collection),
):
    """Accept a public contact form submission."""
    remote_ip = request.client.host if request.client else "unknown"

    # 1. Turnstile verification
    if not await _verify_turnstile(submission.turnstile_token, remote_ip):
        raise HTTPException(status_code=400, detail="Human verification failed")

    # 2. Honeypot check — silent fake success
    if submission.honeypot:
        logger.info(f"Honeypot triggered from {_hash_ip(remote_ip)}")
        return {"status": "ok"}

    # 3. Timing check — silent fake success
    if submission.elapsed_ms < MIN_ELAPSED_MS:
        logger.info(f"Timing check failed ({submission.elapsed_ms}ms) from {_hash_ip(remote_ip)}")
        return {"status": "ok"}

    # 4. Build document and store
    user_id = None
    if hasattr(request.state, "user") and request.state.user:
        user_id = request.state.user.id

    doc = ContactMessageDoc(
        name=submission.name,
        email=submission.email,
        message=submission.message,
        ip_hash=_hash_ip(remote_ip),
        user_id=user_id,
    )
    await collection.insert_one(doc.model_dump())

    # 5. Send notification email (best-effort)
    try:
        send_contact_notification(
            name=submission.name,
            email=submission.email,
            message=submission.message,
        )
    except Exception as e:
        logger.error(f"Failed to send contact notification: {e}")

    logger.info(f"Contact message stored from {submission.email}")
    return {"status": "ok"}
