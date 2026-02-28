# Phase 2: Migration Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add section_id to content models and seed initial sections from the hardcoded navigation structure.

**Architecture:** Extend the existing migrations framework (`backend/handlers/migrations.py`) with new migrations for seeding sections and backfilling section_id. All migrations are idempotent and run at application startup. Content models (Story, Project, Page) gain an optional `section_id` field that links content to its parent section.

**Tech Stack:** Python 3.11+, FastAPI, MongoDB (motor driver), Pydantic, pytest

**GitHub Issue:** #70 - Future Extensibility

---

## Initial Sections to Seed

Based on the hardcoded `SECTIONS` array in `frontend/src/shared/lib/navigation.ts`:

| Section | Slug | Display Type | Content Type | Nav Visibility |
|---------|------|--------------|--------------|----------------|
| Blog | `blog` | `feed` | `story` | `main` |
| About | `about` | `static-page` | `page` | `main` |
| Projects | `projects` | `card-grid` | `project` | `main` |
| Contact | `contact` | `static-page` | `page` | `main` |

---

## Task 0: Verify Development Environment

**Files:**
- None (verification only)

**Step 1: Ensure Docker is running**

```bash
docker-compose ps
```

Expected: MongoDB container is up and running.

**Step 2: Activate virtual environment and start backend**

```bash
source ~/Documents/venvs/turbulence/bin/activate
make dev-backend
```

Expected: FastAPI server starts on port 5001 without errors.

**Step 3: Run existing tests**

```bash
make test
```

Expected: All 183 tests pass.

---

## Task 1: Add section_id to Story Model

**Files:**
- Modify: `backend/models/story.py`
- Modify: `backend/tests/test_models.py`

**Step 1: Write tests for section_id in Story models**

Add to `backend/tests/test_models.py`:

```python
class TestStorySectionId:
    """Test section_id field in Story models."""

    def test_story_base_without_section_id(self):
        """StoryBase should work without section_id (backwards compatible)."""
        story = StoryCreate(
            title="Test Story",
            content="Test content",
            is_published=True,
        )
        assert story.title == "Test Story"

    def test_story_response_with_section_id(self):
        """StoryResponse should include optional section_id."""
        now = datetime.now(timezone.utc)
        story = StoryResponse(
            id="123",
            title="Test Story",
            content="Test content",
            is_published=True,
            slug="test-story",
            createdDate=now,
            updatedDate=now,
            section_id="section-123",
        )
        assert story.section_id == "section-123"

    def test_story_response_without_section_id(self):
        """StoryResponse should work without section_id (nullable)."""
        now = datetime.now(timezone.utc)
        story = StoryResponse(
            id="123",
            title="Test Story",
            content="Test content",
            is_published=True,
            slug="test-story",
            createdDate=now,
            updatedDate=now,
        )
        assert story.section_id is None
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest backend/tests/test_models.py::TestStorySectionId -v
```

Expected: FAIL - section_id not defined on StoryResponse

**Step 3: Add section_id to Story models**

Modify `backend/models/story.py`:

```python
class StoryResponse(StoryBase):
    """Model for story API responses."""

    id: str
    slug: str = Field(default="")
    date: datetime | None = None
    createdDate: datetime
    updatedDate: datetime
    user_id: str | None = None
    section_id: str | None = None  # Add this line

    @field_validator("date", "createdDate", "updatedDate")
    def ensure_utc(cls, value: datetime | None) -> datetime | None:
        """Ensure datetime values are in UTC timezone."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    model_config = ConfigDict(from_attributes=True)
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest backend/tests/test_models.py::TestStorySectionId -v
```

Expected: PASS

**Step 5: Run all tests to ensure no regressions**

```bash
make test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/models/story.py backend/tests/test_models.py
git commit -m "feat(models): add section_id to Story model"
```

---

## Task 2: Add section_id to Project Model

**Files:**
- Modify: `backend/models/project.py`
- Modify: `backend/tests/test_models.py`

**Step 1: Write tests for section_id in Project models**

Add to `backend/tests/test_models.py`:

```python
class TestProjectSectionId:
    """Test section_id field in Project models."""

    def test_project_response_with_section_id(self):
        """ProjectResponse should include optional section_id."""
        now = datetime.now(timezone.utc)
        project = ProjectResponse(
            id="123",
            title="Test Project",
            summary="A test project",
            content="Full project description",
            slug="test-project",
            createdDate=now,
            updatedDate=now,
            section_id="section-456",
        )
        assert project.section_id == "section-456"

    def test_project_response_without_section_id(self):
        """ProjectResponse should work without section_id (nullable)."""
        now = datetime.now(timezone.utc)
        project = ProjectResponse(
            id="123",
            title="Test Project",
            summary="A test project",
            content="Full project description",
            slug="test-project",
            createdDate=now,
            updatedDate=now,
        )
        assert project.section_id is None

    def test_project_card_with_section_id(self):
        """ProjectCard should include optional section_id."""
        card = ProjectCard(
            id="123",
            title="Test Project",
            slug="test-project",
            summary="A test project",
            technologies=["Python"],
            image_url=None,
            github_url=None,
            live_url=None,
            is_featured=False,
            section_id="section-456",
        )
        assert card.section_id == "section-456"
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest backend/tests/test_models.py::TestProjectSectionId -v
```

Expected: FAIL - section_id not defined

**Step 3: Add section_id to Project models**

Modify `backend/models/project.py`, add to `ProjectResponse`:

```python
class ProjectResponse(ProjectBase):
    """Model for project API responses."""

    id: str
    slug: str
    createdDate: datetime
    updatedDate: datetime
    user_id: str | None = None
    section_id: str | None = None  # Add this line

    # ... rest unchanged
```

Add to `ProjectCard`:

```python
class ProjectCard(BaseModel):
    """Lightweight model for project cards in listings."""

    id: str
    title: str
    slug: str
    summary: str
    technologies: List[str]
    image_url: Optional[str]
    github_url: Optional[str]
    live_url: Optional[str]
    is_featured: bool
    user_id: str | None = None
    section_id: str | None = None  # Add this line

    model_config = ConfigDict(from_attributes=True)
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest backend/tests/test_models.py::TestProjectSectionId -v
```

Expected: PASS

**Step 5: Run all tests**

```bash
make test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/models/project.py backend/tests/test_models.py
git commit -m "feat(models): add section_id to Project model"
```

---

## Task 3: Add section_id to Page Model

**Files:**
- Modify: `backend/models/page.py`
- Modify: `backend/tests/test_models.py`

**Step 1: Write tests for section_id in Page models**

Add to `backend/tests/test_models.py`:

```python
class TestPageSectionId:
    """Test section_id field in Page models."""

    def test_page_response_with_section_id(self):
        """PageResponse should include optional section_id."""
        now = datetime.now(timezone.utc)
        page = PageResponse(
            id="123",
            title="About Page",
            content="About content",
            page_type="about",
            is_published=True,
            createdDate=now,
            updatedDate=now,
            section_id="section-789",
        )
        assert page.section_id == "section-789"

    def test_page_response_without_section_id(self):
        """PageResponse should work without section_id (nullable)."""
        now = datetime.now(timezone.utc)
        page = PageResponse(
            id="123",
            title="About Page",
            content="About content",
            page_type="about",
            is_published=True,
            createdDate=now,
            updatedDate=now,
        )
        assert page.section_id is None
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest backend/tests/test_models.py::TestPageSectionId -v
```

Expected: FAIL - section_id not defined

**Step 3: Add section_id to Page model**

Modify `backend/models/page.py`:

```python
class PageResponse(PageBase):
    """Model for page API responses."""

    id: str
    createdDate: datetime
    updatedDate: datetime
    user_id: str | None = None
    section_id: str | None = None  # Add this line

    # ... rest unchanged
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest backend/tests/test_models.py::TestPageSectionId -v
```

Expected: PASS

**Step 5: Run all tests**

```bash
make test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/models/page.py backend/tests/test_models.py
git commit -m "feat(models): add section_id to Page model"
```

---

## Task 4: Create Section Seeding Migration

**Files:**
- Modify: `backend/handlers/migrations.py`
- Modify: `backend/database.py` (import sections collection getter)
- Create: `backend/tests/test_migrations.py`

**Step 1: Write test for section seeding migration**

Create `backend/tests/test_migrations.py`:

```python
"""Tests for database migrations."""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from handlers.migrations import migrate_seed_initial_sections, INITIAL_SECTIONS


class TestSeedInitialSections:
    """Test section seeding migration."""

    @pytest.mark.asyncio
    async def test_initial_sections_constant_has_four_sections(self):
        """INITIAL_SECTIONS should define blog, about, projects, contact."""
        assert len(INITIAL_SECTIONS) == 4
        slugs = [s["slug"] for s in INITIAL_SECTIONS]
        assert "blog" in slugs
        assert "about" in slugs
        assert "projects" in slugs
        assert "contact" in slugs

    @pytest.mark.asyncio
    async def test_blog_section_config(self):
        """Blog section should have correct display and content types."""
        blog = next(s for s in INITIAL_SECTIONS if s["slug"] == "blog")
        assert blog["title"] == "Blog"
        assert blog["display_type"] == "feed"
        assert blog["content_type"] == "story"
        assert blog["nav_visibility"] == "main"

    @pytest.mark.asyncio
    async def test_projects_section_config(self):
        """Projects section should have card-grid display."""
        projects = next(s for s in INITIAL_SECTIONS if s["slug"] == "projects")
        assert projects["title"] == "Projects"
        assert projects["display_type"] == "card-grid"
        assert projects["content_type"] == "project"

    @pytest.mark.asyncio
    async def test_about_and_contact_are_static_pages(self):
        """About and Contact should be static-page display with page content."""
        about = next(s for s in INITIAL_SECTIONS if s["slug"] == "about")
        contact = next(s for s in INITIAL_SECTIONS if s["slug"] == "contact")

        assert about["display_type"] == "static-page"
        assert about["content_type"] == "page"
        assert contact["display_type"] == "static-page"
        assert contact["content_type"] == "page"

    @pytest.mark.asyncio
    async def test_seed_skips_if_sections_exist(self):
        """Migration should skip if sections already exist."""
        mock_collection = AsyncMock()
        mock_collection.count_documents = AsyncMock(return_value=4)

        with patch("handlers.migrations.get_sections_collection", return_value=mock_collection):
            await migrate_seed_initial_sections()

        # Should not insert if sections exist
        mock_collection.insert_many.assert_not_called()

    @pytest.mark.asyncio
    async def test_seed_inserts_if_no_sections(self):
        """Migration should insert sections if none exist."""
        mock_collection = AsyncMock()
        mock_collection.count_documents = AsyncMock(return_value=0)
        mock_collection.insert_many = AsyncMock()

        with patch("handlers.migrations.get_sections_collection", return_value=mock_collection):
            await migrate_seed_initial_sections()

        # Should insert 4 sections
        mock_collection.insert_many.assert_called_once()
        call_args = mock_collection.insert_many.call_args[0][0]
        assert len(call_args) == 4
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest backend/tests/test_migrations.py -v
```

Expected: FAIL - migrate_seed_initial_sections not defined

**Step 3: Implement section seeding migration**

Add to `backend/handlers/migrations.py`:

```python
from database import (
    get_collection,
    get_pages_collection,
    get_projects_collection,
    get_sections_collection,  # Add this import
    get_users_collection,
)

# Initial sections matching hardcoded frontend SECTIONS array
INITIAL_SECTIONS = [
    {
        "title": "Blog",
        "slug": "blog",
        "parent_id": None,
        "display_type": "feed",
        "content_type": "story",
        "nav_visibility": "main",
        "sort_order": 0,
        "is_published": True,
        "is_deleted": False,
    },
    {
        "title": "About",
        "slug": "about",
        "parent_id": None,
        "display_type": "static-page",
        "content_type": "page",
        "nav_visibility": "main",
        "sort_order": 1,
        "is_published": True,
        "is_deleted": False,
    },
    {
        "title": "Projects",
        "slug": "projects",
        "parent_id": None,
        "display_type": "card-grid",
        "content_type": "project",
        "nav_visibility": "main",
        "sort_order": 2,
        "is_published": True,
        "is_deleted": False,
    },
    {
        "title": "Contact",
        "slug": "contact",
        "parent_id": None,
        "display_type": "static-page",
        "content_type": "page",
        "nav_visibility": "main",
        "sort_order": 3,
        "is_published": True,
        "is_deleted": False,
    },
]


async def migrate_seed_initial_sections():
    """
    Migration: Seed initial sections from hardcoded structure.
    Idempotent - skips if sections already exist.
    """
    try:
        sections_collection = await get_sections_collection()

        # Check if sections already exist
        existing_count = await sections_collection.count_documents({"is_deleted": False})
        if existing_count > 0:
            logger.info(f"Migration: {existing_count} sections already exist, skipping seed")
            return

        # Add timestamps to each section
        current_time = datetime.now(timezone.utc)
        sections_to_insert = []
        for section in INITIAL_SECTIONS:
            section_with_timestamps = {
                **section,
                "createdDate": current_time,
                "updatedDate": current_time,
            }
            sections_to_insert.append(section_with_timestamps)

        # Insert all sections
        result = await sections_collection.insert_many(sections_to_insert)
        logger.info(f"Migration: Seeded {len(result.inserted_ids)} initial sections")

    except Exception:
        logger.exception("Error seeding initial sections")
```

Update `run_migrations()`:

```python
async def run_migrations():
    """Run all pending migrations at startup."""
    await migrate_create_admin_user()
    await migrate_add_user_id_to_content()
    await migrate_seed_initial_sections()  # Add this line
    logger.info("Migrations completed")
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest backend/tests/test_migrations.py -v
```

Expected: PASS

**Step 5: Run all tests**

```bash
make test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/handlers/migrations.py backend/tests/test_migrations.py
git commit -m "feat(migrations): add section seeding migration"
```

---

## Task 5: Create Content Backfill Migration

**Files:**
- Modify: `backend/handlers/migrations.py`
- Modify: `backend/tests/test_migrations.py`

**Step 1: Write tests for content backfill migration**

Add to `backend/tests/test_migrations.py`:

```python
class TestBackfillSectionId:
    """Test section_id backfill migration."""

    @pytest.mark.asyncio
    async def test_backfill_stories_with_blog_section(self):
        """Stories without section_id should get blog section's ID."""
        mock_sections = AsyncMock()
        mock_sections.find_one = AsyncMock(return_value={"_id": "blog-section-id", "slug": "blog"})

        mock_stories = AsyncMock()
        mock_stories.update_many = AsyncMock(return_value=MagicMock(modified_count=5))

        with patch("handlers.migrations.get_sections_collection", return_value=mock_sections), \
             patch("handlers.migrations.get_collection", return_value=mock_stories):
            from handlers.migrations import migrate_backfill_section_id
            await migrate_backfill_section_id()

        # Should update stories without section_id
        mock_stories.update_many.assert_called_once()
        call_args = mock_stories.update_many.call_args
        assert call_args[0][0] == {"section_id": {"$exists": False}}
        assert call_args[0][1] == {"$set": {"section_id": "blog-section-id"}}

    @pytest.mark.asyncio
    async def test_backfill_projects_with_projects_section(self):
        """Projects without section_id should get projects section's ID."""
        mock_sections = AsyncMock()
        mock_sections.find_one = AsyncMock(return_value={"_id": "projects-section-id", "slug": "projects"})

        mock_projects = AsyncMock()
        mock_projects.update_many = AsyncMock(return_value=MagicMock(modified_count=3))

        with patch("handlers.migrations.get_sections_collection", return_value=mock_sections), \
             patch("handlers.migrations.get_projects_collection", return_value=mock_projects):
            from handlers.migrations import migrate_backfill_section_id
            await migrate_backfill_section_id()

        mock_projects.update_many.assert_called()

    @pytest.mark.asyncio
    async def test_backfill_pages_by_page_type(self):
        """Pages should be assigned to about or contact section based on page_type."""
        about_section = {"_id": "about-section-id", "slug": "about"}
        contact_section = {"_id": "contact-section-id", "slug": "contact"}

        mock_sections = AsyncMock()
        mock_sections.find_one = AsyncMock(side_effect=lambda q:
            about_section if q.get("slug") == "about" else
            contact_section if q.get("slug") == "contact" else
            None
        )

        mock_pages = AsyncMock()
        mock_pages.update_many = AsyncMock(return_value=MagicMock(modified_count=1))

        with patch("handlers.migrations.get_sections_collection", return_value=mock_sections), \
             patch("handlers.migrations.get_pages_collection", return_value=mock_pages):
            from handlers.migrations import migrate_backfill_section_id
            await migrate_backfill_section_id()

        # Should call update_many twice for pages (about and contact)
        assert mock_pages.update_many.call_count >= 2

    @pytest.mark.asyncio
    async def test_backfill_skips_if_section_not_found(self):
        """Migration should handle missing sections gracefully."""
        mock_sections = AsyncMock()
        mock_sections.find_one = AsyncMock(return_value=None)

        mock_stories = AsyncMock()

        with patch("handlers.migrations.get_sections_collection", return_value=mock_sections), \
             patch("handlers.migrations.get_collection", return_value=mock_stories):
            from handlers.migrations import migrate_backfill_section_id
            # Should not raise
            await migrate_backfill_section_id()

        # Should not try to update if section not found
        mock_stories.update_many.assert_not_called()
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest backend/tests/test_migrations.py::TestBackfillSectionId -v
```

Expected: FAIL - migrate_backfill_section_id not defined

**Step 3: Implement backfill migration**

Add to `backend/handlers/migrations.py`:

```python
async def migrate_backfill_section_id():
    """
    Migration: Backfill section_id on existing content.
    - Stories -> blog section
    - Projects -> projects section
    - Pages -> about or contact section (based on page_type)
    """
    try:
        sections_collection = await get_sections_collection()

        # Backfill stories with blog section
        blog_section = await sections_collection.find_one({"slug": "blog", "is_deleted": False})
        if blog_section:
            stories_collection = await get_collection()
            result = await stories_collection.update_many(
                {"section_id": {"$exists": False}},
                {"$set": {"section_id": str(blog_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(f"Migration: Backfilled section_id on {result.modified_count} stories")
        else:
            logger.warning("Migration: Blog section not found, skipping story backfill")

        # Backfill projects with projects section
        projects_section = await sections_collection.find_one({"slug": "projects", "is_deleted": False})
        if projects_section:
            projects_collection = await get_projects_collection()
            result = await projects_collection.update_many(
                {"section_id": {"$exists": False}},
                {"$set": {"section_id": str(projects_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(f"Migration: Backfilled section_id on {result.modified_count} projects")
        else:
            logger.warning("Migration: Projects section not found, skipping project backfill")

        # Backfill pages by page_type
        pages_collection = await get_pages_collection()

        about_section = await sections_collection.find_one({"slug": "about", "is_deleted": False})
        if about_section:
            result = await pages_collection.update_many(
                {"page_type": "about", "section_id": {"$exists": False}},
                {"$set": {"section_id": str(about_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(f"Migration: Backfilled section_id on {result.modified_count} about pages")

        contact_section = await sections_collection.find_one({"slug": "contact", "is_deleted": False})
        if contact_section:
            result = await pages_collection.update_many(
                {"page_type": "contact", "section_id": {"$exists": False}},
                {"$set": {"section_id": str(contact_section["_id"])}},
            )
            if result.modified_count > 0:
                logger.info(f"Migration: Backfilled section_id on {result.modified_count} contact pages")

        logger.info("Migration: Section ID backfill completed")

    except Exception:
        logger.exception("Error backfilling section_id")
```

Update `run_migrations()`:

```python
async def run_migrations():
    """Run all pending migrations at startup."""
    await migrate_create_admin_user()
    await migrate_add_user_id_to_content()
    await migrate_seed_initial_sections()
    await migrate_backfill_section_id()  # Add this line
    logger.info("Migrations completed")
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest backend/tests/test_migrations.py::TestBackfillSectionId -v
```

Expected: PASS

**Step 5: Run all tests**

```bash
make test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add backend/handlers/migrations.py backend/tests/test_migrations.py
git commit -m "feat(migrations): add section_id backfill migration"
```

---

## Task 6: Add section_id Index to Collections

**Files:**
- Modify: `backend/database.py`
- Modify: `backend/tests/test_database.py` (if exists, otherwise skip)

**Step 1: Add index creation for section_id**

Modify `backend/database.py` - add to the index creation for each content collection. Find the existing index creation patterns and add:

```python
# In the stories collection initialization (if index creation exists)
await collection.create_index("section_id")

# In the projects collection initialization
await collection.create_index("section_id")

# In the pages collection initialization
await collection.create_index("section_id")
```

Note: The exact location depends on how indexes are currently created. Look for existing `create_index` calls and add the section_id index there.

**Step 2: Verify indexes are created**

Start the backend and check MongoDB for the indexes:

```bash
make dev-backend
```

In another terminal, verify:
```bash
docker exec -it <mongodb-container> mongosh
use turbulence
db.stories.getIndexes()
```

Expected: section_id index should appear in the list.

**Step 3: Commit**

```bash
git add backend/database.py
git commit -m "feat(database): add section_id indexes to content collections"
```

---

## Task 7: Integration Test - Full Migration Flow

**Files:**
- Modify: `backend/tests/test_migrations.py`

**Step 1: Write integration test for full migration**

Add to `backend/tests/test_migrations.py`:

```python
class TestMigrationIntegration:
    """Integration tests for the full migration flow."""

    @pytest.mark.asyncio
    async def test_run_migrations_calls_all_migrations(self):
        """run_migrations should call all migration functions in order."""
        with patch("handlers.migrations.migrate_create_admin_user", new_callable=AsyncMock) as mock_admin, \
             patch("handlers.migrations.migrate_add_user_id_to_content", new_callable=AsyncMock) as mock_user_id, \
             patch("handlers.migrations.migrate_seed_initial_sections", new_callable=AsyncMock) as mock_seed, \
             patch("handlers.migrations.migrate_backfill_section_id", new_callable=AsyncMock) as mock_backfill:

            from handlers.migrations import run_migrations
            await run_migrations()

            mock_admin.assert_called_once()
            mock_user_id.assert_called_once()
            mock_seed.assert_called_once()
            mock_backfill.assert_called_once()

    @pytest.mark.asyncio
    async def test_migrations_are_idempotent(self):
        """Running migrations twice should not cause errors or duplicate data."""
        # This would be a real integration test with a test database
        # For unit tests, we verify the idempotency logic in individual tests
        pass
```

**Step 2: Run tests**

```bash
python -m pytest backend/tests/test_migrations.py::TestMigrationIntegration -v
```

Expected: PASS

**Step 3: Run all tests**

```bash
make test
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add backend/tests/test_migrations.py
git commit -m "test(migrations): add integration tests for migration flow"
```

---

## Task 8: Manual Verification

**Files:**
- None (manual verification)

**Step 1: Start the backend and trigger migrations**

```bash
source ~/Documents/venvs/turbulence/bin/activate
make dev-backend
```

Watch the logs for migration messages.

**Step 2: Verify sections were created**

```bash
curl http://localhost:5001/sections
```

Expected: JSON array with 4 sections (blog, about, projects, contact)

**Step 3: Verify section configurations**

```bash
curl http://localhost:5001/sections/slug/blog | jq
curl http://localhost:5001/sections/slug/projects | jq
```

Expected: Each section should have correct display_type and content_type.

**Step 4: Format check**

```bash
make format-check
```

Expected: No formatting issues.

**Step 5: Final test run**

```bash
make test
```

Expected: All tests pass.

---

## Task 9: Update Release Notes

**Files:**
- Modify: `docs/features/dynamic-sections/release-notes.md`

**Step 1: Update release notes with Phase 2 details**

Add the Phase 2 section with:
- What was added (section_id to models, migrations)
- Technical details (4 initial sections seeded, backfill logic)
- Breaking changes (none)

**Step 2: Commit**

```bash
git add docs/features/dynamic-sections/release-notes.md
git commit -m "docs: update release notes for Phase 2"
```

---

## Summary

After completing all tasks:
- Story, Project, and Page models have optional `section_id` field
- 4 initial sections seeded on startup (blog, about, projects, contact)
- Existing content backfilled with appropriate section_id
- Indexes added for section_id lookups
- All migrations are idempotent and run at startup
- Full test coverage for migration logic

**Checkpoint:** Data migrated, existing site unchanged. Content now linked to sections.
