"""Tests for database migrations (pymongo-migrate format)."""

import importlib.util
from pathlib import Path
from unittest.mock import MagicMock


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

    def test_seed_skips_if_sections_exist(self):
        """Migration should skip if sections already exist."""
        m3 = load_migration("0003_seed_initial_sections")

        mock_sections = MagicMock()
        mock_sections.count_documents.return_value = 4

        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_sections)

        m3.upgrade(mock_db)

        mock_sections.insert_many.assert_not_called()

    def test_seed_inserts_if_no_sections(self):
        """Migration should insert sections if none exist."""
        m3 = load_migration("0003_seed_initial_sections")

        mock_sections = MagicMock()
        mock_sections.count_documents.return_value = 0

        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_sections)

        m3.upgrade(mock_db)

        mock_sections.insert_many.assert_called_once()
        call_args = mock_sections.insert_many.call_args[0][0]
        assert len(call_args) == 4


class TestBackfillSectionId:
    """Test section_id backfill migration."""

    def test_backfill_stories_with_blog_section(self):
        """Stories without section_id should get blog section's ID."""
        m4 = load_migration("0004_backfill_section_id")

        blog_section = {"_id": "blog-section-id", "slug": "blog"}

        mock_sections = MagicMock()

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "blog":
                return blog_section
            return None

        mock_sections.find_one.side_effect = find_one_side_effect

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

        m4.upgrade(mock_db)

        mock_stories.update_many.assert_called_once()
        call_args = mock_stories.update_many.call_args
        assert call_args[0][0] == {"section_id": {"$exists": False}}
        assert call_args[0][1] == {"$set": {"section_id": "blog-section-id"}}

    def test_backfill_projects_with_projects_section(self):
        """Projects without section_id should get projects section's ID."""
        m4 = load_migration("0004_backfill_section_id")

        projects_section = {"_id": "projects-section-id", "slug": "projects"}

        mock_sections = MagicMock()

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "projects":
                return projects_section
            return None

        mock_sections.find_one.side_effect = find_one_side_effect

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

        m4.upgrade(mock_db)

        mock_projects.update_many.assert_called()

    def test_backfill_pages_by_page_type(self):
        """Pages should be assigned to about or contact section based on page_type."""
        m4 = load_migration("0004_backfill_section_id")

        about_section = {"_id": "about-section-id", "slug": "about"}
        contact_section = {"_id": "contact-section-id", "slug": "contact"}

        mock_sections = MagicMock()

        def find_one_side_effect(query):
            slug = query.get("slug")
            if slug == "about":
                return about_section
            elif slug == "contact":
                return contact_section
            return None

        mock_sections.find_one.side_effect = find_one_side_effect

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

        m4.upgrade(mock_db)

        # Should call update_many at least twice for pages (about and contact)
        assert mock_pages.update_many.call_count >= 2

    def test_backfill_skips_if_section_not_found(self):
        """Migration should handle missing sections gracefully."""
        m4 = load_migration("0004_backfill_section_id")

        mock_sections = MagicMock()
        mock_sections.find_one.return_value = None

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

        m4.upgrade(mock_db)

        mock_stories.update_many.assert_not_called()


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
