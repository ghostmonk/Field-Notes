"""Tests for database migrations (pymongo-migrate format)."""

import importlib.util
from pathlib import Path
from unittest.mock import MagicMock

import pytest


def load_migration(name: str):
    """Load a migration module by name."""
    migrations_dir = Path(__file__).parent.parent / "migrations"
    migration_path = migrations_dir / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, migration_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestMigrationStructure:
    """Test migration files have correct structure."""

    def test_all_migrations_have_required_attributes(self):
        """Each migration must have name, dependencies, upgrade, downgrade."""
        migrations_dir = Path(__file__).parent.parent / "migrations"
        migration_files = sorted(migrations_dir.glob("*.py"))
        assert len(migration_files) >= 4, "Expected at least 4 migration files"

        for migration_file in migration_files:
            if migration_file.name.startswith("__"):
                continue
            module = load_migration(migration_file.stem)
            assert hasattr(module, "name"), f"{migration_file.name} missing 'name'"
            assert hasattr(module, "dependencies"), f"{migration_file.name} missing 'dependencies'"
            assert hasattr(module, "upgrade"), f"{migration_file.name} missing 'upgrade'"
            assert hasattr(module, "downgrade"), f"{migration_file.name} missing 'downgrade'"

    def test_migration_dependencies_form_valid_chain(self):
        """Dependencies should form a valid ordered chain."""
        m1 = load_migration("0001_create_admin_user")
        m2 = load_migration("0002_add_user_id_to_content")
        m3 = load_migration("0003_seed_initial_sections")
        m4 = load_migration("0004_backfill_section_id")

        assert m1.dependencies == []
        assert m2.dependencies == ["0001_create_admin_user"]
        assert m3.dependencies == ["0002_add_user_id_to_content"]
        assert m4.dependencies == ["0003_seed_initial_sections"]


class TestSeedInitialSections:
    """Test section seeding migration."""

    def test_initial_sections_constant_has_four_sections(self):
        """INITIAL_SECTIONS should define blog, about, projects, contact."""
        m3 = load_migration("0003_seed_initial_sections")
        assert len(m3.INITIAL_SECTIONS) == 4
        slugs = [s["slug"] for s in m3.INITIAL_SECTIONS]
        assert "blog" in slugs
        assert "about" in slugs
        assert "projects" in slugs
        assert "contact" in slugs

    def test_blog_section_config(self):
        """Blog section should have correct display and content types."""
        m3 = load_migration("0003_seed_initial_sections")
        blog = next(s for s in m3.INITIAL_SECTIONS if s["slug"] == "blog")
        assert blog["title"] == "Blog"
        assert blog["display_type"] == "feed"
        assert blog["content_type"] == "story"
        assert blog["nav_visibility"] == "main"

    def test_projects_section_config(self):
        """Projects section should have card-grid display."""
        m3 = load_migration("0003_seed_initial_sections")
        projects = next(s for s in m3.INITIAL_SECTIONS if s["slug"] == "projects")
        assert projects["title"] == "Projects"
        assert projects["display_type"] == "card-grid"
        assert projects["content_type"] == "project"

    def test_about_and_contact_are_static_pages(self):
        """About and Contact should be static-page display with page content."""
        m3 = load_migration("0003_seed_initial_sections")
        about = next(s for s in m3.INITIAL_SECTIONS if s["slug"] == "about")
        contact = next(s for s in m3.INITIAL_SECTIONS if s["slug"] == "contact")

        assert about["display_type"] == "static-page"
        assert about["content_type"] == "page"
        assert contact["display_type"] == "static-page"
        assert contact["content_type"] == "page"

    def test_seed_skips_existing_sections_individually(self):
        """Migration should skip sections that already exist by slug."""
        m3 = load_migration("0003_seed_initial_sections")

        mock_sections = MagicMock()
        # blog exists, about does not, projects exists, contact does not
        existing_blog = {"_id": "blog-id", "slug": "blog"}
        existing_projects = {"_id": "projects-id", "slug": "projects"}

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "blog":
                return existing_blog
            elif slug == "projects":
                return existing_projects
            return None

        mock_sections.find_one.side_effect = find_one_side_effect

        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_sections)

        m3.upgrade(mock_db)

        # Should insert only the 2 missing sections (about, contact)
        assert mock_sections.insert_one.call_count == 2

    def test_seed_inserts_all_if_none_exist(self):
        """Migration should insert all sections if none exist."""
        m3 = load_migration("0003_seed_initial_sections")

        mock_sections = MagicMock()
        mock_sections.find_one.return_value = None

        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_sections)

        m3.upgrade(mock_db)

        assert mock_sections.insert_one.call_count == 4

    def test_seed_inserts_none_if_all_exist(self):
        """Migration should skip entirely if all sections exist."""
        m3 = load_migration("0003_seed_initial_sections")

        mock_sections = MagicMock()
        mock_sections.find_one.return_value = {"_id": "some-id", "slug": "exists"}

        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_sections)

        m3.upgrade(mock_db)

        mock_sections.insert_one.assert_not_called()


class TestBackfillSectionId:
    """Test section_id backfill migration."""

    def _make_mock_db(self):
        """Create a mock DB with sections, stories, projects, pages collections."""
        mock_sections = MagicMock()
        mock_stories = MagicMock()
        mock_projects = MagicMock()
        mock_pages = MagicMock()

        mock_db = MagicMock()

        def getitem(name):
            if name == "sections":
                return mock_sections
            elif name == "stories":
                return mock_stories
            elif name == "projects":
                return mock_projects
            elif name == "pages":
                return mock_pages
            return MagicMock()

        mock_db.__getitem__ = MagicMock(side_effect=getitem)
        return mock_db, mock_sections, mock_stories, mock_projects, mock_pages

    def test_backfill_stores_objectid_not_string(self):
        """section_id should be stored as ObjectId, not str(ObjectId)."""
        from bson import ObjectId

        m4 = load_migration("0004_backfill_section_id")

        blog_id = ObjectId()
        projects_id = ObjectId()
        about_id = ObjectId()
        contact_id = ObjectId()

        mock_db, mock_sections, mock_stories, mock_projects, mock_pages = self._make_mock_db()

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "blog":
                return {"_id": blog_id, "slug": "blog"}
            elif slug == "projects":
                return {"_id": projects_id, "slug": "projects"}
            elif slug == "about":
                return {"_id": about_id, "slug": "about"}
            elif slug == "contact":
                return {"_id": contact_id, "slug": "contact"}
            return None

        mock_sections.find_one.side_effect = find_one_side_effect

        m4.upgrade(mock_db)

        # Verify ObjectId is stored, not string
        stories_call = mock_stories.update_many.call_args
        assert stories_call[0][1] == {"$set": {"section_id": blog_id}}
        assert isinstance(stories_call[0][1]["$set"]["section_id"], ObjectId)

    def test_backfill_stories_with_blog_section(self):
        """Stories without section_id should get blog section's ID."""
        m4 = load_migration("0004_backfill_section_id")

        mock_db, mock_sections, mock_stories, mock_projects, mock_pages = self._make_mock_db()

        def find_one_side_effect(query):
            slug = query.get("slug")
            sections = {
                "blog": {"_id": "blog-section-id", "slug": "blog"},
                "projects": {"_id": "projects-section-id", "slug": "projects"},
                "about": {"_id": "about-section-id", "slug": "about"},
                "contact": {"_id": "contact-section-id", "slug": "contact"},
            }
            return sections.get(slug)

        mock_sections.find_one.side_effect = find_one_side_effect

        m4.upgrade(mock_db)

        mock_stories.update_many.assert_called_once()
        call_args = mock_stories.update_many.call_args
        assert call_args[0][0] == {"section_id": {"$exists": False}}
        assert call_args[0][1] == {"$set": {"section_id": "blog-section-id"}}

    def test_backfill_projects_with_projects_section(self):
        """Projects without section_id should get projects section's ID."""
        m4 = load_migration("0004_backfill_section_id")

        mock_db, mock_sections, mock_stories, mock_projects, mock_pages = self._make_mock_db()

        def find_one_side_effect(query):
            slug = query.get("slug")
            sections = {
                "blog": {"_id": "blog-id", "slug": "blog"},
                "projects": {"_id": "projects-section-id", "slug": "projects"},
                "about": {"_id": "about-id", "slug": "about"},
                "contact": {"_id": "contact-id", "slug": "contact"},
            }
            return sections.get(slug)

        mock_sections.find_one.side_effect = find_one_side_effect

        m4.upgrade(mock_db)

        mock_projects.update_many.assert_called()

    def test_backfill_pages_by_page_type(self):
        """Pages should be assigned to about or contact section based on page_type."""
        m4 = load_migration("0004_backfill_section_id")

        mock_db, mock_sections, mock_stories, mock_projects, mock_pages = self._make_mock_db()

        def find_one_side_effect(query):
            slug = query.get("slug")
            sections = {
                "blog": {"_id": "blog-id", "slug": "blog"},
                "projects": {"_id": "projects-id", "slug": "projects"},
                "about": {"_id": "about-section-id", "slug": "about"},
                "contact": {"_id": "contact-section-id", "slug": "contact"},
            }
            return sections.get(slug)

        mock_sections.find_one.side_effect = find_one_side_effect

        m4.upgrade(mock_db)

        # Should call update_many twice for pages (about and contact)
        assert mock_pages.update_many.call_count == 2

    def test_backfill_raises_if_section_not_found(self):
        """Migration should raise ValueError if required sections are missing."""
        m4 = load_migration("0004_backfill_section_id")

        mock_db, mock_sections, mock_stories, mock_projects, mock_pages = self._make_mock_db()
        mock_sections.find_one.return_value = None

        with pytest.raises(ValueError, match="Required section 'blog' not found"):
            m4.upgrade(mock_db)


class TestDowngradeMigrations:
    """Test that downgrade functions work correctly."""

    def test_downgrade_backfill_removes_section_id(self):
        """Downgrade should remove section_id from all content."""
        m4 = load_migration("0004_backfill_section_id")

        mock_stories = MagicMock()
        mock_projects = MagicMock()
        mock_pages = MagicMock()

        mock_db = MagicMock()

        def getitem(name):
            if name == "stories":
                return mock_stories
            elif name == "projects":
                return mock_projects
            elif name == "pages":
                return mock_pages
            return MagicMock()

        mock_db.__getitem__ = MagicMock(side_effect=getitem)

        m4.downgrade(mock_db)

        mock_stories.update_many.assert_called_with({}, {"$unset": {"section_id": ""}})
        mock_projects.update_many.assert_called_with({}, {"$unset": {"section_id": ""}})
        mock_pages.update_many.assert_called_with({}, {"$unset": {"section_id": ""}})

    def test_downgrade_seed_sections_deletes_initial_sections(self):
        """Downgrade should delete the seeded sections."""
        m3 = load_migration("0003_seed_initial_sections")

        mock_sections = MagicMock()

        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_sections)

        m3.downgrade(mock_db)

        mock_sections.delete_many.assert_called_once()
        call_args = mock_sections.delete_many.call_args[0][0]
        assert "slug" in call_args
        assert "$in" in call_args["slug"]
        slugs = call_args["slug"]["$in"]
        assert "blog" in slugs
        assert "about" in slugs
        assert "projects" in slugs
        assert "contact" in slugs
