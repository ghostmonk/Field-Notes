# Nested Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace flat section routing with arbitrary-depth nested sections, mixed content types per section, movable content with automatic 301 redirects, and a unified listing interface.

**Architecture:** Sections gain a materialized `path` field and lose `content_type`. A single backend endpoint (`/sections/resolve-path/{path}`) resolves any URL depth. Content items conform to a `ListingItem` interface for display-type-agnostic rendering. Move operations write redirects and cascade path updates through the subtree.

**Tech Stack:** Next.js (Pages Router), FastAPI, MongoDB (Motor), TypeScript, Playwright, Vitest, pytest

**Design Doc:** [Nested Routing](/features/nested-routing/design)

**Prerequisite:** Asset Reorganization PR must be merged first.

---

## Phase 1: Data Model & Indexes

### Task 1.1: Section Model — Add `path`, Remove `content_type`

**Files:**
- Modify: `backend/models/section.py`
- Test: `backend/tests/test_sections_api.py`

**Step 1: Write failing tests for new model shape**

Add to `backend/tests/test_sections_api.py`:

```python
class TestSectionPathField:
    @pytest.mark.asyncio
    async def test_create_section_generates_path(self, sections_async_client, mock_auth):
        """Creating a top-level section sets path = slug."""
        response = await sections_async_client.post(
            "/sections",
            json={"title": "Blog", "display_type": "feed", "nav_visibility": "main"},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["path"] == data["slug"]

    @pytest.mark.asyncio
    async def test_create_child_section_generates_nested_path(self, sections_async_client, mock_auth):
        """Creating a child section sets path = parent.path/child.slug."""
        # Create parent
        parent_resp = await sections_async_client.post(
            "/sections",
            json={"title": "Creative Work", "display_type": "card-grid", "nav_visibility": "main"},
            headers={"Authorization": "Bearer mock-token"},
        )
        parent_id = parent_resp.json()["id"]

        # Create child
        child_resp = await sections_async_client.post(
            "/sections",
            json={
                "title": "Photography",
                "display_type": "gallery",
                "nav_visibility": "hidden",
                "parent_id": parent_id,
            },
            headers={"Authorization": "Bearer mock-token"},
        )
        child = child_resp.json()
        assert child["path"] == f"creative-work/photography"

    @pytest.mark.asyncio
    async def test_section_response_has_no_content_type(self, sections_async_client, mock_auth):
        """Section responses should not include content_type."""
        response = await sections_async_client.post(
            "/sections",
            json={"title": "Test", "display_type": "feed", "nav_visibility": "main"},
            headers={"Authorization": "Bearer mock-token"},
        )
        data = response.json()
        assert "content_type" not in data
```

**Step 2: Run tests to verify they fail**

Run: `make test`
Expected: FAIL — `path` not in response, `content_type` still present

**Step 3: Update section model**

Modify `backend/models/section.py`:
- Add `path: str` field to `SectionResponse` (computed, not user-provided)
- Remove `content_type` from `SectionCreate`, `SectionUpdate`, `SectionResponse`
- Keep `display_type` on all models

Modify `backend/handlers/sections.py`:
- In `create_section`: after slug generation, compute `path`:
  - If `parent_id` is None: `path = slug`
  - If `parent_id` exists: fetch parent, `path = f"{parent.path}/{slug}"`
- Store `path` in the document
- In `update_section`: if slug changes, recompute `path` and cascade to children (Task 1.4)

**Step 4: Run tests**

Run: `make test`
Expected: New tests PASS. Some existing tests may fail due to `content_type` removal — update them.

**Step 5: Commit**

```bash
git add backend/models/section.py backend/handlers/sections.py backend/tests/test_sections_api.py
git commit -m "feat: add path field to sections, remove content_type"
```

---

### Task 1.2: Update Database Indexes

**Files:**
- Modify: `backend/database.py`
- Test: Verify via migration

**Step 1: Update index definitions**

In `backend/database.py`, update the sections collection indexes:

```python
# Replace global slug uniqueness with scoped uniqueness
# Old: {"slug": 1} unique
# New: {"parent_id": 1, "slug": 1} unique compound
# Add: {"path": 1} unique

sections = db["sections"]
await sections.create_index([("path", 1)], unique=True)
await sections.create_index([("parent_id", 1), ("slug", 1)], unique=True)
# Keep existing: nav_visibility + sort_order, parent_id + sort_order
```

Add content collection indexes for scoped slug uniqueness:

```python
for coll_name in ["stories", "projects", "pages", "photo_essays"]:
    coll = db[coll_name]
    await coll.create_index([("section_id", 1), ("slug", 1)], unique=True, sparse=True)
```

**Step 2: Write migration for index changes**

Create `backend/migrations/0016_nested_routing_indexes.py`:
- Drop old global `slug` unique index on sections
- Create new compound `(parent_id, slug)` unique index
- Create `path` unique index
- Create `(section_id, slug)` indexes on content collections
- Populate `path` field on all existing sections (all top-level, so `path = slug`)

**Step 3: Test migration locally**

Run: `make dev-local && make migrate`
Verify: `make test` passes

**Step 4: Commit**

```bash
git add backend/database.py backend/migrations/0016_nested_routing_indexes.py
git commit -m "feat: update indexes for nested routing — scoped slug uniqueness, path index"
```

---

### Task 1.3: Redirects Collection

**Files:**
- Create: `backend/models/redirect.py`
- Modify: `backend/database.py`
- Test: `backend/tests/test_redirects.py`

**Step 1: Write failing tests**

Create `backend/tests/test_redirects.py`:

```python
import pytest
from models.redirect import RedirectCreate, RedirectResponse


class TestRedirectModel:
    def test_redirect_create_valid(self):
        r = RedirectCreate(
            old_path="blog/my-post",
            new_path="archive/my-post",
        )
        assert r.old_path == "blog/my-post"

    def test_redirect_create_with_content(self):
        r = RedirectCreate(
            old_path="blog/my-post",
            new_path="archive/my-post",
            content_id="abc123",
            content_type="story",
        )
        assert r.content_id == "abc123"

    def test_redirect_create_strips_leading_slash(self):
        r = RedirectCreate(
            old_path="/blog/my-post",
            new_path="/archive/my-post",
        )
        assert r.old_path == "blog/my-post"
        assert r.new_path == "archive/my-post"
```

**Step 2: Run tests — fail**

Run: `make test`
Expected: FAIL — module does not exist

**Step 3: Implement redirect model**

Create `backend/models/redirect.py`:

```python
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, field_validator


class RedirectCreate(BaseModel):
    old_path: str
    new_path: str
    content_id: Optional[str] = None
    content_type: Optional[str] = None
    expires_at: Optional[datetime] = None

    @field_validator("old_path", "new_path", mode="before")
    @classmethod
    def strip_leading_slash(cls, v: str) -> str:
        return v.lstrip("/")


class RedirectResponse(BaseModel):
    id: str
    old_path: str
    new_path: str
    content_id: Optional[str] = None
    content_type: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
```

Add to `backend/database.py`:

```python
async def get_redirects_collection():
    db = await get_database()
    return db["redirects"]
```

Add redirect index in `ensure_indexes`:

```python
redirects = db["redirects"]
await redirects.create_index([("old_path", 1)], unique=True)
```

**Step 4: Run tests — pass**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/models/redirect.py backend/database.py backend/tests/test_redirects.py
git commit -m "feat: add redirects collection and model"
```

---

### Task 1.4: Path Cascade on Section Update

**Files:**
- Modify: `backend/handlers/sections.py`
- Test: `backend/tests/test_sections_api.py`

**Step 1: Write failing tests for path cascade**

```python
class TestPathCascade:
    @pytest.mark.asyncio
    async def test_rename_section_updates_child_paths(self, sections_async_client, mock_auth):
        """Renaming a parent section cascades path changes to children."""
        # Create parent
        parent = (await sections_async_client.post(
            "/sections",
            json={"title": "Old Name", "display_type": "feed", "nav_visibility": "main"},
            headers={"Authorization": "Bearer mock-token"},
        )).json()

        # Create child
        child = (await sections_async_client.post(
            "/sections",
            json={"title": "Child", "display_type": "feed", "nav_visibility": "hidden", "parent_id": parent["id"]},
            headers={"Authorization": "Bearer mock-token"},
        )).json()
        assert child["path"] == "old-name/child"

        # Rename parent
        await sections_async_client.put(
            f"/sections/{parent['id']}",
            json={"title": "New Name"},
            headers={"Authorization": "Bearer mock-token"},
        )

        # Fetch child — path should be updated
        updated_child = (await sections_async_client.get(f"/sections/{child['id']}")).json()
        assert updated_child["path"] == "new-name/child"

    @pytest.mark.asyncio
    async def test_rename_cascades_to_grandchildren(self, sections_async_client, mock_auth):
        """Path cascade goes through multiple levels."""
        root = (await sections_async_client.post(
            "/sections",
            json={"title": "Root", "display_type": "feed", "nav_visibility": "main"},
            headers={"Authorization": "Bearer mock-token"},
        )).json()

        mid = (await sections_async_client.post(
            "/sections",
            json={"title": "Mid", "display_type": "feed", "nav_visibility": "hidden", "parent_id": root["id"]},
            headers={"Authorization": "Bearer mock-token"},
        )).json()

        leaf = (await sections_async_client.post(
            "/sections",
            json={"title": "Leaf", "display_type": "feed", "nav_visibility": "hidden", "parent_id": mid["id"]},
            headers={"Authorization": "Bearer mock-token"},
        )).json()
        assert leaf["path"] == "root/mid/leaf"

        # Rename root
        await sections_async_client.put(
            f"/sections/{root['id']}",
            json={"title": "Base"},
            headers={"Authorization": "Bearer mock-token"},
        )

        updated_leaf = (await sections_async_client.get(f"/sections/{leaf['id']}")).json()
        assert updated_leaf["path"] == "base/mid/leaf"
```

**Step 2: Run tests — fail**

Run: `make test`
Expected: FAIL — child paths not updated on rename

**Step 3: Implement cascade**

Add helper to `backend/handlers/sections.py`:

```python
async def cascade_path_updates(
    collection: AsyncIOMotorCollection,
    section_id: str,
    new_path: str,
):
    """Recursively update paths of all descendant sections."""
    children = await collection.find(
        {"parent_id": section_id, "deleted": {"$ne": True}}
    ).to_list(None)

    for child in children:
        child_new_path = f"{new_path}/{child['slug']}"
        await collection.update_one(
            {"_id": child["_id"]},
            {"$set": {"path": child_new_path, "updatedDate": datetime.now(timezone.utc)}},
        )
        await cascade_path_updates(collection, str(child["_id"]), child_new_path)
```

Wire into `update_section`: after slug change and path recomputation, call `cascade_path_updates`.

**Step 4: Run tests — pass**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/sections.py backend/tests/test_sections_api.py
git commit -m "feat: cascade path updates to descendants on section rename"
```

---

## Phase 2: Path Resolution Endpoint

### Task 2.1: `resolve-path` Endpoint — Section Resolution

**Files:**
- Create: `backend/handlers/path_resolution.py`
- Modify: `backend/app.py` (register router)
- Test: `backend/tests/test_path_resolution.py`

**Step 1: Write failing tests**

Create `backend/tests/test_path_resolution.py`:

```python
import pytest
from bson import ObjectId


class TestResolvePathSection:
    """Test path resolution returning section responses."""

    @pytest.mark.asyncio
    async def test_resolve_top_level_section(self, async_client, mock_auth):
        """Top-level path resolves to a section."""
        # Seed a section with path="blog"
        db = async_client.app.state.db  # or however the test DB is accessed
        section_id = ObjectId()
        await db["sections"].insert_one({
            "_id": section_id,
            "slug": "blog",
            "title": "Blog",
            "path": "blog",
            "parent_id": None,
            "display_type": "feed",
            "nav_visibility": "main",
            "is_published": True,
            "sort_order": 0,
            "deleted": False,
        })

        response = await async_client.get("/sections/resolve-path/blog")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "section"
        assert data["section"]["path"] == "blog"
        assert data["section"]["title"] == "Blog"
        assert len(data["breadcrumbs"]) == 1
        assert data["breadcrumbs"][0]["title"] == "Blog"

    @pytest.mark.asyncio
    async def test_resolve_nested_section(self, async_client, mock_auth):
        """Nested path resolves through the section hierarchy."""
        parent_id = ObjectId()
        child_id = ObjectId()
        await db["sections"].insert_many([
            {
                "_id": parent_id, "slug": "creative", "title": "Creative",
                "path": "creative", "parent_id": None, "display_type": "card-grid",
                "nav_visibility": "main", "is_published": True, "sort_order": 0,
            },
            {
                "_id": child_id, "slug": "photos", "title": "Photos",
                "path": "creative/photos", "parent_id": str(parent_id),
                "display_type": "gallery", "nav_visibility": "hidden",
                "is_published": True, "sort_order": 0,
            },
        ])

        response = await async_client.get("/sections/resolve-path/creative/photos")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "section"
        assert data["section"]["path"] == "creative/photos"
        assert len(data["breadcrumbs"]) == 2
        assert data["breadcrumbs"][0]["title"] == "Creative"
        assert data["breadcrumbs"][1]["title"] == "Photos"

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_path_returns_404(self, async_client):
        response = await async_client.get("/sections/resolve-path/does-not-exist")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_unpublished_section_returns_404(self, async_client):
        await db["sections"].insert_one({
            "_id": ObjectId(), "slug": "hidden", "title": "Hidden",
            "path": "hidden", "parent_id": None, "display_type": "feed",
            "nav_visibility": "hidden", "is_published": False, "sort_order": 0,
        })
        response = await async_client.get("/sections/resolve-path/hidden")
        assert response.status_code == 404
```

**Step 2: Run tests — fail**

Run: `make test`
Expected: FAIL — endpoint does not exist

**Step 3: Implement resolve-path for sections**

Create `backend/handlers/path_resolution.py`:

```python
from bson import ObjectId
from database import get_db
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


async def build_breadcrumbs(db, section: dict) -> list:
    """Walk ancestors to build breadcrumb chain."""
    crumbs = []
    current = section
    while current:
        crumbs.append({"title": current["title"], "path": current["path"]})
        if current.get("parent_id"):
            current = await db["sections"].find_one({
                "_id": ObjectId(current["parent_id"]),
                "deleted": {"$ne": True},
            })
        else:
            current = None
    crumbs.reverse()
    return crumbs


@router.get("/sections/resolve-path/{full_path:path}")
async def resolve_path(request: Request, full_path: str):
    """Resolve a URL path to a section or content item."""
    db = await get_db()
    path = full_path.strip("/")

    # Try full path as a section
    section = await db["sections"].find_one({
        "path": path,
        "is_published": True,
        "deleted": {"$ne": True},
    })

    if section:
        section["id"] = str(section.pop("_id"))
        breadcrumbs = await build_breadcrumbs(db, {**section, "_id": ObjectId(section["id"])})
        return {
            "type": "section",
            "section": section,
            "breadcrumbs": breadcrumbs,
        }

    # TODO: Task 2.2 — content item resolution
    # TODO: Task 4.1 — redirect resolution

    raise HTTPException(status_code=404, detail="Path not found")
```

Register in `backend/app.py`:

```python
from handlers.path_resolution import router as path_resolution_router
app.include_router(path_resolution_router)
```

**Step 4: Run tests — pass**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/path_resolution.py backend/app.py backend/tests/test_path_resolution.py
git commit -m "feat: resolve-path endpoint — section resolution with breadcrumbs"
```

---

### Task 2.2: `resolve-path` — Content Item Resolution

**Files:**
- Modify: `backend/handlers/path_resolution.py`
- Test: `backend/tests/test_path_resolution.py`

**Step 1: Write failing tests**

Add to `backend/tests/test_path_resolution.py`:

```python
class TestResolvePathContent:
    """Test path resolution returning content item responses."""

    @pytest.mark.asyncio
    async def test_resolve_content_item(self, async_client, mock_auth):
        """Last segment resolves as content within parent section."""
        section_id = ObjectId()
        await db["sections"].insert_one({
            "_id": section_id, "slug": "blog", "title": "Blog",
            "path": "blog", "parent_id": None, "display_type": "feed",
            "is_published": True, "sort_order": 0,
        })

        story_id = ObjectId()
        await db["stories"].insert_one({
            "_id": story_id, "slug": "my-post", "title": "My Post",
            "section_id": str(section_id), "is_published": True,
            "summary": "A post", "content": "<p>Hello</p>",
            "deleted": False,
        })

        response = await async_client.get("/sections/resolve-path/blog/my-post")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "content"
        assert data["content_item"]["slug"] == "my-post"
        assert data["content_item"]["content_type"] == "story"
        assert data["section"]["path"] == "blog"
        assert len(data["breadcrumbs"]) == 2

    @pytest.mark.asyncio
    async def test_resolve_nested_content_item(self, async_client, mock_auth):
        """Content item under a nested section resolves correctly."""
        parent_id = ObjectId()
        child_id = ObjectId()
        await db["sections"].insert_many([
            {"_id": parent_id, "slug": "creative", "title": "Creative",
             "path": "creative", "parent_id": None, "display_type": "card-grid",
             "is_published": True, "sort_order": 0},
            {"_id": child_id, "slug": "photos", "title": "Photos",
             "path": "creative/photos", "parent_id": str(parent_id),
             "display_type": "gallery", "is_published": True, "sort_order": 0},
        ])

        await db["photo_essays"].insert_one({
            "_id": ObjectId(), "slug": "beach-sunset", "title": "Beach Sunset",
            "section_id": str(child_id), "is_published": True,
        })

        response = await async_client.get("/sections/resolve-path/creative/photos/beach-sunset")
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "content"
        assert data["content_item"]["content_type"] == "photo_essay"

    @pytest.mark.asyncio
    async def test_content_not_found_returns_404(self, async_client):
        """Non-existent content item under a valid section returns 404."""
        section_id = ObjectId()
        await db["sections"].insert_one({
            "_id": section_id, "slug": "blog", "title": "Blog",
            "path": "blog", "parent_id": None, "display_type": "feed",
            "is_published": True, "sort_order": 0,
        })

        response = await async_client.get("/sections/resolve-path/blog/nonexistent")
        assert response.status_code == 404
```

**Step 2: Run tests — fail**

Run: `make test`
Expected: FAIL — content resolution not implemented

**Step 3: Implement content resolution**

Add to `backend/handlers/path_resolution.py`:

```python
CONTENT_COLLECTIONS = [
    ("stories", "story"),
    ("projects", "project"),
    ("photo_essays", "photo_essay"),
    ("pages", "page"),
]


async def find_content_in_section(db, section_id: str, slug: str) -> dict | None:
    """Search all content collections for an item with this slug in this section."""
    for collection_name, content_type in CONTENT_COLLECTIONS:
        item = await db[collection_name].find_one({
            "section_id": section_id,
            "slug": slug,
            "is_published": True,
            "deleted": {"$ne": True},
        })
        if item:
            item["id"] = str(item.pop("_id"))
            item["content_type"] = content_type
            return item
    return None
```

Update the `resolve_path` handler — after the section-only check fails, split off the last segment:

```python
    # Split: try parent path as section, last segment as content
    segments = path.split("/")
    if len(segments) > 1:
        parent_path = "/".join(segments[:-1])
        item_slug = segments[-1]

        section = await db["sections"].find_one({
            "path": parent_path,
            "is_published": True,
            "deleted": {"$ne": True},
        })

        if section:
            content = await find_content_in_section(db, str(section["_id"]), item_slug)
            if content:
                section["id"] = str(section.pop("_id"))
                breadcrumbs = await build_breadcrumbs(db, {**section, "_id": ObjectId(section["id"])})
                breadcrumbs.append({"title": content["title"], "path": path})
                return {
                    "type": "content",
                    "section": section,
                    "content_item": content,
                    "breadcrumbs": breadcrumbs,
                }
```

**Step 4: Run tests — pass**

Run: `make test`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/handlers/path_resolution.py backend/tests/test_path_resolution.py
git commit -m "feat: resolve-path content item resolution across collections"
```

---

## Phase 3: Children Endpoint & ListingItem

### Task 3.1: ListingItem Response Model

**Files:**
- Create: `backend/models/listing.py`
- Test: `backend/tests/test_listing_model.py`

**Step 1: Write failing tests**

```python
from models.listing import ListingItem


class TestListingItem:
    def test_story_to_listing_item(self):
        item = ListingItem(
            id="abc",
            slug="my-post",
            item_type="content",
            content_type="story",
            title="My Post",
            summary="A summary",
            image_url=None,
            video_url=None,
            tags=["python"],
            is_published=True,
            is_featured=False,
            created_at="2026-03-29T00:00:00Z",
            updated_at="2026-03-29T00:00:00Z",
        )
        assert item.content_type == "story"

    def test_section_to_listing_item(self):
        item = ListingItem(
            id="def",
            slug="photos",
            item_type="section",
            content_type=None,
            title="Photos",
            path="creative/photos",
            display_type="gallery",
            sort_order=0,
        )
        assert item.item_type == "section"
        assert item.content_type is None
```

**Step 2: Run — fail. Step 3: Implement model. Step 4: Run — pass.**

Create `backend/models/listing.py`:

```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ListingItem(BaseModel):
    id: str
    slug: str
    item_type: str  # "section" or "content"
    content_type: Optional[str] = None
    title: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    path: Optional[str] = None
    display_type: Optional[str] = None
    tags: list[str] = []
    is_published: bool = True
    is_featured: bool = False
    sort_order: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_id: Optional[str] = None
```

**Step 5: Commit**

```bash
git add backend/models/listing.py backend/tests/test_listing_model.py
git commit -m "feat: ListingItem model for unified section children responses"
```

---

### Task 3.2: Children Endpoint

**Files:**
- Create: `backend/handlers/children.py` (or add to `path_resolution.py`)
- Modify: `backend/app.py`
- Test: `backend/tests/test_children_endpoint.py`

**Step 1: Write failing tests**

Create `backend/tests/test_children_endpoint.py`:

```python
class TestChildrenEndpoint:
    @pytest.mark.asyncio
    async def test_returns_child_sections_and_content(self, async_client, mock_auth):
        """Endpoint returns both child sections and content items."""
        parent_id = ObjectId()
        child_section_id = ObjectId()
        await db["sections"].insert_many([
            {"_id": parent_id, "slug": "blog", "title": "Blog", "path": "blog",
             "parent_id": None, "display_type": "feed", "is_published": True, "sort_order": 0},
            {"_id": child_section_id, "slug": "tech", "title": "Tech", "path": "blog/tech",
             "parent_id": str(parent_id), "display_type": "feed", "is_published": True, "sort_order": 0},
        ])
        await db["stories"].insert_one({
            "_id": ObjectId(), "slug": "my-post", "title": "My Post",
            "section_id": str(parent_id), "is_published": True,
            "summary": "A post", "tags": [], "createdDate": datetime.now(timezone.utc),
        })

        response = await async_client.get(f"/sections/{parent_id}/children")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2

        types = [item["item_type"] for item in data["items"]]
        assert "section" in types
        assert "content" in types

        # Sections come first
        section_indices = [i for i, t in enumerate(types) if t == "section"]
        content_indices = [i for i, t in enumerate(types) if t == "content"]
        assert max(section_indices) < min(content_indices)

    @pytest.mark.asyncio
    async def test_mixed_content_types(self, async_client, mock_auth):
        """Section with stories and projects returns both."""
        section_id = ObjectId()
        await db["sections"].insert_one({
            "_id": section_id, "slug": "work", "title": "Work", "path": "work",
            "parent_id": None, "display_type": "card-grid", "is_published": True, "sort_order": 0,
        })
        await db["stories"].insert_one({
            "_id": ObjectId(), "slug": "story-1", "title": "A Story",
            "section_id": str(section_id), "is_published": True, "tags": [],
            "createdDate": datetime.now(timezone.utc),
        })
        await db["projects"].insert_one({
            "_id": ObjectId(), "slug": "project-1", "title": "A Project",
            "section_id": str(section_id), "is_published": True, "tags": [],
            "technologies": [], "createdDate": datetime.now(timezone.utc),
        })

        response = await async_client.get(f"/sections/{section_id}/children")
        data = response.json()
        content_types = [i["content_type"] for i in data["items"] if i["item_type"] == "content"]
        assert "story" in content_types
        assert "project" in content_types

    @pytest.mark.asyncio
    async def test_subtree_featured(self, async_client, mock_auth):
        """subtree=true&featured_only=true returns featured items from descendants."""
        root_id = ObjectId()
        child_id = ObjectId()
        await db["sections"].insert_many([
            {"_id": root_id, "slug": "root", "title": "Root", "path": "root",
             "parent_id": None, "display_type": "feed", "is_published": True, "sort_order": 0},
            {"_id": child_id, "slug": "child", "title": "Child", "path": "root/child",
             "parent_id": str(root_id), "display_type": "feed", "is_published": True, "sort_order": 0},
        ])
        await db["stories"].insert_one({
            "_id": ObjectId(), "slug": "featured", "title": "Featured Post",
            "section_id": str(child_id), "is_published": True, "is_featured": True,
            "tags": [], "createdDate": datetime.now(timezone.utc),
        })
        await db["stories"].insert_one({
            "_id": ObjectId(), "slug": "normal", "title": "Normal Post",
            "section_id": str(child_id), "is_published": True, "is_featured": False,
            "tags": [], "createdDate": datetime.now(timezone.utc),
        })

        response = await async_client.get(
            f"/sections/{root_id}/children?subtree=true&featured_only=true"
        )
        data = response.json()
        assert all(i.get("is_featured", False) for i in data["items"] if i["item_type"] == "content")
        titles = [i["title"] for i in data["items"]]
        assert "Featured Post" in titles
        assert "Normal Post" not in titles

    @pytest.mark.asyncio
    async def test_pagination(self, async_client, mock_auth):
        section_id = ObjectId()
        await db["sections"].insert_one({
            "_id": section_id, "slug": "blog", "title": "Blog", "path": "blog",
            "parent_id": None, "display_type": "feed", "is_published": True, "sort_order": 0,
        })
        for i in range(5):
            await db["stories"].insert_one({
                "_id": ObjectId(), "slug": f"post-{i}", "title": f"Post {i}",
                "section_id": str(section_id), "is_published": True,
                "tags": [], "createdDate": datetime.now(timezone.utc),
            })

        response = await async_client.get(f"/sections/{section_id}/children?limit=2&offset=0")
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
```

**Step 2: Run — fail. Step 3: Implement. Step 4: Run — pass.**

The handler queries child sections + all content collections for `section_id`, merges, sorts (sections first by sort_order, content by created_at desc), and paginates.

For `subtree=true`: collect all descendant section IDs recursively, then query content where `section_id` is in that set.

**Step 5: Commit**

```bash
git add backend/handlers/children.py backend/app.py backend/tests/test_children_endpoint.py
git commit -m "feat: children endpoint — mixed content types, subtree queries, pagination"
```

---

## Phase 4: Move & Redirect Operations

### Task 4.1: Content Move Endpoint

**Files:**
- Create: `backend/handlers/moves.py`
- Modify: `backend/app.py`
- Test: `backend/tests/test_moves.py`

**Step 1: Write failing tests**

```python
class TestContentMove:
    @pytest.mark.asyncio
    async def test_move_story_to_new_section(self, async_client, mock_auth):
        """Moving a story updates section_id and creates a redirect."""
        section_a = ObjectId()
        section_b = ObjectId()
        await db["sections"].insert_many([
            {"_id": section_a, "slug": "blog", "path": "blog", "parent_id": None,
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "Blog"},
            {"_id": section_b, "slug": "archive", "path": "archive", "parent_id": None,
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "Archive"},
        ])
        story_id = ObjectId()
        await db["stories"].insert_one({
            "_id": story_id, "slug": "my-post", "title": "My Post",
            "section_id": str(section_a), "is_published": True,
        })

        response = await async_client.put(
            f"/content/story/{story_id}/move",
            json={"target_section_id": str(section_b)},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert response.status_code == 200

        # Story moved
        story = await db["stories"].find_one({"_id": story_id})
        assert story["section_id"] == str(section_b)

        # Redirect created
        redirect = await db["redirects"].find_one({"old_path": "blog/my-post"})
        assert redirect is not None
        assert redirect["new_path"] == "archive/my-post"

    @pytest.mark.asyncio
    async def test_move_slug_collision_returns_409(self, async_client, mock_auth):
        section_a = ObjectId()
        section_b = ObjectId()
        await db["sections"].insert_many([
            {"_id": section_a, "slug": "a", "path": "a", "parent_id": None,
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "A"},
            {"_id": section_b, "slug": "b", "path": "b", "parent_id": None,
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "B"},
        ])
        story_1 = ObjectId()
        story_2 = ObjectId()
        await db["stories"].insert_one({
            "_id": story_1, "slug": "post", "title": "Post 1",
            "section_id": str(section_a), "is_published": True,
        })
        await db["stories"].insert_one({
            "_id": story_2, "slug": "post", "title": "Post 2",
            "section_id": str(section_b), "is_published": True,
        })

        response = await async_client.put(
            f"/content/story/{story_1}/move",
            json={"target_section_id": str(section_b)},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_redirect_flattening(self, async_client, mock_auth):
        """Moving A->B then B->C flattens A->C."""
        sections = [ObjectId() for _ in range(3)]
        for i, s in enumerate(sections):
            await db["sections"].insert_one({
                "_id": s, "slug": f"s{i}", "path": f"s{i}", "parent_id": None,
                "display_type": "feed", "is_published": True, "sort_order": 0, "title": f"S{i}",
            })

        story_id = ObjectId()
        await db["stories"].insert_one({
            "_id": story_id, "slug": "post", "title": "Post",
            "section_id": str(sections[0]), "is_published": True,
        })

        # Move to s1
        await async_client.put(
            f"/content/story/{story_id}/move",
            json={"target_section_id": str(sections[1])},
            headers={"Authorization": "Bearer mock-token"},
        )
        # Move to s2
        await async_client.put(
            f"/content/story/{story_id}/move",
            json={"target_section_id": str(sections[2])},
            headers={"Authorization": "Bearer mock-token"},
        )

        # Original redirect should point directly to s2, not s1
        redirect = await db["redirects"].find_one({"old_path": "s0/post"})
        assert redirect["new_path"] == "s2/post"
```

**Step 2: Run — fail. Step 3: Implement move handler with redirect flattening. Step 4: Run — pass.**

**Step 5: Commit**

```bash
git add backend/handlers/moves.py backend/app.py backend/tests/test_moves.py
git commit -m "feat: content move endpoint with redirects and flattening"
```

---

### Task 4.2: Section Move Endpoint

**Files:**
- Modify: `backend/handlers/moves.py`
- Test: `backend/tests/test_moves.py`

**Step 1: Write failing tests**

```python
class TestSectionMove:
    @pytest.mark.asyncio
    async def test_move_section_updates_paths(self, async_client, mock_auth):
        """Moving a section cascades path updates and creates redirects."""
        root_a = ObjectId()
        root_b = ObjectId()
        child = ObjectId()
        await db["sections"].insert_many([
            {"_id": root_a, "slug": "a", "path": "a", "parent_id": None,
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "A"},
            {"_id": root_b, "slug": "b", "path": "b", "parent_id": None,
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "B"},
            {"_id": child, "slug": "child", "path": "a/child", "parent_id": str(root_a),
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "Child"},
        ])

        await db["stories"].insert_one({
            "_id": ObjectId(), "slug": "post", "title": "Post",
            "section_id": str(child), "is_published": True,
        })

        response = await async_client.put(
            f"/sections/{child}/move",
            json={"target_parent_id": str(root_b)},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert response.status_code == 200

        updated = await db["sections"].find_one({"_id": child})
        assert updated["path"] == "b/child"
        assert updated["parent_id"] == str(root_b)

        # Redirect for section
        assert await db["redirects"].find_one({"old_path": "a/child"}) is not None
        # Redirect for content in section
        assert await db["redirects"].find_one({"old_path": "a/child/post"}) is not None

    @pytest.mark.asyncio
    async def test_cycle_detection(self, async_client, mock_auth):
        """Moving a section into its own descendant returns 400."""
        parent = ObjectId()
        child = ObjectId()
        await db["sections"].insert_many([
            {"_id": parent, "slug": "parent", "path": "parent", "parent_id": None,
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "Parent"},
            {"_id": child, "slug": "child", "path": "parent/child", "parent_id": str(parent),
             "display_type": "feed", "is_published": True, "sort_order": 0, "title": "Child"},
        ])

        response = await async_client.put(
            f"/sections/{parent}/move",
            json={"target_parent_id": str(child)},
            headers={"Authorization": "Bearer mock-token"},
        )
        assert response.status_code == 400
```

**Step 2-4: Red-green cycle. Step 5: Commit.**

```bash
git commit -m "feat: section move with cascade, cycle detection, and bulk redirects"
```

---

### Task 4.3: Redirect Resolution in resolve-path

**Files:**
- Modify: `backend/handlers/path_resolution.py`
- Test: `backend/tests/test_path_resolution.py`

**Step 1: Write failing test**

```python
class TestResolvePathRedirect:
    @pytest.mark.asyncio
    async def test_redirect_returns_301(self, async_client):
        await db["redirects"].insert_one({
            "old_path": "blog/old-post",
            "new_path": "archive/old-post",
            "created_at": datetime.now(timezone.utc),
        })

        response = await async_client.get(
            "/sections/resolve-path/blog/old-post",
            follow_redirects=False,
        )
        assert response.status_code == 301
        assert response.headers["location"] == "/archive/old-post"

    @pytest.mark.asyncio
    async def test_expired_redirect_returns_404(self, async_client):
        await db["redirects"].insert_one({
            "old_path": "blog/expired",
            "new_path": "archive/expired",
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime(2020, 1, 1, tzinfo=timezone.utc),
        })

        response = await async_client.get("/sections/resolve-path/blog/expired")
        assert response.status_code == 404
```

**Step 2-4: Red-green. Step 5: Commit.**

Add redirect lookup as final fallback in `resolve_path`, before the 404:

```python
    # Check redirects
    redirect = await db["redirects"].find_one({"old_path": path})
    if redirect:
        if redirect.get("expires_at") and redirect["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=404, detail="Path not found")
        return RedirectResponse(url=f"/{redirect['new_path']}", status_code=301)
```

```bash
git commit -m "feat: redirect resolution in resolve-path endpoint"
```

---

## Phase 5: Frontend Routing Rewrite

### Task 5.1: Next.js API Proxy for resolve-path

**Files:**
- Create: `frontend/src/pages/api/sections/resolve-path/[...path].ts`
- Test: Manual + e2e

**Step 1: Create the proxy route**

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBackend, getAccessToken } from '@/shared/utils/backend-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const pathSegments = req.query.path;
    const fullPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

    if (!fullPath) {
        return res.status(400).json({ detail: 'Path is required' });
    }

    try {
        const accessToken = await getAccessToken(req);
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetchBackend(`/sections/resolve-path/${fullPath}`, {
            method: 'GET',
            headers,
        });

        if (response.status === 301) {
            const location = response.headers.get('location');
            return res.redirect(301, location || '/');
        }

        if (response.status === 404) {
            return res.status(404).json({ detail: 'Path not found' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ detail: 'Internal server error' });
    }
}
```

**Step 2: Manual test**

Run: `make dev-local`
Visit: `http://localhost:3000/api/sections/resolve-path/blog`
Expected: JSON response with section data

**Step 3: Commit**

```bash
git add frontend/src/pages/api/sections/resolve-path/
git commit -m "feat: Next.js API proxy for resolve-path endpoint"
```

---

### Task 5.2: Next.js API Proxy for Children Endpoint

**Files:**
- Create: `frontend/src/pages/api/sections/[id]/children.ts`

Follow the same pattern as Task 5.1 but proxying to `/sections/{id}/children` with query params forwarded.

**Commit:**
```bash
git commit -m "feat: Next.js API proxy for section children endpoint"
```

---

### Task 5.3: Rewrite Catch-All Route

**Files:**
- Modify: `frontend/src/pages/[...slugPath].tsx`
- Test: `frontend/src/pages/__tests__/slugPath.test.tsx` (vitest)

**Step 1: Write failing vitest tests**

Create `frontend/src/pages/__tests__/slugPath.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Test the resolution logic, not the full SSR
describe('slugPath resolution', () => {
    it('calls resolve-path with joined slug segments', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                type: 'section',
                section: { path: 'blog', display_type: 'feed', title: 'Blog' },
                breadcrumbs: [{ title: 'Blog', path: 'blog' }],
            }),
        });

        // Test that the path joining works correctly
        const slugPath = ['creative-work', 'photography', 'portraits'];
        const joinedPath = slugPath.join('/');
        expect(joinedPath).toBe('creative-work/photography/portraits');
    });

    it('handles redirect response', () => {
        // Test redirect handling shape
        const redirectResult = {
            redirect: { destination: '/new/path', permanent: true },
        };
        expect(redirectResult.redirect.permanent).toBe(true);
    });
});
```

**Step 2: Rewrite `getServerSideProps`**

Replace the current multi-step resolution in `[...slugPath].tsx`:

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
    const slugPath = context.params?.slugPath as string[];
    if (!slugPath || slugPath.length === 0) {
        return { notFound: true };
    }

    const fullPath = slugPath.join('/');
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/sections/resolve-path/${fullPath}`);

    if (response.status === 301) {
        const location = response.headers.get('location');
        return {
            redirect: { destination: location || '/', permanent: true },
        };
    }

    if (response.status === 404 || !response.ok) {
        return { notFound: true };
    }

    const data = await response.json();

    // For section views, fetch children
    if (data.type === 'section') {
        const childrenResp = await fetch(
            `${backendUrl}/sections/${data.section.id}/children?limit=20&offset=0`
        );
        if (childrenResp.ok) {
            data.children = await childrenResp.json();
        }
    }

    return {
        props: {
            resolvedData: data,
            session: await getServerSession(context.req, context.res, authOptions),
        },
    };
};
```

**Step 3: Update page component**

The page component branches on `resolvedData.type`:
- `"section"` — render using `displayRegistry[section.display_type]`
- `"content"` — render detail view using `contentRegistry[content_item.content_type]`

**Step 4: Run tests**

```bash
make test-frontend-unit
```

**Step 5: Manual verification**

```bash
make dev-local
```
Navigate to existing section URLs (`/blog`, `/projects`, `/about`) — they should still work.

**Step 6: Commit**

```bash
git commit -m "feat: rewrite catch-all route to use resolve-path endpoint"
```

---

## Phase 6: Display Component Refactor

### Task 6.1: Unified ListingCard Component

**Files:**
- Create: `frontend/src/modules/registry/components/ListingCard.tsx`
- Test: `frontend/src/modules/registry/components/__tests__/ListingCard.test.tsx`

**Step 1: Write failing vitest test**

```typescript
import { render, screen } from '@testing-library/react';
import { ListingCard } from '../ListingCard';

describe('ListingCard', () => {
    const baseItem = {
        id: '1', slug: 'test', item_type: 'content' as const,
        content_type: 'story', title: 'Test Post',
        created_at: '2026-03-29T00:00:00Z',
        updated_at: '2026-03-29T00:00:00Z',
        is_published: true, is_featured: false, tags: [],
    };

    it('renders title', () => {
        render(<ListingCard item={baseItem} sectionPath="blog" />);
        expect(screen.getByText('Test Post')).toBeInTheDocument();
    });

    it('renders summary when present', () => {
        render(<ListingCard item={{ ...baseItem, summary: 'A summary' }} sectionPath="blog" />);
        expect(screen.getByText('A summary')).toBeInTheDocument();
    });

    it('omits image when not present', () => {
        render(<ListingCard item={baseItem} sectionPath="blog" />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders image when present', () => {
        render(<ListingCard item={{ ...baseItem, image_url: '/img.webp' }} sectionPath="blog" />);
        expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('links to correct path', () => {
        render(<ListingCard item={baseItem} sectionPath="blog" />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/blog/test');
    });

    it('renders tags', () => {
        render(<ListingCard item={{ ...baseItem, tags: ['python', 'react'] }} sectionPath="blog" />);
        expect(screen.getByText('python')).toBeInTheDocument();
        expect(screen.getByText('react')).toBeInTheDocument();
    });
});
```

**Step 2-4: Red-green cycle.**

**Step 5: Commit**

```bash
git commit -m "feat: unified ListingCard component for all content types"
```

---

### Task 6.2: Update Display Components to Use ListingCard

**Files:**
- Modify: `frontend/src/modules/registry/components/CardGridDisplay.tsx`
- Modify: `frontend/src/modules/registry/components/FeedDisplay.tsx`
- Modify: `frontend/src/modules/registry/components/GalleryDisplay.tsx`
- Test: Vitest for each + manual

Replace per-type card components (`StoryCard`, `ProjectCard`) with `ListingCard` in each display component. The display components receive `ListingItem[]` from the children endpoint instead of type-specific arrays.

**Test each component individually:**

```bash
cd frontend && npx vitest run src/modules/registry/components/__tests__/
```

**Manual test:** `make dev-local`, browse each section type.

**Commit:**
```bash
git commit -m "refactor: display components use ListingCard instead of type-specific cards"
```

---

### Task 6.3: Content Type Picker for New Content

**Files:**
- Create: `frontend/src/modules/editor/components/ContentTypePicker.tsx`
- Modify: `frontend/src/components/TopNav.tsx` (update "New" button)
- Test: Vitest

Since sections no longer have `content_type`, the "New" button must let the user choose what type of content to create. A simple dropdown or modal with the available types.

**Commit:**
```bash
git commit -m "feat: content type picker for new content in sections"
```

---

## Phase 7: Seed Data, E2E Tests & Manual Testing

### Task 7.1: Seed Nested Section Hierarchy

**Files:**
- Create: `backend/migrations/0017_seed_nested_sections.py`

Seed the hierarchy from the testing strategy doc:

```
/ (root)
├── blog/                          (feed)
│   ├── tech/                      (feed)
│   └── personal/                  (feed)
├── creative-work/                 (card-grid)
│   ├── photography/               (gallery)
│   │   └── portraits/             (gallery)
│   └── writing/                   (feed)
├── projects/                      (card-grid)
├── about/                         (static-page)
└── contact/                       (static-page)
```

Each section gets 2-3 content items. Mix types where appropriate.

**Test:** `make dev-local && make migrate`, then browse every section.

**Commit:**
```bash
git commit -m "feat: seed nested section hierarchy for local development"
```

---

### Task 7.2: Update E2E Test Data

**Files:**
- Modify: `frontend/e2e/test-data.ts`
- Modify: `frontend/e2e/mock-server.ts`
- Modify: `frontend/e2e/fixtures/api-mock.fixture.ts`

Update the mock server to serve:
- `GET /sections/resolve-path/:path` — return test data based on path
- `GET /sections/:id/children` — return mixed listing items
- Redirect responses for moved content paths

Update `test-data.ts` with nested section hierarchy matching the seed data.

**Commit:**
```bash
git commit -m "test: update e2e mocks for nested routing and resolve-path"
```

---

### Task 7.3: E2E Tests — Navigation & Routing

**Files:**
- Create: `frontend/e2e/specs/nested-routing/navigation.spec.ts`
- Create: `frontend/e2e/page-objects/section.page.ts`

```typescript
import { test, expect } from '../../fixtures';

test.describe('Nested Routing', () => {
    test('top-level section loads', async ({ mockApiPage }) => {
        await mockApiPage.goto('/blog');
        await expect(mockApiPage.locator('[data-testid="section-title"]')).toHaveText('Blog');
    });

    test('nested section loads', async ({ mockApiPage }) => {
        await mockApiPage.goto('/creative-work/photography');
        await expect(mockApiPage.locator('[data-testid="section-title"]')).toHaveText('Photography');
    });

    test('content item detail loads', async ({ mockApiPage }) => {
        await mockApiPage.goto('/blog/my-published-story');
        await expect(mockApiPage.locator('[data-testid="content-title"]')).toBeVisible();
    });

    test('deeply nested content loads', async ({ mockApiPage }) => {
        await mockApiPage.goto('/creative-work/photography/portraits/beach-sunset');
        await expect(mockApiPage.locator('[data-testid="content-title"]')).toBeVisible();
    });

    test('breadcrumbs show full path', async ({ mockApiPage }) => {
        await mockApiPage.goto('/creative-work/photography/portraits');
        const breadcrumbs = mockApiPage.locator('[data-testid="breadcrumbs"] a');
        await expect(breadcrumbs).toHaveCount(3);
    });

    test('404 for nonexistent path', async ({ mockApiPage }) => {
        await mockApiPage.goto('/does/not/exist');
        await expect(mockApiPage.locator('[data-testid="not-found"]')).toBeVisible();
    });
});
```

**Commit:**
```bash
git commit -m "test: e2e tests for nested routing navigation"
```

---

### Task 7.4: E2E Tests — Redirects

**Files:**
- Create: `frontend/e2e/specs/nested-routing/redirects.spec.ts`

```typescript
test.describe('Redirects', () => {
    test('old URL redirects to new location', async ({ mockApiPage }) => {
        // Mock server returns 301 for this path
        await mockApiPage.goto('/blog/moved-post');
        await expect(mockApiPage).toHaveURL(/\/archive\/moved-post/);
    });

    test('address bar shows new URL after redirect', async ({ mockApiPage }) => {
        await mockApiPage.goto('/blog/moved-post');
        expect(mockApiPage.url()).toContain('/archive/moved-post');
    });
});
```

**Commit:**
```bash
git commit -m "test: e2e tests for redirect resolution"
```

---

### Task 7.5: E2E Tests — Mixed Content Sections

**Files:**
- Create: `frontend/e2e/specs/nested-routing/mixed-content.spec.ts`

```typescript
test.describe('Mixed Content Sections', () => {
    test('section renders mixed content types', async ({ mockApiPage }) => {
        await mockApiPage.goto('/creative-work');
        const cards = mockApiPage.locator('[data-testid="listing-card"]');
        await expect(cards).toHaveCount.greaterThan(0);
    });

    test('clicking story card opens story detail', async ({ mockApiPage }) => {
        await mockApiPage.goto('/blog');
        await mockApiPage.locator('[data-testid="listing-card"]').first().click();
        await expect(mockApiPage.locator('[data-testid="content-detail"]')).toBeVisible();
    });
});
```

**Commit:**
```bash
git commit -m "test: e2e tests for mixed content sections"
```

---

### Task 7.6: Full Test Suite Run & Manual Verification

**Step 1: Run all automated tests**

```bash
make format
make test
make test-frontend-unit
docker compose stop frontend && make test-frontend
```

All must pass.

**Step 2: Manual testing checklist**

Run `make dev-local` and verify each item:

- [ ] Navigate to every seeded section at every depth level
- [ ] Click through to content items from list views
- [ ] Create content in a nested section, verify URL
- [ ] Move content between sections (via API/admin), verify old URL redirects
- [ ] Rename a section, verify all child URLs redirect
- [ ] Check breadcrumbs at every level
- [ ] Verify 404 page for non-existent paths
- [ ] Test with both light and dark mode
- [ ] Test mobile navigation with nested sections
- [ ] Verify the content type picker works in nested sections
- [ ] Upload an image in a nested section, verify it uses type-based paths
- [ ] Verify existing top-level sections still work (`/blog`, `/projects`, `/about`, `/contact`)

**Step 3: Fix any issues found, commit each fix.**

---

## Phase 8: Cleanup

### Task 8.1: Remove Dead Code

**Files:**
- Remove or clean: Old per-type fetching logic in `[...slugPath].tsx` (replaced by resolve-path)
- Remove: `content_type` references from section-related frontend code
- Remove: Old API proxy routes that are no longer needed (if any)
- Clean: Unused imports, type definitions referencing `content_type` on sections

**Commit:**
```bash
git commit -m "chore: remove dead code from flat routing system"
```

---

### Task 8.2: Update Architecture Docs

**Files:**
- Modify: `docs-site/pages/architecture/overview.mdx`
- Create: `docs-site/pages/adr/0007-nested-routing.mdx`
- Modify: `docs-site/pages/adr/_meta.ts`

**Commit:**
```bash
git commit -m "docs: update architecture docs for nested routing"
```

---

### Task 8.3: Final Format & Test

```bash
make format
make test
make test-frontend-unit
docker compose stop frontend && make test-frontend
```

All passing. Ready for PR.
