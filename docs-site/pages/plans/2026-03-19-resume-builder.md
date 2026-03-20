# Resume Builder Implementation Plan

**Goal:** Build a resume builder feature into Field Notes — admin-only form for editing resume data stored in MongoDB, with client-side PDF and DOCX download.

**Architecture:** Single `resumes` MongoDB collection stores one resume document per user (keyed by `user_id`, unique). Backend provides CRUD endpoints following existing handler patterns. Frontend provides an admin page with a multi-section form. PDF generation uses `@react-pdf/renderer` (dynamic import, SSR-disabled). DOCX generation uses `docx` npm package. No new section/routing integration — standalone admin page.

**Tech Stack:** FastAPI, MongoDB/motor, Pydantic, React, TypeScript, `@react-pdf/renderer`, `docx`, `file-saver`

---

## Seed Data (Nicholas Hillier)

Contact: Nicholas Hillier, Montreal, nicholas@ghostmonk.com, github.com/ghostmonk
Skills: TypeScript, Python, React, Next.js, FastAPI, MongoDB, Go, C#, .NET, Docker, GCP, Tailwind CSS
Notable repos: Field-Notes (Next.js/FastAPI CMS), financial-tracker (Tauri v2), dotfiles (Neovim/tmux/WezTerm)

---

### Task 1: Backend — Resume Model

**Files:**
- Create: `backend/models/resume.py`

```python
"""Resume Pydantic models."""

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContactInfo(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None


class WorkExperience(BaseModel):
    company: str = Field(..., min_length=1, max_length=200)
    title: str = Field(..., min_length=1, max_length=200)
    start_date: str = Field(..., min_length=1)
    end_date: Optional[str] = None
    current: bool = False
    description: str = Field(default="", max_length=5000)
    technologies: List[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: str = Field(..., min_length=1, max_length=200)
    degree: str = Field(..., min_length=1, max_length=200)
    field_of_study: Optional[str] = None
    start_date: str = Field(..., min_length=1)
    end_date: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=2000)


class ResumeCreate(BaseModel):
    contact: ContactInfo
    summary: str = Field(default="", max_length=2000)
    work_experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)


class ResumeUpdate(BaseModel):
    contact: Optional[ContactInfo] = None
    summary: Optional[str] = Field(default=None, max_length=2000)
    work_experience: Optional[List[WorkExperience]] = None
    education: Optional[List[Education]] = None
    skills: Optional[List[str]] = None


class ResumeResponse(ResumeCreate):
    id: str
    user_id: str
    createdDate: datetime
    updatedDate: datetime

    @field_validator("createdDate", "updatedDate")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)
```

---

### Task 2: Backend — Database Collection Helper

**Files:**
- Modify: `backend/database.py`

Add `get_resumes_collection` function and resume index in `ensure_indexes`.

---

### Task 3: Backend — Resume Handler (CRUD)

**Files:**
- Create: `backend/handlers/resume.py`

Endpoints:
- `GET /resume` — get current user's resume (auth required)
- `POST /resume` — create resume (auth required, one per user)
- `PUT /resume` — update resume (auth required)
- `DELETE /resume` — delete resume (auth required)

No slug, no listing. Single resource per user. Rate limited on mutations.

---

### Task 4: Backend — Register Router

**Files:**
- Modify: `backend/app.py`

Import and include `resume_router`.

---

### Task 5: Backend — Test Fixtures

**Files:**
- Modify: `backend/tests/conftest.py`

Add `mock_resumes_collection`, `override_resumes_database`, `resumes_async_client`, `sample_resume_data` fixtures.

---

### Task 6: Backend — Resume API Tests

**Files:**
- Create: `backend/tests/test_resume_api.py`

Test all CRUD operations, auth requirements, duplicate prevention.

---

### Task 7: Frontend — Resume Types

**Files:**
- Modify: `frontend/src/shared/types/api.ts`

Add `ContactInfo`, `WorkExperience`, `Education`, `Resume`, `CreateResumeRequest`, `UpdateResumeRequest` interfaces.

---

### Task 8: Frontend — API Client Methods

**Files:**
- Modify: `frontend/src/shared/lib/api-client.ts`

Add `resume` namespace with `get`, `create`, `update`, `delete` methods.

---

### Task 9: Frontend — Resume Editor Hook

**Files:**
- Create: `frontend/src/modules/resume/hooks/useResumeEditor.ts`
- Create: `frontend/src/modules/resume/hooks/index.ts`
- Create: `frontend/src/modules/resume/index.ts`

Hook manages form state, CRUD operations, loading/error states.

---

### Task 10: Frontend — Resume Form Components

**Files:**
- Create: `frontend/src/modules/resume/components/ResumeForm.tsx`
- Create: `frontend/src/modules/resume/components/ContactForm.tsx`
- Create: `frontend/src/modules/resume/components/WorkExperienceForm.tsx`
- Create: `frontend/src/modules/resume/components/EducationForm.tsx`
- Create: `frontend/src/modules/resume/components/SkillsForm.tsx`
- Create: `frontend/src/modules/resume/components/index.ts`

Each sub-form is a controlled component receiving data + onChange callback.

---

### Task 11: Frontend — Admin Resume Page

**Files:**
- Create: `frontend/src/pages/admin/resume.tsx`

Admin-only page that renders the resume form with save/load/download buttons.

---

### Task 12: Frontend — PDF Generator

**Files:**
- Create: `frontend/src/modules/resume/generators/pdf-generator.tsx`

Uses `@react-pdf/renderer` to produce PDF from resume data. Dynamically imported.

---

### Task 13: Frontend — DOCX Generator

**Files:**
- Create: `frontend/src/modules/resume/generators/docx-generator.ts`

Uses `docx` + `file-saver` to produce DOCX from resume data.

---

### Task 14: Frontend — Download Buttons Component

**Files:**
- Create: `frontend/src/modules/resume/components/DownloadButtons.tsx`

Two buttons: Download PDF, Download DOCX. Each triggers client-side generation.

---

### Task 15: Install NPM Dependencies

```bash
cd frontend && npm install @react-pdf/renderer docx file-saver && npm install -D @types/file-saver
```

---

### Task 16: Format, Test, Fix

Run `make format`, `make test`, `make test-frontend-unit`, fix any issues.

---

### Task 17: Docs Site Update

**Files:**
- Create: `docs-site/pages/plans/2026-03-19-resume-builder.md` (this file)
- Modify: `docs-site/pages/plans/_meta.ts`
