# Resume Tailoring Phase 3: Feedback Loop Implementation Plan

**Goal:** Add approve/reject/edit/flag feedback on tailored resumes. Feedback is stored in MongoDB, embedded in Qdrant as voice examples or anti-patterns, and retrieved during future tailoring to improve output quality.

**Architecture:** New `voice_feedback` MongoDB collection stores feedback entries. On submit, approved/edited text is embedded via Voyage AI and upserted to Qdrant with `chunk_type: "voice_example"` or `"anti_pattern"`. The existing tailoring pipeline's retrieval step will pick these up automatically via source filtering. Frontend adds feedback buttons to the existing `/admin/tailor` page.

**Tech Stack:** Python, FastAPI, MongoDB (motor), Voyage AI (existing), Qdrant (existing), React, TypeScript, Next.js

---

### Task 1: Voice feedback Pydantic model

**Files:**
- Create: `backend/models/voice_feedback.py`

**Step 1: Write the model**

```python
"""Voice feedback models for resume tailoring quality loop."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class VoiceFeedbackCreate(BaseModel):
    original_text: str = Field(..., min_length=1)
    final_text: Optional[str] = None
    feedback_type: str = Field(..., pattern="^(approved|rejected|edited|flagged)$")
    job_context: str = Field(..., min_length=1)
    note: Optional[str] = None
    section_type: Optional[str] = None


class VoiceFeedbackResponse(VoiceFeedbackCreate):
    id: str
    user_id: str
    qdrant_id: Optional[str] = None
    created_at: datetime
```

**Step 2: Commit**

```bash
git add backend/models/voice_feedback.py
git commit -m "feat: add voice feedback Pydantic model"
```

---

### Task 2: Database collection getter and indexes

**Files:**
- Modify: `backend/database.py`

**Step 1: Add collection getter**

Add `get_voice_feedback_collection` async function following existing pattern.

**Step 2: Add indexes in ensure_indexes**

Add indexes on `user_id`, `feedback_type`, and `job_context`.

**Step 3: Commit**

```bash
git add backend/database.py
git commit -m "feat: add voice_feedback collection getter and indexes"
```

---

### Task 3: Voice feedback handler — POST and GET

**Files:**
- Create: `backend/handlers/voice_feedback.py`
- Create: `backend/tests/test_voice_feedback_api.py`
- Modify: `backend/app.py` — register router
- Modify: `backend/tests/conftest.py` — register router in test_app

**Step 1: Write failing tests**

Tests for:
- POST /voice/feedback requires auth (401)
- POST /voice/feedback creates entry and returns it
- POST /voice/feedback with feedback_type "approved" triggers Qdrant embedding
- GET /voice/feedback requires auth (401)
- GET /voice/feedback returns user's feedback entries

**Step 2: Write the handler**

- POST /voice/feedback — validates input, stores in MongoDB, embeds approved/edited text in Qdrant as voice_example, embeds rejected/flagged text as anti_pattern
- GET /voice/feedback — lists feedback for authenticated user, with optional feedback_type filter

**Step 3: Register router in app.py and conftest.py**

**Step 4: Run tests, format, commit**

---

### Task 4: Frontend — feedback buttons on tailor page

**Files:**
- Create: `frontend/src/pages/api/voice/feedback.ts` — API proxy route
- Modify: `frontend/src/shared/types/api.ts` — add feedback types
- Modify: `frontend/src/shared/lib/api-client.ts` — add feedback methods
- Modify: `frontend/src/pages/admin/tailor.tsx` — add feedback UI

**Step 1: Add API proxy route**

**Step 2: Add types and api-client methods**

**Step 3: Add feedback buttons to tailor page**

After tailoring results are shown, display:
- "Approve" — saves all resume sections as approved voice examples
- "Reject" — saves output as anti-pattern
- "Flag" — opens note input, saves with note
- Success/error feedback after submission

**Step 4: Commit**

---

### Task 5: Wire feedback into retrieval pipeline

**Files:**
- Modify: `backend/services/tailoring_pipeline.py` — retrieve voice examples alongside content chunks

**Step 1: Update retrieval to include voice_feedback source**

Add a second Qdrant search for `source: "voice_feedback"` chunks, filtered by user_id. Pass these to the generator as voice context.

**Step 2: Update generator prompt to include voice examples**

Add voice examples section to the prompt when available.

**Step 3: Test and commit**

---

### Task 6: Format, full test suite, docs update

**Step 1: make format**
**Step 2: make test**
**Step 3: make test-frontend-unit**
**Step 4: Update _meta.ts with this plan**
**Step 5: Commit**
