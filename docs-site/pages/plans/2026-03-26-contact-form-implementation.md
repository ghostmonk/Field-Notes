# Contact Form Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public contact form to the contact page with Cloudflare Turnstile, honeypot, timing checks, rate limiting, MongoDB storage, and Gmail SMTP notification.

**Architecture:** New backend endpoint `POST /contact` with multi-layer spam prevention. Frontend form composes existing UI components. Turnstile widget and honeypot field added as reusable `components/ui/` building blocks. Next.js API route proxies to backend. Email service sends Gmail SMTP notifications; failures are non-fatal.

**Tech Stack:** FastAPI, Pydantic, MongoDB (motor), smtplib, Cloudflare Turnstile, Next.js API routes, React, existing UI components (FormField, Input, Textarea, Button)

**Worktree:** `.worktrees/contact-form` on branch `ghostmonk/contact-form`

---

### Task 1: Backend Contact Model

**Files:**
- Create: `backend/models/contact.py`
- Test: `backend/tests/test_models_contact.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_models_contact.py
import pytest
from pydantic import ValidationError

from models.contact import ContactSubmission


class TestContactSubmission:
    def test_valid_submission(self):
        data = ContactSubmission(
            name="Test User",
            email="test@example.com",
            message="Hello there",
            turnstile_token="fake-token",
            honeypot="",
            elapsed_ms=5000,
        )
        assert data.name == "Test User"
        assert data.email == "test@example.com"

    def test_name_too_long(self):
        with pytest.raises(ValidationError):
            ContactSubmission(
                name="x" * 101,
                email="test@example.com",
                message="Hello",
                turnstile_token="t",
                honeypot="",
                elapsed_ms=5000,
            )

    def test_message_too_long(self):
        with pytest.raises(ValidationError):
            ContactSubmission(
                name="Test",
                email="test@example.com",
                message="x" * 2001,
                turnstile_token="t",
                honeypot="",
                elapsed_ms=5000,
            )

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            ContactSubmission(
                name="Test",
                email="not-an-email",
                message="Hello",
                turnstile_token="t",
                honeypot="",
                elapsed_ms=5000,
            )

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            ContactSubmission(
                name="",
                email="test@example.com",
                message="Hello",
                turnstile_token="t",
                honeypot="",
                elapsed_ms=5000,
            )

    def test_empty_message_rejected(self):
        with pytest.raises(ValidationError):
            ContactSubmission(
                name="Test",
                email="test@example.com",
                message="",
                turnstile_token="t",
                honeypot="",
                elapsed_ms=5000,
            )

    def test_html_stripped_from_message(self):
        data = ContactSubmission(
            name="Test",
            email="test@example.com",
            message="<script>alert('xss')</script>Hello <b>world</b>",
            turnstile_token="t",
            honeypot="",
            elapsed_ms=5000,
        )
        assert "<script>" not in data.message
        assert "<b>" not in data.message
        assert "Hello" in data.message
        assert "world" in data.message

    def test_html_stripped_from_name(self):
        data = ContactSubmission(
            name="<b>Test</b>",
            email="test@example.com",
            message="Hello",
            turnstile_token="t",
            honeypot="",
            elapsed_ms=5000,
        )
        assert "<b>" not in data.name
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_models_contact.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'models.contact'`

**Step 3: Write minimal implementation**

```python
# backend/models/contact.py
"""Pydantic models for the contact form."""

import re
from datetime import datetime, timezone

from pydantic import BaseModel, EmailStr, Field, field_validator


def _strip_html(value: str) -> str:
    """Remove all HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", value)


class ContactSubmission(BaseModel):
    """Incoming contact form submission from the frontend."""

    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(..., min_length=1, max_length=2000)
    turnstile_token: str = Field(..., min_length=1)
    honeypot: str = ""
    elapsed_ms: int = Field(..., ge=0)

    @field_validator("name")
    @classmethod
    def strip_html_from_name(cls, v: str) -> str:
        return _strip_html(v).strip()

    @field_validator("message")
    @classmethod
    def strip_html_from_message(cls, v: str) -> str:
        return _strip_html(v).strip()


class ContactMessageDoc(BaseModel):
    """Shape of the document stored in MongoDB."""

    name: str
    email: str
    message: str
    ip_hash: str
    user_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = False
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_models_contact.py -v`
Expected: PASS

**Step 5: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add backend/models/contact.py backend/tests/test_models_contact.py
git commit -m "feat: add contact form pydantic models with HTML sanitization"
```

---

### Task 2: Email Service

**Files:**
- Create: `backend/services/email_service.py`
- Test: `backend/tests/test_email_service.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_email_service.py
import smtplib
from unittest.mock import MagicMock, patch

import pytest

from services.email_service import send_contact_notification


class TestSendContactNotification:
    @patch.dict(
        "os.environ",
        {
            "SMTP_USER": "sender@gmail.com",
            "SMTP_APP_PASSWORD": "app-password",
            "CONTACT_NOTIFY_EMAIL": "admin@example.com",
        },
    )
    @patch("services.email_service.smtplib.SMTP_SSL")
    def test_sends_email_with_correct_content(self, mock_smtp_class):
        mock_smtp = MagicMock()
        mock_smtp_class.return_value.__enter__ = MagicMock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = MagicMock(return_value=False)

        send_contact_notification(
            name="Alice",
            email="alice@example.com",
            message="Hello, I have a question.",
        )

        mock_smtp.login.assert_called_once_with("sender@gmail.com", "app-password")
        mock_smtp.sendmail.assert_called_once()
        call_args = mock_smtp.sendmail.call_args
        assert call_args[0][0] == "sender@gmail.com"
        assert call_args[0][1] == "admin@example.com"
        body = call_args[0][2]
        assert "Alice" in body
        assert "alice@example.com" in body
        assert "Hello, I have a question." in body

    @patch.dict("os.environ", {}, clear=True)
    def test_skips_when_no_smtp_config(self, caplog):
        """Should log and return without error when SMTP is not configured."""
        send_contact_notification(
            name="Bob",
            email="bob@example.com",
            message="Test",
        )
        # No exception raised — function returns silently

    @patch.dict(
        "os.environ",
        {
            "SMTP_USER": "sender@gmail.com",
            "SMTP_APP_PASSWORD": "app-password",
            "CONTACT_NOTIFY_EMAIL": "admin@example.com",
        },
    )
    @patch("services.email_service.smtplib.SMTP_SSL")
    def test_does_not_raise_on_smtp_error(self, mock_smtp_class):
        mock_smtp = MagicMock()
        mock_smtp.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Bad creds")
        mock_smtp_class.return_value.__enter__ = MagicMock(return_value=mock_smtp)
        mock_smtp_class.return_value.__exit__ = MagicMock(return_value=False)

        # Should not raise
        send_contact_notification(
            name="Charlie",
            email="charlie@example.com",
            message="Test",
        )
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_email_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'services.email_service'`

**Step 3: Write minimal implementation**

```python
# backend/services/email_service.py
"""Gmail SMTP email service for contact form notifications."""

import os
import smtplib
from datetime import datetime, timezone
from email.mime.text import MIMEText

from glogger import logger


def send_contact_notification(name: str, email: str, message: str) -> None:
    """Send a contact form notification email via Gmail SMTP.

    Non-fatal: logs errors but never raises. The contact message
    is already persisted in MongoDB before this is called.
    """
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_APP_PASSWORD")
    notify_email = os.getenv("CONTACT_NOTIFY_EMAIL")

    if not all([smtp_user, smtp_password, notify_email]):
        logger.info("SMTP not configured — skipping contact notification email")
        return

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    body = (
        f"New contact form submission\n"
        f"{'=' * 40}\n\n"
        f"Name:    {name}\n"
        f"Email:   {email}\n"
        f"Time:    {timestamp}\n\n"
        f"Message:\n{message}\n"
    )

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = f"Contact form: {name}"
    msg["From"] = smtp_user
    msg["To"] = notify_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, notify_email, msg.as_string())
        logger.info("Contact notification email sent")
    except Exception as e:
        logger.error(f"Failed to send contact notification email: {e}")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_email_service.py -v`
Expected: PASS

**Step 5: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add backend/services/email_service.py backend/tests/test_email_service.py
git commit -m "feat: add Gmail SMTP email service for contact notifications"
```

---

### Task 3: Backend Contact Handler

**Files:**
- Create: `backend/handlers/contact.py`
- Modify: `backend/database.py` — add `get_contact_messages_collection`
- Modify: `backend/app.py` — register router, add indexes
- Test: `backend/tests/test_contact_handler.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_contact_handler.py
import hashlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app import app


@pytest.fixture
def mock_turnstile_success():
    """Mock successful Turnstile verification."""
    with patch("handlers.contact.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {"success": True}
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client
        yield


@pytest.fixture
def mock_turnstile_failure():
    """Mock failed Turnstile verification."""
    with patch("handlers.contact.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {"success": False, "error-codes": ["invalid-input-response"]}
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client
        yield


@pytest.fixture
def mock_email():
    with patch("handlers.contact.send_contact_notification") as mock:
        yield mock


@pytest.fixture
def valid_payload():
    return {
        "name": "Alice",
        "email": "alice@example.com",
        "message": "Hello, this is a test message.",
        "turnstile_token": "valid-token",
        "honeypot": "",
        "elapsed_ms": 5000,
    }


@pytest.mark.asyncio
class TestContactEndpoint:
    async def test_successful_submission(
        self, mock_turnstile_success, mock_email, valid_payload
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/contact", json=valid_payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        mock_email.assert_called_once_with(
            name="Alice",
            email="alice@example.com",
            message="Hello, this is a test message.",
        )

    async def test_honeypot_filled_rejected(
        self, mock_turnstile_success, mock_email, valid_payload
    ):
        valid_payload["honeypot"] = "bot-filled-this"
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/contact", json=valid_payload)

        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        # Silently rejected — email NOT sent
        mock_email.assert_not_called()

    async def test_timing_too_fast_rejected(
        self, mock_turnstile_success, mock_email, valid_payload
    ):
        valid_payload["elapsed_ms"] = 1000  # < 3000ms
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/contact", json=valid_payload)

        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        mock_email.assert_not_called()

    async def test_turnstile_failure_rejected(
        self, mock_turnstile_failure, mock_email, valid_payload
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/contact", json=valid_payload)

        assert response.status_code == 400
        assert "verification failed" in response.json()["detail"].lower()
        mock_email.assert_not_called()

    async def test_html_stripped_from_message(
        self, mock_turnstile_success, mock_email, valid_payload
    ):
        valid_payload["message"] = "<script>alert('xss')</script>Clean text"
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/contact", json=valid_payload)

        assert response.status_code == 200
        # Email should receive sanitized message
        call_args = mock_email.call_args
        assert "<script>" not in call_args.kwargs.get("message", call_args[1].get("message", ""))

    async def test_missing_required_fields(self, mock_turnstile_success, mock_email):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/contact", json={"name": "Alice"})

        assert response.status_code == 422
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_contact_handler.py -v`
Expected: FAIL (no `/contact` route registered)

**Step 3: Write implementation**

Add collection getter to `backend/database.py` — append after `get_job_applications_collection`:

```python
async def get_contact_messages_collection() -> AsyncIOMotorCollection:
    db = await get_db()
    return db["contact_messages"]
```

Add index in `ensure_indexes` in `backend/database.py` — append before the `if failed_indexes:` block:

```python
    # Contact messages indexes
    contact_messages = db["contact_messages"]
    await safe_create_index(contact_messages, "ip_hash")
    await safe_create_index(
        contact_messages,
        [("created_at", -1)],
        name="contact_messages_created_at",
    )
```

Create the handler:

```python
# backend/handlers/contact.py
"""API handler for public contact form submissions."""

import hashlib
import os
from datetime import datetime, timezone

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
    """Verify a Cloudflare Turnstile token. Returns True if valid."""
    secret = os.getenv("TURNSTILE_SECRET_KEY", "")
    if not secret:
        logger.warning("TURNSTILE_SECRET_KEY not set — skipping verification")
        return True

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                TURNSTILE_VERIFY_URL,
                data={
                    "secret": secret,
                    "response": token,
                    "remoteip": remote_ip,
                },
            )
            result = resp.json()
            if not result.get("success"):
                logger.info_with_context(
                    "Turnstile verification failed",
                    {"errors": result.get("error-codes", [])},
                )
            return result.get("success", False)
    except Exception as e:
        logger.error(f"Turnstile verification error: {e}")
        return False


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


@router.post("/contact")
@limiter.limit("3/hour")
async def submit_contact(
    request: Request,
    submission: ContactSubmission,
    collection: AsyncIOMotorCollection = Depends(get_contact_messages_collection),
):
    """Public contact form endpoint. No auth required.

    Anti-spam: Turnstile token verification, honeypot check, timing check,
    and rate limiting (3/hour per IP). Honeypot and timing failures return
    200 OK to avoid leaking detection to bots.
    """
    remote_ip = request.client.host if request.client else "unknown"

    # 1. Turnstile verification — reject with 400 so frontend can show error
    if not await _verify_turnstile(submission.turnstile_token, remote_ip):
        raise HTTPException(status_code=400, detail="Human verification failed")

    # 2. Honeypot — silent reject (return fake success)
    if submission.honeypot:
        logger.info_with_context("Honeypot triggered", {"ip_hash": _hash_ip(remote_ip)})
        return {"status": "ok"}

    # 3. Timing — silent reject
    if submission.elapsed_ms < MIN_ELAPSED_MS:
        logger.info_with_context(
            "Timing check failed",
            {"elapsed_ms": submission.elapsed_ms, "ip_hash": _hash_ip(remote_ip)},
        )
        return {"status": "ok"}

    # 4. Store in MongoDB
    # Extract user_id from auth if present (optional — form is public)
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

    try:
        await collection.insert_one(doc.model_dump())
    except Exception as e:
        logger.error(f"Failed to store contact message: {e}")
        raise HTTPException(status_code=500, detail="Failed to process your message")

    # 5. Send email notification (non-fatal)
    try:
        send_contact_notification(
            name=submission.name,
            email=submission.email,
            message=submission.message,
        )
    except Exception as e:
        logger.error(f"Email notification failed: {e}")

    logger.info_with_context(
        "Contact form submission stored",
        {"ip_hash": _hash_ip(remote_ip), "has_user": user_id is not None},
    )

    return {"status": "ok"}
```

Register in `backend/app.py` — add import near other handler imports:

```python
from handlers.contact import router as contact_router
```

Add `app.include_router(contact_router)` after the other `include_router` calls.

**Step 4: Run test to verify it passes**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && source ~/Documents/venvs/field-notes/bin/activate && python -m pytest backend/tests/test_contact_handler.py -v`
Expected: PASS

**Step 5: Run full backend test suite**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && make test`
Expected: All passing

**Step 6: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add backend/handlers/contact.py backend/database.py backend/app.py backend/tests/test_contact_handler.py
git commit -m "feat: add POST /contact endpoint with Turnstile, honeypot, timing, rate limit"
```

---

### Task 4: Next.js API Route

**Files:**
- Create: `frontend/src/pages/api/contact.ts`

**Step 1: Write implementation**

```typescript
// frontend/src/pages/api/contact.ts
import { NextApiRequest, NextApiResponse } from "next";
import { apiLogger } from "@/shared/utils/logger";
import { fetchBackend } from "@/shared/utils/backend-fetch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  apiLogger.logApiRequest(req, res);

  try {
    const response = await fetchBackend("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Fatal error in /api/contact:", error);
    return res.status(500).json({
      detail: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
```

**Step 2: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add frontend/src/pages/api/contact.ts
git commit -m "feat: add Next.js API route for contact form proxy"
```

---

### Task 5: Frontend API Client + Types

**Files:**
- Modify: `frontend/src/shared/types/api.ts` — add `ContactSubmission` interface
- Modify: `frontend/src/shared/lib/api-client.ts` — add `contact.submit()` method

**Step 1: Add types to `frontend/src/shared/types/api.ts`**

Append near other request/response types:

```typescript
/**
 * Contact form submission
 */
export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
  turnstile_token: string;
  honeypot: string;
  elapsed_ms: number;
}

export interface ContactResponse {
  status: string;
}
```

**Step 2: Add to api-client.ts**

Add import of `ContactSubmission` and `ContactResponse` to the existing import block.

Add route:

```typescript
  contact: {
    submit: () => '/api/contact',
  },
```

Add client method:

```typescript
  contact: {
    submit: (data: ContactSubmission) =>
      fetchApi<ContactResponse, ContactSubmission>(apiRoutes.contact.submit(), {
        method: 'POST',
        body: data,
      }),
  },
```

**Step 3: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add frontend/src/shared/types/api.ts frontend/src/shared/lib/api-client.ts
git commit -m "feat: add contact form types and api client method"
```

---

### Task 6: TurnstileWidget Component

**Files:**
- Create: `frontend/src/components/ui/TurnstileWidget.tsx`
- Modify: `frontend/src/components/ui/index.ts` — export it

**Step 1: Write implementation**

```tsx
// frontend/src/components/ui/TurnstileWidget.tsx
import { useEffect, useRef, useCallback } from 'react';

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileWidget({ siteKey, onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme: 'auto',
    });
  }, [siteKey, onVerify, onExpire, onError]);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );

    if (!existingScript) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      document.head.appendChild(script);
    } else {
      const checkReady = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkReady);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(checkReady);
    }
  }, [renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} data-testid="turnstile-widget" />;
}
```

**Step 2: Add export to `frontend/src/components/ui/index.ts`**

```typescript
export { TurnstileWidget } from './TurnstileWidget';
```

**Step 3: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add frontend/src/components/ui/TurnstileWidget.tsx frontend/src/components/ui/index.ts
git commit -m "feat: add reusable TurnstileWidget component"
```

---

### Task 7: HoneypotField Component

**Files:**
- Create: `frontend/src/components/ui/HoneypotField.tsx`
- Modify: `frontend/src/components/ui/index.ts` — export it

**Step 1: Write implementation**

```tsx
// frontend/src/components/ui/HoneypotField.tsx
interface HoneypotFieldProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

export function HoneypotField({ name = 'website', value, onChange }: HoneypotFieldProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        opacity: 0,
        height: 0,
        overflow: 'hidden',
      }}
    >
      <label htmlFor={`hp-${name}`}>{name}</label>
      <input
        id={`hp-${name}`}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
```

**Step 2: Add export to `frontend/src/components/ui/index.ts`**

```typescript
export { HoneypotField } from './HoneypotField';
```

**Step 3: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add frontend/src/components/ui/HoneypotField.tsx frontend/src/components/ui/index.ts
git commit -m "feat: add reusable HoneypotField anti-spam component"
```

---

### Task 8: ContactForm Component

**Files:**
- Create: `frontend/src/modules/static/pages/ContactForm.tsx`
- Modify: `frontend/src/modules/static/pages/ContactPage.tsx` — mount form

**Step 1: Write implementation**

```tsx
// frontend/src/modules/static/pages/ContactForm.tsx
import { useState, useRef, useCallback, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Button, Input, Textarea, FormField, TurnstileWidget, HoneypotField } from '@/components/ui';
import apiClient from '@/shared/lib/api-client';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
  turnstile?: string;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function ContactForm() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.email;

  const [name, setName] = useState('');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const mountTime = useRef(Date.now());

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = 'Name is required';
    else if (name.trim().length > 100) errs.name = 'Name must be 100 characters or less';

    if (!isAuthenticated) {
      if (!email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        errs.email = 'Enter a valid email address';
    }

    if (!message.trim()) errs.message = 'Message is required';
    else if (message.trim().length > 2000) errs.message = 'Message must be 2000 characters or less';

    if (!turnstileToken && TURNSTILE_SITE_KEY) errs.turnstile = 'Please complete the verification';

    return errs;
  }, [name, email, message, turnstileToken, isAuthenticated]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormState('submitting');
    setSubmitError('');

    try {
      await apiClient.contact.submit({
        name: name.trim(),
        email: isAuthenticated ? (session?.user?.email || '') : email.trim(),
        message: message.trim(),
        turnstile_token: turnstileToken,
        honeypot,
        elapsed_ms: Date.now() - mountTime.current,
      });
      setFormState('success');
    } catch {
      setFormState('error');
      setSubmitError('Something went wrong. Please try again later.');
    }
  };

  if (formState === 'success') {
    return (
      <div className="card" data-testid="contact-success">
        <p className="text-text-primary">Thank you for your message. I will get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" data-testid="contact-form" noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <FormField label="Name" htmlFor="contact-name" required error={errors.name}>
          <Input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            error={!!errors.name}
            disabled={formState === 'submitting'}
            data-testid="contact-name"
          />
        </FormField>

        {!isAuthenticated && (
          <FormField label="Email" htmlFor="contact-email" required error={errors.email}>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              disabled={formState === 'submitting'}
              data-testid="contact-email"
            />
          </FormField>
        )}

        <FormField label="Message" htmlFor="contact-message" required error={errors.message}>
          <Textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={6}
            error={!!errors.message}
            disabled={formState === 'submitting'}
            data-testid="contact-message"
          />
        </FormField>

        <HoneypotField value={honeypot} onChange={setHoneypot} />

        {TURNSTILE_SITE_KEY && (
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken('')}
          />
        )}

        {errors.turnstile && (
          <span className="form-field__error" role="alert">{errors.turnstile}</span>
        )}

        {submitError && (
          <span className="form-field__error" role="alert" data-testid="contact-error">
            {submitError}
          </span>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={formState === 'submitting'}
          disabled={formState === 'submitting'}
        >
          Send Message
        </Button>
      </div>
    </form>
  );
}
```

**Step 2: Modify ContactPage.tsx**

Replace the existing `ContactPage.tsx` content. Add `ContactForm` import and render it below the CMS content block. The form should always appear — even when there's no CMS content.

In `frontend/src/modules/static/pages/ContactPage.tsx`, add the import:

```typescript
import { ContactForm } from './ContactForm';
```

Add `<ContactForm />` inside the `page-container` div, after the CMS content cards and before the closing `</div>`:

```tsx
<div style={{ marginTop: 'var(--space-6)' }}>
    <ContactForm />
</div>
```

**Step 3: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add frontend/src/modules/static/pages/ContactForm.tsx frontend/src/modules/static/pages/ContactPage.tsx
git commit -m "feat: add ContactForm component and mount on contact page"
```

---

### Task 9: Frontend Unit Tests

**Files:**
- Create: `frontend/src/__tests__/modules/static/ContactForm.test.tsx`

**Step 1: Write tests**

```tsx
// frontend/src/__tests__/modules/static/ContactForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '@/modules/static/pages/ContactForm';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock api client
vi.mock('@/shared/lib/api-client', () => ({
  default: {
    contact: {
      submit: vi.fn(),
    },
  },
}));

import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';

const mockUseSession = useSession as ReturnType<typeof vi.fn>;
const mockSubmit = apiClient.contact.submit as ReturnType<typeof vi.fn>;

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    mockSubmit.mockResolvedValue({ status: 'ok' });
  });

  it('renders all fields when unauthenticated', () => {
    render(<ContactForm />);
    expect(screen.getByTestId('contact-name')).toBeInTheDocument();
    expect(screen.getByTestId('contact-email')).toBeInTheDocument();
    expect(screen.getByTestId('contact-message')).toBeInTheDocument();
  });

  it('hides email field when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: 'user@example.com' } },
      status: 'authenticated',
    });
    render(<ContactForm />);
    expect(screen.getByTestId('contact-name')).toBeInTheDocument();
    expect(screen.queryByTestId('contact-email')).not.toBeInTheDocument();
    expect(screen.getByTestId('contact-message')).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Message is required')).toBeInTheDocument();
    });
  });

  it('shows success message after submission', async () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByTestId('contact-name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('contact-email'), { target: { value: 'alice@test.com' } });
    fireEvent.change(screen.getByTestId('contact-message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByTestId('contact-success')).toBeInTheDocument();
    });
  });

  it('shows error message on submission failure', async () => {
    mockSubmit.mockRejectedValue(new Error('Network error'));
    render(<ContactForm />);
    fireEvent.change(screen.getByTestId('contact-name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('contact-email'), { target: { value: 'alice@test.com' } });
    fireEvent.change(screen.getByTestId('contact-message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByTestId('contact-error')).toBeInTheDocument();
    });
  });

  it('includes honeypot field in DOM but hidden', () => {
    render(<ContactForm />);
    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement;
    expect(honeypot).toBeTruthy();
    expect(honeypot.tabIndex).toBe(-1);
  });
});
```

**Step 2: Run tests**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && make test-frontend-unit`
Expected: PASS

**Step 3: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add frontend/src/__tests__/modules/static/ContactForm.test.tsx
git commit -m "test: add ContactForm unit tests"
```

---

### Task 10: E2E Tests

**Files:**
- Modify: `frontend/e2e/mock-server.ts` — add `POST /contact` mock
- Modify: `frontend/e2e/fixtures/api-mock.fixture.ts` — add client-side mock
- Create: `frontend/e2e/specs/contact/contact-form.spec.ts`

**Step 1: Add mock endpoint to `mock-server.ts`**

Add handler for `POST /contact`:

```typescript
app.post('/contact', (req, res) => {
  res.json({ status: 'ok' });
});
```

**Step 2: Add client-side mock to `api-mock.fixture.ts`**

Add route for `POST /api/contact`:

```typescript
await page.route('**/api/contact', async (route) => {
  if (route.request().method() === 'POST') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  }
});
```

**Step 3: Write E2E spec**

```typescript
// frontend/e2e/specs/contact/contact-form.spec.ts
import { test, expect } from '../../fixtures';

test.describe('Contact Form', () => {
  test('shows form fields for unauthenticated user', async ({ mockApiPage }) => {
    await mockApiPage.goto('/contact');
    await expect(mockApiPage.page.getByTestId('contact-form')).toBeVisible();
    await expect(mockApiPage.page.getByTestId('contact-name')).toBeVisible();
    await expect(mockApiPage.page.getByTestId('contact-email')).toBeVisible();
    await expect(mockApiPage.page.getByTestId('contact-message')).toBeVisible();
  });

  test('hides email field for authenticated user', async ({ mockAuthenticatedApiPage }) => {
    await mockAuthenticatedApiPage.goto('/contact');
    await expect(mockAuthenticatedApiPage.page.getByTestId('contact-form')).toBeVisible();
    await expect(mockAuthenticatedApiPage.page.getByTestId('contact-name')).toBeVisible();
    await expect(mockAuthenticatedApiPage.page.getByTestId('contact-email')).not.toBeVisible();
    await expect(mockAuthenticatedApiPage.page.getByTestId('contact-message')).toBeVisible();
  });

  test('submits form and shows success message', async ({ mockApiPage }) => {
    await mockApiPage.goto('/contact');
    await mockApiPage.page.getByTestId('contact-name').fill('Alice');
    await mockApiPage.page.getByTestId('contact-email').fill('alice@test.com');
    await mockApiPage.page.getByTestId('contact-message').fill('Hello, this is a test.');
    await mockApiPage.page.getByRole('button', { name: /send message/i }).click();
    await expect(mockApiPage.page.getByTestId('contact-success')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ mockApiPage }) => {
    await mockApiPage.goto('/contact');
    await mockApiPage.page.getByRole('button', { name: /send message/i }).click();
    await expect(mockApiPage.page.getByText('Name is required')).toBeVisible();
    await expect(mockApiPage.page.getByText('Message is required')).toBeVisible();
  });
});
```

**Step 4: Run E2E tests**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && docker compose stop frontend 2>/dev/null; make test-frontend`
Expected: PASS

**Step 5: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add frontend/e2e/
git commit -m "test: add contact form e2e tests with mock endpoints"
```

---

### Task 11: Environment Variables + Deploy Config

**Files:**
- Modify: `.github/workflows/deploy.yml` — add new env vars to backend service
- Update `.env.example` or document in CLAUDE.md (if `.env.example` exists)

**Step 1: Update deploy.yml**

Add these environment variables to the `turbulent-service` deployment step, sourced from GitHub secrets:

- `TURNSTILE_SECRET_KEY`
- `SMTP_USER`
- `SMTP_APP_PASSWORD`
- `CONTACT_NOTIFY_EMAIL`

Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the `turbulent-frontend` build args.

**Step 2: Commit**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add .github/workflows/deploy.yml
git commit -m "chore: add contact form env vars to deploy config"
```

---

### Task 12: Format + Full Test Suite

**Step 1: Run formatter**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && make format`

**Step 2: Run all tests**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form && make test && make test-frontend-unit`

**Step 3: Fix any issues, then commit if formatting changed anything**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/contact-form
git add -A
git commit -m "chore: format"
```
