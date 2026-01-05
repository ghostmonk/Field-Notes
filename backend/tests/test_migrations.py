"""Tests for database migrations."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from handlers.migrations import INITIAL_SECTIONS, migrate_seed_initial_sections


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

        mock_collection.insert_many.assert_not_called()

    @pytest.mark.asyncio
    async def test_seed_inserts_if_no_sections(self):
        """Migration should insert sections if none exist."""
        mock_collection = AsyncMock()
        mock_collection.count_documents = AsyncMock(return_value=0)
        mock_collection.insert_many = AsyncMock()

        with patch("handlers.migrations.get_sections_collection", return_value=mock_collection):
            await migrate_seed_initial_sections()

        mock_collection.insert_many.assert_called_once()
        call_args = mock_collection.insert_many.call_args[0][0]
        assert len(call_args) == 4


class TestBackfillSectionId:
    """Test section_id backfill migration."""

    @pytest.mark.asyncio
    async def test_backfill_stories_with_blog_section(self):
        """Stories without section_id should get blog section's ID."""
        blog_section = {"_id": "blog-section-id", "slug": "blog"}

        mock_sections = AsyncMock()

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "blog":
                return blog_section
            return None

        mock_sections.find_one = AsyncMock(side_effect=find_one_side_effect)

        mock_stories = AsyncMock()
        mock_stories.update_many = AsyncMock(return_value=MagicMock(modified_count=5))

        mock_pages = AsyncMock()
        mock_pages.update_many = AsyncMock(return_value=MagicMock(modified_count=0))

        with (
            patch("handlers.migrations.get_sections_collection", return_value=mock_sections),
            patch("handlers.migrations.get_collection", return_value=mock_stories),
            patch("handlers.migrations.get_projects_collection", return_value=AsyncMock()),
            patch("handlers.migrations.get_pages_collection", return_value=mock_pages),
        ):
            from handlers.migrations import migrate_backfill_section_id

            await migrate_backfill_section_id()

        mock_stories.update_many.assert_called_once()
        call_args = mock_stories.update_many.call_args
        assert call_args[0][0] == {"section_id": {"$exists": False}}
        assert call_args[0][1] == {"$set": {"section_id": "blog-section-id"}}

    @pytest.mark.asyncio
    async def test_backfill_projects_with_projects_section(self):
        """Projects without section_id should get projects section's ID."""
        projects_section = {"_id": "projects-section-id", "slug": "projects"}

        mock_sections = AsyncMock()

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "projects":
                return projects_section
            return None

        mock_sections.find_one = AsyncMock(side_effect=find_one_side_effect)

        mock_projects = AsyncMock()
        mock_projects.update_many = AsyncMock(return_value=MagicMock(modified_count=3))

        mock_stories = AsyncMock()
        mock_stories.update_many = AsyncMock(return_value=MagicMock(modified_count=0))

        mock_pages = AsyncMock()
        mock_pages.update_many = AsyncMock(return_value=MagicMock(modified_count=0))

        with (
            patch("handlers.migrations.get_sections_collection", return_value=mock_sections),
            patch("handlers.migrations.get_projects_collection", return_value=mock_projects),
            patch("handlers.migrations.get_collection", return_value=mock_stories),
            patch("handlers.migrations.get_pages_collection", return_value=mock_pages),
        ):
            from handlers.migrations import migrate_backfill_section_id

            await migrate_backfill_section_id()

        mock_projects.update_many.assert_called()

    @pytest.mark.asyncio
    async def test_backfill_pages_by_page_type(self):
        """Pages should be assigned to about or contact section based on page_type."""
        about_section = {"_id": "about-section-id", "slug": "about"}
        contact_section = {"_id": "contact-section-id", "slug": "contact"}

        mock_sections = AsyncMock()

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "about":
                return about_section
            elif slug == "contact":
                return contact_section
            return None

        mock_sections.find_one = AsyncMock(side_effect=find_one_side_effect)

        mock_pages = AsyncMock()
        mock_pages.update_many = AsyncMock(return_value=MagicMock(modified_count=1))

        mock_stories = AsyncMock()
        mock_stories.update_many = AsyncMock(return_value=MagicMock(modified_count=0))

        mock_projects = AsyncMock()
        mock_projects.update_many = AsyncMock(return_value=MagicMock(modified_count=0))

        with (
            patch("handlers.migrations.get_sections_collection", return_value=mock_sections),
            patch("handlers.migrations.get_pages_collection", return_value=mock_pages),
            patch("handlers.migrations.get_collection", return_value=mock_stories),
            patch("handlers.migrations.get_projects_collection", return_value=mock_projects),
        ):
            from handlers.migrations import migrate_backfill_section_id

            await migrate_backfill_section_id()

        # Should call update_many at least twice for pages (about and contact)
        assert mock_pages.update_many.call_count >= 2

    @pytest.mark.asyncio
    async def test_backfill_skips_if_section_not_found(self):
        """Migration should handle missing sections gracefully."""
        mock_sections = AsyncMock()
        mock_sections.find_one = AsyncMock(return_value=None)

        mock_stories = AsyncMock()
        mock_stories.update_many = AsyncMock()

        mock_pages = AsyncMock()
        mock_pages.update_many = AsyncMock()

        with (
            patch("handlers.migrations.get_sections_collection", return_value=mock_sections),
            patch("handlers.migrations.get_collection", return_value=mock_stories),
            patch("handlers.migrations.get_projects_collection", return_value=AsyncMock()),
            patch("handlers.migrations.get_pages_collection", return_value=mock_pages),
        ):
            from handlers.migrations import migrate_backfill_section_id

            await migrate_backfill_section_id()

        mock_stories.update_many.assert_not_called()


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
