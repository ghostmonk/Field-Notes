# Dev Auth Mock Implementation Plan

**Goal:** Allow local development without Google OAuth credentials by providing mock authentication with role selection (admin/commenter).

**Architecture:** NextAuth Credentials provider (dev-only) presents a role picker on the sign-in page. It issues tokens prefixed `dev-mock-<role>`. The backend auth decorator recognizes this prefix when `ALLOW_DEV_AUTH=true` is set, skips Google API calls, but still runs the full middleware chain (header extraction, cache, user upsert, role assignment). Two layers prevent production execution: the env var gate and the frontend provider only loading in development.

**Tech Stack:** NextAuth.js Credentials provider, FastAPI auth decorator, Docker Compose env vars

---

### Task 1: Backend — Dev Token Recognition in Auth Decorator

**Files:**
- Modify: `backend/decorators/auth.py:116-185`
- Test: `backend/tests/test_dev_auth.py` (create)

**Step 1: Write the failing tests**

Create `backend/tests/test_dev_auth.py`:

```python
import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient

from decorators.auth import requires_auth

app = FastAPI()


@app.get("/protected")
@requires_auth
async def protected_endpoint(request: Request):
    return {
        "user_id": request.state.user.id,
        "email": request.state.user.email,
        "role": request.state.user.role,
    }


DEV_TOKEN_PREFIX = "dev-mock-"

DEV_USERS = {
    "admin": {
        "email": "dev-admin@localhost",
        "name": "Dev Admin",
        "role": "admin",
    },
    "commenter": {
        "email": "dev-commenter@localhost",
        "name": "Dev Commenter",
        "role": "commenter",
    },
}


@pytest.fixture
def enable_dev_auth():
    with patch.dict(os.environ, {"ALLOW_DEV_AUTH": "true"}):
        yield


@pytest.fixture
def disable_dev_auth():
    with patch.dict(os.environ, {"ALLOW_DEV_AUTH": ""}, clear=False):
        yield


@pytest.fixture
def mock_users_for_dev():
    from bson import ObjectId

    async def mock_get_collection():
        collection = AsyncMock()
        collection.find_one_and_update.return_value = {
            "_id": ObjectId(),
            "email": "dev-admin@localhost",
            "name": "Dev Admin",
            "role": "admin",
            "auth_providers": [],
        }
        return collection

    with patch("decorators.auth.get_users_collection", mock_get_collection):
        yield


@pytest.mark.asyncio
async def test_dev_token_admin_accepted_when_enabled(enable_dev_auth, mock_users_for_dev):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": "Bearer dev-mock-admin"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "dev-admin@localhost"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_dev_token_commenter_accepted_when_enabled(enable_dev_auth, mock_users_for_dev):
    from bson import ObjectId

    async def mock_get_collection():
        collection = AsyncMock()
        collection.find_one_and_update.return_value = {
            "_id": ObjectId(),
            "email": "dev-commenter@localhost",
            "name": "Dev Commenter",
            "role": "commenter",
            "auth_providers": [],
        }
        return collection

    with patch("decorators.auth.get_users_collection", mock_get_collection):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/protected",
                headers={"Authorization": "Bearer dev-mock-commenter"},
            )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "dev-commenter@localhost"
    assert data["role"] == "commenter"


@pytest.mark.asyncio
async def test_dev_token_rejected_when_disabled(disable_dev_auth):
    """Dev tokens must be rejected when ALLOW_DEV_AUTH is not set."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": "Bearer dev-mock-admin"},
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dev_token_invalid_role_rejected(enable_dev_auth):
    """Dev tokens with unknown roles must be rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/protected",
            headers={"Authorization": "Bearer dev-mock-superadmin"},
        )
    assert response.status_code == 401
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_dev_auth.py -v`
Expected: FAIL — no dev token handling exists yet.

**Step 3: Implement dev token handling**

Modify `backend/decorators/auth.py`. Add constants and a dev token handler before `verify_auth_and_get_user`:

```python
# Dev auth constants — only active when ALLOW_DEV_AUTH=true
DEV_TOKEN_PREFIX = "dev-mock-"
_DEV_USERS = {
    "admin": {"email": "dev-admin@localhost", "name": "Dev Admin"},
    "commenter": {"email": "dev-commenter@localhost", "name": "Dev Commenter"},
}


async def _handle_dev_token(token: str) -> UserInfo | None:
    """Authenticate using a dev mock token. Returns None if not a dev token."""
    if not token.startswith(DEV_TOKEN_PREFIX):
        return None

    if os.environ.get("ALLOW_DEV_AUTH") != "true":
        raise HTTPException(status_code=401, detail="Dev auth is not enabled.")

    role = token[len(DEV_TOKEN_PREFIX):]
    dev_user = _DEV_USERS.get(role)
    if not dev_user:
        raise HTTPException(status_code=401, detail=f"Unknown dev role: {role}")

    return await get_or_create_user(
        email=dev_user["email"],
        name=dev_user["name"],
        avatar_url=None,
        provider_user_id=f"dev-{role}",
    )
```

Then in `verify_auth_and_get_user`, after `_extract_bearer_token` and cache check, add:

```python
    # Dev token bypass — only when ALLOW_DEV_AUTH=true
    dev_user = await _handle_dev_token(token)
    if dev_user:
        _cache_user(token, dev_user)
        return dev_user
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_dev_auth.py -v`
Expected: All 4 tests PASS.

**Step 5: Run full test suite**

Run: `cd backend && python -m pytest -x -q`
Expected: All existing tests still pass.

**Step 6: Commit**

```bash
git add backend/decorators/auth.py backend/tests/test_dev_auth.py
git commit -m "feat: dev token auth bypass gated on ALLOW_DEV_AUTH"
```

---

### Task 2: Frontend — Credentials Provider for Dev Login

**Files:**
- Modify: `frontend/src/pages/api/auth/[...nextauth].ts`
- Modify: `frontend/src/shared/lib/auth.ts`

**Step 1: Add dev auth constants to shared auth module**

In `frontend/src/shared/lib/auth.ts`, add:

```typescript
export const REFRESH_TOKEN_ERROR = 'RefreshTokenError' as const;

export const DEV_TOKEN_PREFIX = 'dev-mock-';

export const DEV_USERS = {
    admin: { name: 'Dev Admin', email: 'dev-admin@localhost' },
    commenter: { name: 'Dev Commenter', email: 'dev-commenter@localhost' },
} as const;

export type DevRole = keyof typeof DEV_USERS;
```

**Step 2: Add Credentials provider to NextAuth config**

In `frontend/src/pages/api/auth/[...nextauth].ts`, add `CredentialsProvider` import and conditionally include it in the providers array:

```typescript
import CredentialsProvider from "next-auth/providers/credentials";
import { DEV_TOKEN_PREFIX, DEV_USERS, type DevRole } from "@/shared/lib/auth";

// Build providers list — dev credentials only in development
const providers = [
    GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
            params: {
                scope: "openid email profile",
                access_type: "offline",
                prompt: "consent",
            },
        },
    }),
];

if (process.env.NODE_ENV === 'development') {
    providers.push(
        CredentialsProvider({
            id: "dev-credentials",
            name: "Dev Login",
            credentials: {
                role: { label: "Role", type: "text" },
            },
            async authorize(credentials) {
                const role = credentials?.role as DevRole;
                const devUser = DEV_USERS[role];
                if (!devUser) return null;

                return {
                    id: `dev-${role}`,
                    name: devUser.name,
                    email: devUser.email,
                    image: null,
                };
            },
        }) as any,
    );
}
```

Then update the `jwt` callback to handle credentials sign-in (no Google tokens, just the dev mock token):

```typescript
async jwt({ token, account, user }) {
    if (account) {
        if (account.provider === 'dev-credentials') {
            // Dev login — use mock token, skip Google token flow
            const role = user.id?.replace('dev-', '') || 'commenter';
            token.accessToken = `${DEV_TOKEN_PREFIX}${role}`;
            token.accessTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
            // Fetch role from backend via /me (uses the dev token)
            // ... same backend call as Google flow ...
        } else {
            // Google sign-in — existing flow
            token.accessToken = account.access_token;
            // ... rest unchanged ...
        }
    }
    // ... rest of jwt callback unchanged ...
}
```

**Step 3: Update session callback**

The `session` callback needs the `user` parameter added to get dev user info. The Credentials provider passes user data through differently than OAuth — it comes via the `user` param on initial sign-in, not from the account. This is already handled by the jwt callback storing `userId` and `userRole` from the `/me` backend call.

No changes needed to the session callback if the `/me` endpoint works with dev tokens (handled by Task 1).

**Step 4: Commit**

```bash
git add frontend/src/shared/lib/auth.ts frontend/src/pages/api/auth/\\[...nextauth\\].ts
git commit -m "feat: add dev Credentials provider for local auth"
```

---

### Task 3: Frontend — Sign-in UI with Role Selection

**Files:**
- Modify: `frontend/src/layout/TopNav.tsx`

**Step 1: Update sign-in button for dev mode**

The current sign-in button calls `signIn("google")`. In development, replace it with role selection buttons:

```typescript
const isDev = process.env.NODE_ENV === 'development';

// In the JSX:
{isDev ? (
    <>
        <button
            onClick={() => signIn("dev-credentials", { role: "admin", callbackUrl: "/" })}
            className="btn btn--primary"
            data-testid="signin-dev-admin"
        >
            Dev Admin
        </button>
        <button
            onClick={() => signIn("dev-credentials", { role: "commenter", callbackUrl: "/" })}
            className="btn btn--secondary"
            data-testid="signin-dev-commenter"
        >
            Dev Commenter
        </button>
    </>
) : (
    <button
        onClick={() => signIn("google")}
        className="btn btn--primary"
        data-testid="signin-button"
    >
        Sign in
    </button>
)}
```

**Step 2: Verify manually**

Run: `make dev-local`
- Navigate to site
- Two buttons should appear: "Dev Admin" and "Dev Commenter"
- Clicking either should sign in immediately (no Google redirect)
- Session should show correct role
- Admin should see editor/admin UI
- Commenter should see restricted UI

**Step 3: Commit**

```bash
git add frontend/src/layout/TopNav.tsx
git commit -m "feat: dev role picker buttons in TopNav"
```

---

### Task 4: Docker Compose — Set ALLOW_DEV_AUTH

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

**Step 1: Add ALLOW_DEV_AUTH to backend service**

In `docker-compose.yml`, add to backend environment:

```yaml
    environment:
      # ... existing vars ...
      - ALLOW_DEV_AUTH=true
```

**Step 2: Document in .env.example**

Add to `.env.example`:

```bash
# Dev auth — set to "true" for local mock SSO (NEVER set in production)
ALLOW_DEV_AUTH=true
```

**Step 3: Verify deploy.yml does NOT set ALLOW_DEV_AUTH**

Read `.github/workflows/deploy.yml` and confirm the `--set-env-vars` line does not include `ALLOW_DEV_AUTH`. This is the production safety guarantee.

**Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: enable ALLOW_DEV_AUTH in local Docker Compose"
```

---

### Task 5: NextAuth Session Strategy for Credentials

**Files:**
- Modify: `frontend/src/pages/api/auth/[...nextauth].ts`

**Step 1: Set session strategy to jwt**

NextAuth's Credentials provider requires `session: { strategy: "jwt" }` to be explicit (it defaults to "jwt" when no database adapter is present, but best to be explicit since adding Credentials changes NextAuth behavior):

```typescript
export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    providers: [
        // ...
    ],
    // ...
};
```

**Step 2: Verify locally**

Run: `make dev-local`
- Sign in via dev admin button
- Refresh page — session should persist
- Check browser cookies — should see `next-auth.session-token` JWT cookie

**Step 3: Commit**

```bash
git add frontend/src/pages/api/auth/\\[...nextauth\\].ts
git commit -m "fix: explicit jwt session strategy for credentials provider"
```

---

### Task 6: Formatting + Full Test Suite

**Step 1: Format**

Run: `make format`

**Step 2: Run backend tests**

Run: `make test`
Expected: All tests pass including new dev auth tests.

**Step 3: Run frontend lint + type check**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: Clean.

**Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "style: format"
```

---

### Task 7: Documentation — CLAUDE.md + .env.example

**Step 1: Update CLAUDE.md**

Add to the Environment Setup section, after the existing env var docs:

```markdown
### Dev Authentication

Local development supports mock authentication without Google OAuth credentials.
Set `ALLOW_DEV_AUTH=true` in the backend environment (Docker Compose sets this automatically).
The frontend shows role-picker buttons (Admin/Commenter) instead of Google Sign-In when
`NODE_ENV=development`. Dev tokens use the `dev-mock-<role>` prefix and `@localhost` emails.

**Safety:** Two layers prevent production execution:
1. Backend rejects dev tokens unless `ALLOW_DEV_AUTH=true` (never set in deploy.yml)
2. Frontend Credentials provider only loads when `NODE_ENV=development`
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document dev auth mock system"
```
