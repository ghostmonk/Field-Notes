# Contact Form

## Overview

Public contact form on the contact page. Submissions stored in MongoDB and forwarded via Gmail SMTP notification. Multi-layer anti-spam: Cloudflare Turnstile (managed mode), honeypot field, timing check, rate limiting. Authenticated users skip the email field.

## Frontend

### New Files

- `frontend/src/modules/static/pages/ContactForm.tsx` — form component, renders below existing CMS content
- `frontend/src/components/ui/TurnstileWidget.tsx` — reusable Cloudflare Turnstile wrapper
- `frontend/src/components/ui/HoneypotField.tsx` — reusable hidden honeypot field

### Modified Files

- `frontend/src/modules/static/pages/ContactPage.tsx` — mount ContactForm below CMS content
- `frontend/src/shared/lib/api-client.ts` — add `contact.submit()` method

### Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Input (text) | Yes | Max 100 chars |
| Email | Input (email) | If unauthenticated | Hidden + pre-filled from session if logged in |
| Message | Textarea | Yes | Max 2000 chars |
| Honeypot | Input (hidden via CSS) | No | tabindex=-1, autocomplete=off, invisible |
| Turnstile token | Hidden | Yes | Populated by widget callback |
| Timestamp | Hidden | Yes | Set on mount, sent with payload |

### States

- **Idle** — form editable
- **Submitting** — button loading state, form disabled
- **Success** — thank you message replaces form
- **Error** — inline error message, form stays editable

### Reusable Components

`TurnstileWidget` — wraps Cloudflare Turnstile script injection and callback. Props: `siteKey`, `onVerify(token)`, `onExpire()`. Manages script loading, renders the widget container, cleans up on unmount.

`HoneypotField` — renders an input hidden via CSS (`position: absolute; left: -9999px; opacity: 0`). Not `display: none` — bots detect that. Props: `name`, `value`, `onChange`. Sets `tabindex={-1}` and `autoComplete="off"`.

## Backend

### New Files

- `backend/handlers/contact.py` — POST /contact endpoint
- `backend/models/contact.py` — ContactMessage pydantic model + ContactSubmission request model
- `backend/services/email_service.py` — Gmail SMTP sender

### Endpoint: POST /contact

No auth required (public form). Validation chain, fail-fast order:

1. Verify Turnstile token — POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with secret key + token + remote IP
2. Honeypot check — reject if non-empty
3. Timing check — reject if elapsed time < 3 seconds
4. Pydantic validation — name (str, 1-100), email (EmailStr), message (str, 1-2000)
5. Sanitize message — strip all HTML tags
6. Rate limit — 3/hour per IP via slowapi

### MongoDB Document (contact_messages collection)

```json
{
  "name": "str",
  "email": "str",
  "message": "str (HTML stripped)",
  "ip_hash": "str (SHA-256 of IP)",
  "user_id": "str | null",
  "created_at": "datetime",
  "read": false
}
```

IP stored as SHA-256 hash — useful for abuse patterns without raw PII.

### Email Service

- `smtplib.SMTP_SSL` to `smtp.gmail.com:465`
- Plain text email: name, email, message, timestamp
- Failure to send does not fail the request — message already in DB
- Console fallback when SMTP credentials not configured (local dev)

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `TURNSTILE_SITE_KEY` | Frontend (public) | Cloudflare widget |
| `TURNSTILE_SECRET_KEY` | Backend | Token verification |
| `SMTP_USER` | Backend | Gmail sender address |
| `SMTP_APP_PASSWORD` | Backend | Gmail app password |
| `CONTACT_NOTIFY_EMAIL` | Backend | Notification recipient |

Turnstile provides test keys for local dev (always pass). Email skipped locally when SMTP vars absent.

## Security Model

- **Turnstile** — managed mode, invisible 99% of time, Cloudflare maintains the arms race
- **Honeypot** — catches naive bots that fill all fields
- **Timing** — rejects sub-3-second submissions (automated fills)
- **Rate limiting** — 3/hour per IP, existing slowapi infrastructure
- **Input sanitization** — HTML stripped server-side, length limits enforced
- **No data leakage** — generic success/error responses, no internal state exposed
- **IP hashing** — SHA-256, no raw IP stored
- **Pydantic validation** — strict types, email format verified

## Testing

### Backend Unit Tests

- Turnstile verification (mock API, test pass/fail)
- Honeypot rejection
- Timing rejection
- Input validation (name length, email format, message length, HTML stripping)
- Rate limiting
- Email sending (mock SMTP)
- Successful submission flow

### Frontend Unit Tests

- Form renders all fields
- Email field hidden when authenticated
- Email field shown when unauthenticated
- Honeypot present but invisible
- Submit sends correct payload shape
- Success/error states render
- Loading state during submission

### E2E Tests

- Mock `/contact` endpoint in mock-server.ts (SSR) and api-mock.fixture.ts (client-side)
- Unauthenticated submission flow
- Authenticated submission flow (email hidden)
- Validation error display
- Success message display

## Implementation Order

1. Backend models and endpoint (with Turnstile verification, honeypot, timing, rate limit)
2. Email service
3. Frontend TurnstileWidget and HoneypotField reusable components
4. ContactForm component
5. Wire into ContactPage
6. Backend tests
7. Frontend unit tests
8. E2E tests
9. Environment variable docs and deploy.yml updates
