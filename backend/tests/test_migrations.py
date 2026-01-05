"""Tests for database migrations."""

from unittest.mock import AsyncMock, patch

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
