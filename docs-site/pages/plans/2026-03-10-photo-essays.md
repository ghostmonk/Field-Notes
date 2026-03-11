# Photo Essays Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add photo essay support — themed photo collections with mosaic display, cover-image landing page, and navigable fullscreen viewer.

**Architecture:** New `photo_essay` content type backed by a `photo_essays` MongoDB collection. Each document embeds an ordered array of photo objects (url, srcset, caption, dimensions). Frontend adds `GalleryDisplay` to the display registry, a masonry `PhotoEssayPage` for detail view, and extends the existing `useImageZoom` hook with prev/next navigation for sequential viewing. A dedicated admin editor handles bulk upload, drag-to-reorder, and per-image captions.

**Tech Stack:** FastAPI + MongoDB (backend), Next.js + TypeScript + Tailwind (frontend), medium-zoom (extended), existing `/upload` endpoint for image processing.

---

## Task 1: Backend Migration — Rename `image` to `photo_essay`

**Files:**
- Create: `backend/migrations/0009_rename_image_to_photo_essay.py`
- Modify: `backend/models/section.py:11`

**Step 1: Write the migration**

```python
name = "0009_rename_image_to_photo_essay"
dependencies = ["0008_create_versions_collection"]


def upgrade(db):
    db.sections.update_many(
        {"content_type": "image"},
        {"$set": {"content_type": "photo_essay"}},
    )


def downgrade(db):
    db.sections.update_many(
        {"content_type": "photo_essay"},
        {"$set": {"content_type": "image"}},
    )
```

**Step 2: Update ContentType literal**

In `backend/models/section.py:11`, change:
```python
ContentType = Literal["story", "project", "page", "image"]
```
to:
```python
ContentType = Literal["story", "project", "page", "photo_essay"]
```

**Step 3: Run migration and verify**

```bash
make migrate-up
```

**Step 4: Commit**

```bash
git add backend/migrations/0009_rename_image_to_photo_essay.py backend/models/section.py
git commit -m "migration: rename image content type to photo_essay"
```

---

## Task 2: Backend Model — PhotoEssay

**Files:**
- Create: `backend/models/photo_essay.py`

**Step 1: Write model tests**

Create `backend/tests/test_photo_essay_models.py`:

```python
import pytest
from pydantic import ValidationError
from models.photo_essay import (
    PhotoEssayCreate,
    PhotoEssayResponse,
    PhotoEssayUpdate,
    PhotoItem,
)
from datetime import datetime, timezone


class TestPhotoItem:
    def test_valid_photo_item(self):
        item = PhotoItem(
            url="https://example.com/photo.jpg",
            width=1920,
            height=1080,
            sort_order=0,
        )
        assert item.url == "https://example.com/photo.jpg"
        assert item.caption is None
        assert item.srcset is None

    def test_photo_item_with_caption(self):
        item = PhotoItem(
            url="https://example.com/photo.jpg",
            width=800,
            height=600,
            sort_order=1,
            caption="A sunset",
            srcset="photo-400.jpg 400w, photo-800.jpg 800w",
        )
        assert item.caption == "A sunset"
        assert item.srcset is not None

    def test_photo_item_requires_dimensions(self):
        with pytest.raises(ValidationError):
            PhotoItem(url="https://example.com/photo.jpg", sort_order=0)

    def test_photo_item_positive_dimensions(self):
        with pytest.raises(ValidationError):
            PhotoItem(url="https://example.com/photo.jpg", width=0, height=100, sort_order=0)


class TestPhotoEssayCreate:
    def test_valid_create(self):
        essay = PhotoEssayCreate(
            title="My Trip to Japan",
            cover_image_url="https://example.com/cover.jpg",
            photos=[
                PhotoItem(url="https://example.com/1.jpg", width=1920, height=1080, sort_order=0),
            ],
        )
        assert essay.title == "My Trip to Japan"
        assert essay.is_published is False
        assert essay.description is None

    def test_create_requires_title(self):
        with pytest.raises(ValidationError):
            PhotoEssayCreate(
                title="",
                cover_image_url="https://example.com/cover.jpg",
                photos=[],
            )

    def test_create_requires_cover_image(self):
        with pytest.raises(ValidationError):
            PhotoEssayCreate(title="Test", photos=[])


class TestPhotoEssayUpdate:
    def test_all_fields_optional(self):
        update = PhotoEssayUpdate()
        assert update.title is None
        assert update.photos is None

    def test_partial_update(self):
        update = PhotoEssayUpdate(title="New Title")
        assert update.title == "New Title"
        assert update.description is None


class TestPhotoEssayResponse:
    def test_response_model(self):
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        response = PhotoEssayResponse(
            id="abc123",
            title="Test Essay",
            cover_image_url="https://example.com/cover.jpg",
            photos=[],
            is_published=True,
            section_id="section1",
            user_id="user1",
            createdDate=now,
            updatedDate=now,
        )
        assert response.id == "abc123"
        assert response.section_id == "section1"
```

**Step 2: Run tests to verify they fail**

```bash
make test -- -k "test_photo_essay_models" -v
```

Expected: ImportError — `models.photo_essay` does not exist.

**Step 3: Write the model**

Create `backend/models/photo_essay.py`:

```python
"""Photo essay Pydantic models."""

from datetime import datetime, timezone
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PhotoItem(BaseModel):
    """Single photo within an essay."""

    url: str = Field(..., min_length=1)
    srcset: str | None = None
    caption: str | None = None
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)
    sort_order: int = Field(..., ge=0)


class PhotoEssayCreate(BaseModel):
    """Input for creating a photo essay."""

    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    cover_image_url: str = Field(..., min_length=1)
    photos: List[PhotoItem] = Field(default_factory=list)
    section_id: str | None = None
    is_published: bool = False


class PhotoEssayUpdate(BaseModel):
    """Input for updating a photo essay. All fields optional."""

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    cover_image_url: str | None = None
    photos: List[PhotoItem] | None = None
    is_published: bool | None = None


class PhotoEssayResponse(BaseModel):
    """API response model for a photo essay."""

    id: str
    title: str
    description: str | None = None
    cover_image_url: str
    photos: List[PhotoItem] = Field(default_factory=list)
    is_published: bool
    section_id: str | None = None
    user_id: str | None = None
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


class PhotoEssayCard(BaseModel):
    """Lightweight model for listing photo essays (no embedded photos)."""

    id: str
    title: str
    description: str | None = None
    cover_image_url: str
    is_published: bool
    photo_count: int = 0
    section_id: str | None = None
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

**Step 4: Run tests to verify they pass**

```bash
make test -- -k "test_photo_essay_models" -v
```

Expected: All pass.

**Step 5: Commit**

```bash
git add backend/models/photo_essay.py backend/tests/test_photo_essay_models.py
git commit -m "feat: add photo essay pydantic models"
```

---

## Task 3: Backend Handler — PhotoEssay CRUD

**Files:**
- Create: `backend/handlers/photo_essays.py`
- Create: `backend/tests/test_photo_essays_api.py`
- Modify: `backend/app.py:11-22` (add import) and `backend/app.py:223-233` (mount router)

**Step 1: Write API tests**

Create `backend/tests/test_photo_essays_api.py`. Follow the patterns in `test_stories_api.py` and `test_projects_api.py`. The test file needs:

- Fixtures in `conftest.py`: add `mock_photo_essays_collection`, `override_photo_essays_database`, `photo_essays_async_client` following the existing pattern for projects (see `conftest.py:169-227`).
- Test classes:

```python
import pytest
from bson import ObjectId
from datetime import datetime, timezone
from httpx import AsyncClient


class TestPhotoEssaysPublicEndpoints:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_list_photo_essays_by_section(
        self, photo_essays_async_client: AsyncClient, override_photo_essays_database
    ):
        section_id = str(ObjectId())
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        test_essays = [
            {
                "_id": ObjectId(),
                "title": "Trip to Japan",
                "description": "Cherry blossoms",
                "cover_image_url": "https://example.com/cover.jpg",
                "photos": [
                    {"url": "https://example.com/1.jpg", "width": 1920, "height": 1080, "sort_order": 0}
                ],
                "is_published": True,
                "section_id": section_id,
                "user_id": str(ObjectId()),
                "created_at": now,
                "updated_at": now,
            }
        ]

        override_photo_essays_database.count_documents.return_value = 1
        override_photo_essays_database.find.return_value = MockCursor(test_essays)

        response = await photo_essays_async_client.get(
            f"/photo-essays/section/{section_id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Trip to Japan"
        # List endpoint should not include photos array
        assert "photos" not in data["items"][0]

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_photo_essay_by_id(
        self, photo_essays_async_client: AsyncClient, override_photo_essays_database
    ):
        essay_id = ObjectId()
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        test_essay = {
            "_id": essay_id,
            "title": "West Coast Trail",
            "cover_image_url": "https://example.com/cover.jpg",
            "photos": [
                {"url": "https://example.com/1.jpg", "width": 1920, "height": 1080, "sort_order": 0, "caption": "Start"},
            ],
            "is_published": True,
            "section_id": str(ObjectId()),
            "user_id": str(ObjectId()),
            "created_at": now,
            "updated_at": now,
        }

        override_photo_essays_database.find_one.return_value = test_essay

        response = await photo_essays_async_client.get(f"/photo-essays/{str(essay_id)}")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "West Coast Trail"
        assert len(data["photos"]) == 1
        assert data["photos"][0]["caption"] == "Start"

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_get_nonexistent_essay_returns_404(
        self, photo_essays_async_client: AsyncClient, override_photo_essays_database
    ):
        override_photo_essays_database.find_one.return_value = None
        response = await photo_essays_async_client.get(f"/photo-essays/{str(ObjectId())}")
        assert response.status_code == 404


class TestPhotoEssaysAuthenticatedEndpoints:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_create_photo_essay(
        self, photo_essays_async_client: AsyncClient, override_photo_essays_database
    ):
        essay_id = ObjectId()
        override_photo_essays_database.insert_one.return_value = type("Result", (), {"inserted_id": essay_id})()
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        override_photo_essays_database.find_one.return_value = {
            "_id": essay_id,
            "title": "New Essay",
            "cover_image_url": "https://example.com/cover.jpg",
            "photos": [],
            "is_published": False,
            "section_id": str(ObjectId()),
            "user_id": "admin-user-id",
            "created_at": now,
            "updated_at": now,
        }

        response = await photo_essays_async_client.post(
            "/photo-essays",
            json={
                "title": "New Essay",
                "cover_image_url": "https://example.com/cover.jpg",
                "photos": [],
                "section_id": str(ObjectId()),
            },
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 201

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_update_photo_essay(
        self, photo_essays_async_client: AsyncClient, override_photo_essays_database
    ):
        essay_id = ObjectId()
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        existing = {
            "_id": essay_id,
            "title": "Old Title",
            "cover_image_url": "https://example.com/cover.jpg",
            "photos": [],
            "is_published": False,
            "section_id": str(ObjectId()),
            "user_id": "admin-user-id",
            "created_at": now,
            "updated_at": now,
        }
        override_photo_essays_database.find_one.return_value = existing
        override_photo_essays_database.update_one.return_value = type("Result", (), {"modified_count": 1})()

        response = await photo_essays_async_client.put(
            f"/photo-essays/{str(essay_id)}",
            json={"title": "Updated Title"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_delete_photo_essay(
        self, photo_essays_async_client: AsyncClient, override_photo_essays_database
    ):
        essay_id = ObjectId()
        now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        existing = {
            "_id": essay_id,
            "title": "To Delete",
            "cover_image_url": "https://example.com/cover.jpg",
            "photos": [],
            "is_published": False,
            "section_id": str(ObjectId()),
            "user_id": "admin-user-id",
            "created_at": now,
            "updated_at": now,
        }
        override_photo_essays_database.find_one.return_value = existing
        override_photo_essays_database.update_one.return_value = type("Result", (), {"modified_count": 1})()

        response = await photo_essays_async_client.delete(
            f"/photo-essays/{str(essay_id)}",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 204
```

**Step 2: Run tests to verify they fail**

```bash
make test -- -k "test_photo_essays_api" -v
```

**Step 3: Add test fixtures to `conftest.py`**

Follow the exact pattern from the existing `mock_projects_collection` / `override_projects_database` / `projects_async_client` fixtures (lines 169-227). Add:

- `mock_photo_essays_collection` fixture
- `override_photo_essays_database` fixture that overrides `get_collection` for `"photo_essays"`
- `photo_essays_async_client` fixture

Also add `photo_essays_router` import and `test_app.include_router(photo_essays_router)`.

**Step 4: Write the handler**

Create `backend/handlers/photo_essays.py`. Follow the patterns in `handlers/stories.py`:

```python
"""Photo essay CRUD handler."""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from database import get_collection
from middleware.auth import requires_auth, verify_auth_and_get_user
from middleware.rate_limit import rate_limit
from models.photo_essay import (
    PhotoEssayCard,
    PhotoEssayCreate,
    PhotoEssayResponse,
    PhotoEssayUpdate,
)
from utils import find_one_and_convert, mongo_to_pydantic

router = APIRouter()


@router.get("/photo-essays/section/{section_id}")
async def list_photo_essays(
    section_id: str,
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0, ge=0),
    include_drafts: bool = Query(default=False),
):
    collection = get_collection("photo_essays")

    query = {"section_id": section_id, "deleted": {"$ne": True}}
    if not include_drafts:
        query["is_published"] = True

    total = await collection.count_documents(query)

    cursor = collection.find(
        query,
        projection={"photos": 0},  # Exclude photos array from listing
    ).sort("created_at", -1).skip(offset).limit(limit)

    items = []
    async for doc in cursor:
        doc["photo_count"] = 0  # Will be set via aggregation or stored field
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        if "created_at" in doc:
            doc["createdDate"] = doc["created_at"]
        if "updated_at" in doc:
            doc["updatedDate"] = doc["updated_at"]
        items.append(PhotoEssayCard.model_validate(doc))

    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/photo-essays/{essay_id}", response_model=PhotoEssayResponse)
async def get_photo_essay(essay_id: str):
    if not ObjectId.is_valid(essay_id):
        raise HTTPException(status_code=400, detail="Invalid essay ID")

    collection = get_collection("photo_essays")
    doc = await collection.find_one(
        {"_id": ObjectId(essay_id), "deleted": {"$ne": True}}
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Photo essay not found")

    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    if "created_at" in doc:
        doc["createdDate"] = doc["created_at"]
    if "updated_at" in doc:
        doc["updatedDate"] = doc["updated_at"]

    return PhotoEssayResponse.model_validate(doc)


@router.post("/photo-essays", status_code=201, response_model=PhotoEssayResponse)
@requires_auth
@rate_limit(max_requests=10, window_seconds=60)
async def create_photo_essay(request: Request, data: PhotoEssayCreate):
    user = await verify_auth_and_get_user(request)
    collection = get_collection("photo_essays")

    now = datetime.now(timezone.utc)
    doc = {
        **data.model_dump(),
        "photos": [p.model_dump() for p in data.photos],
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now,
        "deleted": False,
    }

    result = await collection.insert_one(doc)
    created = await collection.find_one({"_id": result.inserted_id})

    if "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]
    if "created_at" in created:
        created["createdDate"] = created["created_at"]
    if "updated_at" in created:
        created["updatedDate"] = created["updated_at"]

    return PhotoEssayResponse.model_validate(created)


@router.put("/photo-essays/{essay_id}", response_model=PhotoEssayResponse)
@requires_auth
@rate_limit(max_requests=10, window_seconds=60)
async def update_photo_essay(request: Request, essay_id: str, data: PhotoEssayUpdate):
    if not ObjectId.is_valid(essay_id):
        raise HTTPException(status_code=400, detail="Invalid essay ID")

    collection = get_collection("photo_essays")
    existing = await collection.find_one(
        {"_id": ObjectId(essay_id), "deleted": {"$ne": True}}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Photo essay not found")

    update_data = data.model_dump(exclude_none=True)
    if "photos" in update_data:
        update_data["photos"] = [
            p.model_dump() if hasattr(p, "model_dump") else p
            for p in update_data["photos"]
        ]

    update_data["updated_at"] = datetime.now(timezone.utc)

    await collection.update_one(
        {"_id": ObjectId(essay_id)},
        {"$set": update_data},
    )

    updated = await collection.find_one({"_id": ObjectId(essay_id)})

    if "_id" in updated:
        updated["id"] = str(updated["_id"])
        del updated["_id"]
    if "created_at" in updated:
        updated["createdDate"] = updated["created_at"]
    if "updated_at" in updated:
        updated["updatedDate"] = updated["updated_at"]

    return PhotoEssayResponse.model_validate(updated)


@router.delete("/photo-essays/{essay_id}", status_code=204)
@requires_auth
@rate_limit(max_requests=5, window_seconds=60)
async def delete_photo_essay(request: Request, essay_id: str):
    if not ObjectId.is_valid(essay_id):
        raise HTTPException(status_code=400, detail="Invalid essay ID")

    collection = get_collection("photo_essays")
    existing = await collection.find_one(
        {"_id": ObjectId(essay_id), "deleted": {"$ne": True}}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Photo essay not found")

    await collection.update_one(
        {"_id": ObjectId(essay_id)},
        {"$set": {"deleted": True, "updated_at": datetime.now(timezone.utc)}},
    )
```

**Step 5: Register router in `app.py`**

Add import at `backend/app.py:11-22`:
```python
from handlers.photo_essays import router as photo_essays_router
```

Add to router mounting at `backend/app.py:223-233`:
```python
app.include_router(photo_essays_router)
```

**Step 6: Run tests**

```bash
make test -- -k "test_photo_essays_api" -v
```

Expected: All pass.

**Step 7: Commit**

```bash
git add backend/handlers/photo_essays.py backend/tests/test_photo_essays_api.py backend/tests/conftest.py backend/app.py
git commit -m "feat: add photo essay CRUD endpoints"
```

---

## Task 4: Frontend Types and API Client

**Files:**
- Modify: `frontend/src/shared/types/api.ts:154-155`
- Modify: `frontend/src/shared/lib/api-client.ts`
- Modify: `frontend/src/pages/admin/sections.tsx:12-13`

**Step 1: Update API types**

In `frontend/src/shared/types/api.ts`, change line 155:
```typescript
export type SectionContentType = 'story' | 'project' | 'page' | 'image';
```
to:
```typescript
export type SectionContentType = 'story' | 'project' | 'page' | 'photo_essay';
```

Add new interfaces after the Section interface:

```typescript
export interface PhotoItem {
    url: string;
    srcset?: string;
    caption?: string;
    width: number;
    height: number;
    sort_order: number;
}

export interface PhotoEssay {
    id: string;
    title: string;
    description?: string;
    cover_image_url: string;
    photos: PhotoItem[];
    is_published: boolean;
    section_id?: string;
    user_id?: string;
    createdDate: string;
    updatedDate: string;
}

export interface PhotoEssayCard {
    id: string;
    title: string;
    description?: string;
    cover_image_url: string;
    is_published: boolean;
    photo_count: number;
    section_id?: string;
    createdDate: string;
    updatedDate: string;
}

export interface CreatePhotoEssayRequest {
    title: string;
    description?: string;
    cover_image_url: string;
    photos: PhotoItem[];
    section_id?: string;
    is_published?: boolean;
}

export interface UpdatePhotoEssayRequest {
    title?: string;
    description?: string;
    cover_image_url?: string;
    photos?: PhotoItem[];
    is_published?: boolean;
}
```

**Step 2: Add API routes and client methods**

In `frontend/src/shared/lib/api-client.ts`, add to `apiRoutes`:

```typescript
photoEssays: {
    list: () => '/api/photo-essays',
    getById: (id: string) => `/api/photo-essays/${id}`,
    create: () => '/api/photo-essays',
    update: (id: string) => `/api/photo-essays/${id}`,
    delete: (id: string) => `/api/photo-essays/${id}`,
},
```

Add to `apiClient`:

```typescript
photoEssays: {
    list: (params?: Record<string, string | number>) =>
        fetchApi<PaginatedResponse<PhotoEssayCard>>(apiRoutes.photoEssays.list(), { params }),

    getById: (id: string) =>
        fetchApi<PhotoEssay>(apiRoutes.photoEssays.getById(id)),

    create: (data: CreatePhotoEssayRequest, token: string) =>
        fetchApi<PhotoEssay, CreatePhotoEssayRequest>(apiRoutes.photoEssays.create(), {
            method: 'POST',
            body: data,
            token,
        }),

    update: (id: string, data: UpdatePhotoEssayRequest, token: string) =>
        fetchApi<PhotoEssay, UpdatePhotoEssayRequest>(apiRoutes.photoEssays.update(id), {
            method: 'PUT',
            body: data,
            token,
        }),

    delete: (id: string, token: string) =>
        fetchApi<void>(apiRoutes.photoEssays.delete(id), {
            method: 'DELETE',
            token,
        }),
},
```

Import the new types at the top of `api-client.ts`.

**Step 3: Update admin sections page**

In `frontend/src/pages/admin/sections.tsx:13`, change:
```typescript
const CONTENT_TYPES: SectionContentType[] = ['story', 'project', 'page', 'image'];
```
to:
```typescript
const CONTENT_TYPES: SectionContentType[] = ['story', 'project', 'page', 'photo_essay'];
```

**Step 4: Create Next.js API proxy route**

Create `frontend/src/pages/api/photo-essays/index.ts` following the pattern in `frontend/src/pages/api/projects/index.ts`. This proxies requests to the backend `/photo-essays` endpoints. Support `GET` (with `section_id`, `limit`, `offset` params) and `POST` (authenticated).

Create `frontend/src/pages/api/photo-essays/[id].ts` for `GET` (single essay), `PUT`, and `DELETE` by ID. Follow the pattern in `frontend/src/pages/api/projects/[slug].ts` but use ID instead of slug.

**Step 5: Run lint**

```bash
cd frontend && npm run lint
```

**Step 6: Commit**

```bash
git add frontend/src/shared/types/api.ts frontend/src/shared/lib/api-client.ts frontend/src/pages/admin/sections.tsx frontend/src/pages/api/photo-essays/
git commit -m "feat: add photo essay types, api client, and proxy routes"
```

---

## Task 5: Frontend Registry — GalleryDisplay and Content Wiring

**Files:**
- Modify: `frontend/src/modules/registry/types.ts:3-4`
- Create: `frontend/src/modules/registry/displays/GalleryDisplay.tsx`
- Modify: `frontend/src/modules/registry/displays/index.ts` (add export)
- Modify: `frontend/src/modules/registry/displayRegistry.ts`
- Modify: `frontend/src/modules/registry/contentRegistry.ts`
- Modify: `frontend/src/modules/registry/hooks/useFetchContent.ts:27-31`

**Step 1: Update registry types**

In `frontend/src/modules/registry/types.ts`, change lines 3-4:
```typescript
export type DisplayType = 'feed' | 'card-grid' | 'static-page' | 'gallery';
export type ContentType = 'story' | 'project' | 'page' | 'photo_essay';
```

Add a new props interface:
```typescript
export interface GalleryDisplayProps<T = unknown> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
}
```

**Step 2: Create GalleryDisplay component**

Create `frontend/src/modules/registry/displays/GalleryDisplay.tsx`:

This is the **landing page** for photo essays — a vertical feed of cover images. Each essay renders as a large cover image with title and date below. The layout uses the cover image as a hero-style element. Click navigates to the essay detail.

```typescript
import React from 'react';
import type { GalleryDisplayProps } from '../types';

export function GalleryDisplay<T>({ items, renderItem }: GalleryDisplayProps<T>) {
    return (
        <div className="gallery-landing" data-testid="gallery-display">
            {items.map((item, index) => (
                <div key={index} className="gallery-landing__item">
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}
```

**Step 3: Register the display**

In `frontend/src/modules/registry/displayRegistry.ts`:
```typescript
import { FeedDisplay, CardGridDisplay, StaticPageDisplay, GalleryDisplay } from './displays';
```
Add to registry:
```typescript
'gallery': GalleryDisplay,
```

**Step 4: Create PhotoEssayCard component**

Create `frontend/src/modules/photo-essays/components/PhotoEssayCard.tsx`:

A cover-image card for the gallery landing page. Shows the cover image full-width, with title overlaid at the bottom. Links to `/{sectionSlug}/{essayId}`.

```typescript
import React from 'react';
import Link from 'next/link';
import { PhotoEssayCard as PhotoEssayCardType } from '@/shared/types/api';

interface Props {
    essay: PhotoEssayCardType;
    basePath: string;
}

export function PhotoEssayCard({ essay, basePath }: Props) {
    return (
        <Link href={`${basePath}/${essay.id}`} className="gallery-card" data-testid="photo-essay-card">
            <div className="gallery-card__image-wrapper">
                <img
                    src={essay.cover_image_url}
                    alt={essay.title}
                    className="gallery-card__image"
                    loading="lazy"
                />
            </div>
            <div className="gallery-card__info">
                <h2 className="gallery-card__title">{essay.title}</h2>
                {essay.description && (
                    <p className="gallery-card__description">{essay.description}</p>
                )}
                <time className="gallery-card__date" dateTime={essay.createdDate}>
                    {new Date(essay.createdDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </time>
            </div>
        </Link>
    );
}
```

Create `frontend/src/modules/photo-essays/index.ts`:
```typescript
export { PhotoEssayCard } from './components/PhotoEssayCard';
```

**Step 5: Wire content registry and fetcher**

In `frontend/src/modules/registry/contentRegistry.ts`, add:
```typescript
import { PhotoEssayCard } from '@/modules/photo-essays';
```
```typescript
photo_essay: {
    listItem: PhotoEssayCard,
    detail: null,  // Detail view handled separately (Task 6)
},
```

In `frontend/src/modules/registry/hooks/useFetchContent.ts`, add to `contentFetchers`:
```typescript
photo_essay: (_token, params) => apiClient.photoEssays.list(params),
```

**Step 6: Wire into catch-all route**

In `frontend/src/pages/[...slugPath].tsx`:

Add `PhotoEssayCard` type import and a `renderItem` case for `photo_essay` in `SectionListView` (around line 124-152):
```typescript
if (contentType === 'photo_essay') {
    return (item: unknown) => {
        const essay = item as PhotoEssayCardType;
        return <PhotoEssayCard key={essay.id} essay={essay} basePath={basePath} />;
    };
}
```

Add to `getServerSideProps` list view section (around lines 405-420):
```typescript
} else if (contentType === 'photo_essay') {
    const listRes = await fetch(`${API_BASE_URL}/photo-essays/section/${section.id}?limit=20&offset=0`);
    if (listRes.ok) {
        initialListData = await listRes.json();
    }
}
```

**Step 7: Run lint and unit tests**

```bash
cd frontend && npm run lint
make test-frontend-unit
```

**Step 8: Commit**

```bash
git add frontend/src/modules/registry/ frontend/src/modules/photo-essays/ frontend/src/pages/[...slugPath].tsx
git commit -m "feat: wire gallery display and photo_essay content type into registry"
```

---

## Task 6: PhotoEssayPage — Masonry Detail View

**Files:**
- Create: `frontend/src/modules/photo-essays/components/PhotoEssayPage.tsx`
- Create: `frontend/src/modules/photo-essays/components/MasonryGrid.tsx`
- Modify: `frontend/src/pages/[...slugPath].tsx` (detail view for photo_essay)
- Modify: `frontend/src/templates/default/styles/components.css` (masonry styles)

**Step 1: Create MasonryGrid component**

Create `frontend/src/modules/photo-essays/components/MasonryGrid.tsx`:

CSS-columns-based masonry layout. Each image renders at its natural aspect ratio. Columns count is responsive (1 on mobile, 2 on tablet, 3 on desktop).

```typescript
import React from 'react';
import { PhotoItem } from '@/shared/types/api';

interface Props {
    photos: PhotoItem[];
    onPhotoClick: (index: number) => void;
}

export function MasonryGrid({ photos, onPhotoClick }: Props) {
    return (
        <div className="masonry-grid" data-testid="masonry-grid">
            {photos
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((photo, index) => (
                    <button
                        key={`${photo.url}-${index}`}
                        className="masonry-grid__item"
                        onClick={() => onPhotoClick(index)}
                        type="button"
                        aria-label={photo.caption || `Photo ${index + 1}`}
                    >
                        <img
                            src={photo.url}
                            srcSet={photo.srcset || undefined}
                            alt={photo.caption || ''}
                            width={photo.width}
                            height={photo.height}
                            loading="lazy"
                            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                            className="masonry-grid__image"
                        />
                        {photo.caption && (
                            <span className="masonry-grid__caption">{photo.caption}</span>
                        )}
                    </button>
                ))}
        </div>
    );
}
```

**Step 2: Create PhotoEssayPage component**

Create `frontend/src/modules/photo-essays/components/PhotoEssayPage.tsx`:

```typescript
import React, { useState } from 'react';
import { PhotoEssay } from '@/shared/types/api';
import { MasonryGrid } from './MasonryGrid';
import { PhotoViewer } from './PhotoViewer';

interface Props {
    essay: PhotoEssay;
}

export function PhotoEssayPage({ essay }: Props) {
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const sortedPhotos = [...essay.photos].sort((a, b) => a.sort_order - b.sort_order);

    return (
        <div className="photo-essay-page" data-testid="photo-essay-page">
            <header className="photo-essay-page__header">
                <h1 className="photo-essay-page__title">{essay.title}</h1>
                {essay.description && (
                    <p className="photo-essay-page__description">{essay.description}</p>
                )}
            </header>

            <MasonryGrid
                photos={sortedPhotos}
                onPhotoClick={setViewerIndex}
            />

            {viewerIndex !== null && (
                <PhotoViewer
                    photos={sortedPhotos}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                />
            )}
        </div>
    );
}
```

**Step 3: Add masonry CSS**

Add to `frontend/src/templates/default/styles/components.css`:

```css
/* Photo Essay — Gallery Landing */
.gallery-landing {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
}

.gallery-card {
    display: block;
    text-decoration: none;
    color: inherit;
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: transform var(--transition-normal);
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border-primary);
}

.gallery-card:hover {
    transform: translateY(-2px);
}

.gallery-card__image-wrapper {
    width: 100%;
    overflow: hidden;
}

.gallery-card__image {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    max-height: 500px;
}

.gallery-card__info {
    padding: var(--spacing-4) var(--spacing-6);
}

.gallery-card__title {
    font-size: var(--font-size-xl);
    font-weight: 600;
    margin: 0 0 var(--spacing-2);
}

.gallery-card__description {
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-2);
}

.gallery-card__date {
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
}

/* Photo Essay — Masonry Grid */
.masonry-grid {
    columns: 1;
    column-gap: var(--spacing-4);
}

@media (min-width: 640px) {
    .masonry-grid {
        columns: 2;
    }
}

@media (min-width: 1024px) {
    .masonry-grid {
        columns: 3;
    }
}

.masonry-grid__item {
    break-inside: avoid;
    margin-bottom: var(--spacing-4);
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
}

.masonry-grid__image {
    width: 100%;
    height: auto;
    display: block;
}

.masonry-grid__caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--spacing-3) var(--spacing-4);
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    color: white;
    font-size: var(--font-size-sm);
    opacity: 0;
    transition: opacity var(--transition-normal);
}

.masonry-grid__item:hover .masonry-grid__caption,
.masonry-grid__item:focus-visible .masonry-grid__caption {
    opacity: 1;
}

/* Photo Essay — Detail Page */
.photo-essay-page__header {
    margin-bottom: var(--spacing-8);
}

.photo-essay-page__title {
    font-size: var(--font-size-3xl);
    font-weight: 700;
    margin: 0 0 var(--spacing-3);
}

.photo-essay-page__description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
    margin: 0;
}
```

**Step 4: Wire detail view into catch-all route**

In `frontend/src/pages/[...slugPath].tsx`, update `getServerSideProps` detail section (around line 360):

```typescript
} else if (contentType === 'photo_essay') {
    const essayRes = await fetch(`${API_BASE_URL}/photo-essays/${itemSlug}`);
    if (!essayRes.ok) {
        return { notFound: true };
    }
    const essay = await essayRes.json();
    detailItem = essay;
}
```

Update `SectionDetailView` component (around line 203):

```typescript
if (contentType === 'photo_essay') {
    const essay = item as PhotoEssay;
    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: section.title, href: `/${section.slug}` },
                { label: essay.title },
            ]} />
            <PhotoEssayPage essay={essay} />
        </div>
    );
}
```

Update `SectionPageProps` interface to include `PhotoEssay` in `detailItem` union:
```typescript
detailItem?: Story | Project | PhotoEssay | null;
```

**Step 5: Run lint**

```bash
cd frontend && npm run lint
```

**Step 6: Commit**

```bash
git add frontend/src/modules/photo-essays/ frontend/src/templates/default/styles/components.css frontend/src/pages/[...slugPath].tsx
git commit -m "feat: add photo essay detail page with masonry grid layout"
```

---

## Task 7: PhotoViewer — Navigable Fullscreen Viewer

**Files:**
- Create: `frontend/src/modules/photo-essays/components/PhotoViewer.tsx`

**Step 1: Build the PhotoViewer component**

This is a fullscreen overlay that shows one photo at a time with prev/next navigation. It reuses the same dark overlay aesthetic as `useImageZoom` (CSS variable `--color-bg-overlay`). Keyboard support: left/right arrows, escape to close.

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { PhotoItem } from '@/shared/types/api';

interface Props {
    photos: PhotoItem[];
    initialIndex: number;
    onClose: () => void;
}

export function PhotoViewer({ photos, initialIndex, onClose }: Props) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showCaptions, setShowCaptions] = useState(true);
    const photo = photos[currentIndex];

    const goNext = useCallback(() => {
        setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : i));
    }, [photos.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex((i) => (i > 0 ? i - 1 : i));
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [goNext, goPrev, onClose]);

    return (
        <div
            className="photo-viewer"
            data-testid="photo-viewer"
            onClick={onClose}
            role="dialog"
            aria-label="Photo viewer"
            aria-modal="true"
        >
            <div className="photo-viewer__content" onClick={(e) => e.stopPropagation()}>
                <img
                    src={photo.url}
                    srcSet={photo.srcset || undefined}
                    alt={photo.caption || ''}
                    className="photo-viewer__image"
                />

                {showCaptions && photo.caption && (
                    <p className="photo-viewer__caption">{photo.caption}</p>
                )}

                <div className="photo-viewer__counter">
                    {currentIndex + 1} / {photos.length}
                </div>
            </div>

            {currentIndex > 0 && (
                <button
                    className="photo-viewer__nav photo-viewer__nav--prev"
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    aria-label="Previous photo"
                >
                    &#8592;
                </button>
            )}

            {currentIndex < photos.length - 1 && (
                <button
                    className="photo-viewer__nav photo-viewer__nav--next"
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    aria-label="Next photo"
                >
                    &#8594;
                </button>
            )}

            <button
                className="photo-viewer__close"
                onClick={onClose}
                aria-label="Close viewer"
            >
                &times;
            </button>

            <button
                className="photo-viewer__toggle-captions"
                onClick={(e) => { e.stopPropagation(); setShowCaptions(!showCaptions); }}
                aria-label={showCaptions ? 'Hide captions' : 'Show captions'}
            >
                {showCaptions ? 'Hide captions' : 'Show captions'}
            </button>
        </div>
    );
}
```

**Step 2: Add PhotoViewer CSS**

Add to `frontend/src/templates/default/styles/components.css`:

```css
/* Photo Viewer — Fullscreen Overlay */
.photo-viewer {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--color-bg-overlay, rgba(0, 0, 0, 0.85));
    display: flex;
    align-items: center;
    justify-content: center;
}

.photo-viewer__content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.photo-viewer__image {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
}

.photo-viewer__caption {
    color: white;
    text-align: center;
    padding: var(--spacing-3) var(--spacing-4);
    font-size: var(--font-size-sm);
    max-width: 600px;
    margin: var(--spacing-2) 0 0;
}

.photo-viewer__counter {
    color: rgba(255, 255, 255, 0.6);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-2);
}

.photo-viewer__nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 2rem;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition-normal);
}

.photo-viewer__nav:hover {
    background: rgba(255, 255, 255, 0.25);
}

.photo-viewer__nav--prev {
    left: var(--spacing-4);
}

.photo-viewer__nav--next {
    right: var(--spacing-4);
}

.photo-viewer__close {
    position: fixed;
    top: var(--spacing-4);
    right: var(--spacing-4);
    background: none;
    border: none;
    color: white;
    font-size: 2rem;
    cursor: pointer;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.photo-viewer__toggle-captions {
    position: fixed;
    bottom: var(--spacing-4);
    right: var(--spacing-4);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: var(--font-size-sm);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-normal);
}

.photo-viewer__toggle-captions:hover {
    background: rgba(255, 255, 255, 0.25);
}
```

**Step 3: Export from module**

Update `frontend/src/modules/photo-essays/index.ts`:
```typescript
export { PhotoEssayCard } from './components/PhotoEssayCard';
export { PhotoEssayPage } from './components/PhotoEssayPage';
export { PhotoViewer } from './components/PhotoViewer';
```

**Step 4: Run lint**

```bash
cd frontend && npm run lint
```

**Step 5: Commit**

```bash
git add frontend/src/modules/photo-essays/ frontend/src/templates/default/styles/components.css
git commit -m "feat: add fullscreen photo viewer with keyboard navigation"
```

---

## Task 8: PhotoEssayEditor — Admin Bulk Upload and Arrange

**Files:**
- Create: `frontend/src/modules/photo-essays/components/PhotoEssayEditor.tsx`
- Modify: `frontend/src/pages/editor.tsx` (add photo_essay case)

**Step 1: Create the editor component**

Create `frontend/src/modules/photo-essays/components/PhotoEssayEditor.tsx`:

Key behaviors:
- Title and description plain text fields
- Bulk file upload via `<input type="file" multiple accept="image/*">`
- Each upload hits the existing `/api/upload-proxy` endpoint
- Uploaded images display as a sortable thumbnail grid
- Click thumbnail to set as cover image (highlighted border)
- Click thumbnail's caption area to type a caption
- Drag thumbnails to reorder (use HTML5 drag-and-drop, no library)
- Publish toggle
- Save button calls `apiClient.photoEssays.create` or `apiClient.photoEssays.update`

The editor should track photos as local state: `Array<{ url, srcset, caption, width, height, sort_order, uploading }>`. Each file upload adds an entry with `uploading: true`, and on completion fills in the url/srcset/dimensions from the upload response.

Wire into `frontend/src/pages/editor.tsx` — add a case for `section.content_type === 'photo_essay'` that renders `<PhotoEssayEditor />` instead of the story/project/page editors.

This is the largest component. Implementation details should follow the existing editor patterns in the codebase. Keep it functional with hooks, no class components.

**Step 2: Run lint**

```bash
cd frontend && npm run lint
```

**Step 3: Manual test**

```bash
make dev-local
```

Create a section via admin with `display_type: gallery`, `content_type: photo_essay`. Navigate to the editor. Upload images. Save. View on the landing page. Click through to detail. Test the photo viewer navigation.

**Step 4: Commit**

```bash
git add frontend/src/modules/photo-essays/components/PhotoEssayEditor.tsx frontend/src/pages/editor.tsx
git commit -m "feat: add photo essay editor with bulk upload and drag reorder"
```

---

## Task 9: E2E Tests

**Files:**
- Modify: `frontend/e2e/test-data.ts` (add photo essay test data)
- Modify: `frontend/e2e/mock-server.ts` (add photo essay endpoints)
- Modify: `frontend/e2e/fixtures/api-mock.fixture.ts` (add client-side mocks)
- Create: `frontend/e2e/page-objects/photo-essays.page.ts`
- Create: `frontend/e2e/specs/photo-essays/gallery.spec.ts`
- Modify: `frontend/e2e/specs/admin/sections.spec.ts` (update gallery test to use `photo_essay`)

**Step 1: Add test data**

In `frontend/e2e/test-data.ts`, add a `PHOTO_ESSAYS` section to `TEST_SECTION_IDS` and `sampleSections`. Add `samplePhotoEssays` and `samplePhotoEssayDetail` constants matching the `PhotoEssayCard` and `PhotoEssay` interfaces.

**Step 2: Add mock endpoints**

In `mock-server.ts`, add:
- `GET /photo-essays/section/:sectionId` → returns paginated `samplePhotoEssays`
- `GET /photo-essays/:id` → returns `samplePhotoEssayDetail`

In `api-mock.fixture.ts`, add matching `page.route()` entries for client-side requests to `/api/photo-essays*`.

**Step 3: Create page object**

Create `frontend/e2e/page-objects/photo-essays.page.ts` extending `BasePage`:
- `goto()` — navigates to the photo essays section
- `waitForEssays()` — waits for `[data-testid="photo-essay-card"]`
- `getEssayCount()` — counts cards
- `clickEssay(index)` — clicks a card
- `waitForMasonryGrid()` — waits for `[data-testid="masonry-grid"]`
- `clickPhoto(index)` — clicks a photo in the grid
- `waitForViewer()` — waits for `[data-testid="photo-viewer"]`
- `navigateNext()` — presses ArrowRight
- `navigatePrev()` — presses ArrowLeft
- `closeViewer()` — presses Escape

**Step 4: Write specs**

Create `frontend/e2e/specs/photo-essays/gallery.spec.ts`:
- Test: gallery landing page displays essay cards
- Test: clicking a card navigates to essay detail with masonry grid
- Test: clicking a photo opens the viewer
- Test: keyboard navigation works (ArrowRight, ArrowLeft, Escape)
- Test: caption toggle works

**Step 5: Update existing admin test**

In `frontend/e2e/specs/admin/sections.spec.ts`, update the gallery section test (lines 38-62) to use `photo_essay` instead of `image` for the content type.

**Step 6: Run e2e tests**

```bash
docker compose stop frontend
make test-frontend
```

**Step 7: Commit**

```bash
git add frontend/e2e/
git commit -m "test: add photo essay e2e tests and update gallery section test"
```

---

## Task 10: Documentation

**Files:**
- Create: `docs-site/pages/features/photo-essays.md`
- Modify: `docs-site/pages/features/_meta.ts` (add entry)

Document:
- What photo essays are and how they work
- Data model overview
- How to create a photo essay via the admin editor
- Gallery display and masonry layout
- Photo viewer keyboard controls
- Template CSS classes available for customization

**Step 1: Write docs**

**Step 2: Commit**

```bash
git add docs-site/
git commit -m "docs: add photo essays feature documentation"
```

---

## Verification Checklist

Before declaring done:
- [ ] `make format` passes
- [ ] `make test` passes (backend)
- [ ] `make test-frontend-unit` passes
- [ ] `make test-frontend` passes (e2e)
- [ ] `cd frontend && npm run lint` passes
- [ ] Manual test: create section, create essay, view landing, view detail, navigate photos
- [ ] Light mode and dark mode both render correctly
- [ ] Responsive: single column on mobile, 2 on tablet, 3 on desktop
