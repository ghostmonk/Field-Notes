"""
Unit tests for Pydantic models
"""

from datetime import datetime, timezone

import pytest
from models.navlink import (
    NavLinkBase,
    NavLinkCreate,
    NavLinkResponse,
    NavLinkUpdate,
)
from models.page import PageBase, PageResponse, PageUpdate
from models.project import (
    ProjectBase,
    ProjectCard,
    ProjectResponse,
    ProjectUpdate,
)
from models.section import (
    SectionBase,
    SectionCreate,
    SectionResponse,
    SectionUpdate,
)
from models.story import StoryBase, StoryCreate, StoryResponse
from pydantic import ValidationError


class TestStoryBase:
    """Test StoryBase model"""

    @pytest.mark.unit
    def test_valid_story_base(self):
        """Test creating a valid StoryBase"""
        story_data = {
            "title": "Test Story",
            "content": "This is test content",
            "is_published": True,
        }
        story = StoryBase(**story_data)

        assert story.title == "Test Story"
        assert story.content == "This is test content"
        assert story.is_published is True

    @pytest.mark.unit
    def test_story_base_empty_title(self):
        """Test that empty title raises validation error"""
        story_data = {"title": "", "content": "This is test content", "is_published": True}

        with pytest.raises(ValidationError) as exc_info:
            StoryBase(**story_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_short" for error in errors)

    @pytest.mark.unit
    def test_story_base_title_too_long(self):
        """Test that title longer than 200 chars raises validation error"""
        story_data = {
            "title": "x" * 201,  # 201 characters
            "content": "This is test content",
            "is_published": True,
        }

        with pytest.raises(ValidationError) as exc_info:
            StoryBase(**story_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_long" for error in errors)

    @pytest.mark.unit
    def test_story_base_empty_content(self):
        """Test that empty content raises validation error"""
        story_data = {"title": "Test Story", "content": "", "is_published": True}

        with pytest.raises(ValidationError) as exc_info:
            StoryBase(**story_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_short" for error in errors)

    @pytest.mark.unit
    def test_story_base_content_too_long(self):
        """Test that content longer than 10000 chars raises validation error"""
        story_data = {
            "title": "Test Story",
            "content": "x" * 10001,  # 10001 characters
            "is_published": True,
        }

        with pytest.raises(ValidationError) as exc_info:
            StoryBase(**story_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_long" for error in errors)

    @pytest.mark.unit
    def test_story_base_missing_required_fields(self):
        """Test that missing required fields raise validation error"""
        incomplete_data = {"title": "Test Story"}

        with pytest.raises(ValidationError) as exc_info:
            StoryBase(**incomplete_data)

        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        assert "content" in error_fields
        assert "is_published" in error_fields


class TestStoryCreate:
    """Test StoryCreate model"""

    @pytest.mark.unit
    def test_story_create_inherits_from_story_base(self):
        """Test that StoryCreate has same validation as StoryBase"""
        story_data = {
            "title": "Test Story",
            "content": "This is test content",
            "is_published": False,
        }
        story = StoryCreate(**story_data)

        assert story.title == "Test Story"
        assert story.content == "This is test content"
        assert story.is_published is False


class TestStoryResponse:
    """Test StoryResponse model"""

    @pytest.mark.unit
    def test_valid_story_response(self):
        """Test creating a valid StoryResponse"""
        now = datetime.now(timezone.utc)
        story_data = {
            "title": "Test Story",
            "content": "This is test content",
            "is_published": True,
            "id": "507f1f77bcf86cd799439011",
            "slug": "test-story",
            "date": now,
            "createdDate": now,
            "updatedDate": now,
        }
        story = StoryResponse(**story_data)

        assert story.title == "Test Story"
        assert story.id == "507f1f77bcf86cd799439011"
        assert story.slug == "test-story"
        assert story.date == now
        assert story.createdDate == now
        assert story.updatedDate == now

    @pytest.mark.unit
    def test_story_response_default_slug(self):
        """Test that slug defaults to empty string"""
        now = datetime.now(timezone.utc)
        story_data = {
            "title": "Test Story",
            "content": "This is test content",
            "is_published": True,
            "id": "507f1f77bcf86cd799439011",
            "date": now,
            "createdDate": now,
            "updatedDate": now,
        }
        story = StoryResponse(**story_data)

        assert story.slug == ""

    @pytest.mark.unit
    def test_story_response_timezone_validation_naive_datetime(self):
        """Test that naive datetime gets converted to UTC"""
        naive_datetime = datetime(2024, 1, 1, 12, 0, 0)  # No timezone
        story_data = {
            "title": "Test Story",
            "content": "This is test content",
            "is_published": True,
            "id": "507f1f77bcf86cd799439011",
            "slug": "test-story",
            "date": naive_datetime,
            "createdDate": naive_datetime,
            "updatedDate": naive_datetime,
        }
        story = StoryResponse(**story_data)

        # Should add UTC timezone
        expected_datetime = naive_datetime.replace(tzinfo=timezone.utc)
        assert story.date == expected_datetime
        assert story.createdDate == expected_datetime
        assert story.updatedDate == expected_datetime

    @pytest.mark.unit
    def test_story_response_timezone_validation_aware_datetime(self):
        """Test that timezone-aware datetime gets converted to UTC"""
        # Create a datetime with a different timezone (EST = UTC-5)
        from datetime import timedelta, timezone

        est = timezone(timedelta(hours=-5))
        est_datetime = datetime(2024, 1, 1, 12, 0, 0, tzinfo=est)

        story_data = {
            "title": "Test Story",
            "content": "This is test content",
            "is_published": True,
            "id": "507f1f77bcf86cd799439011",
            "slug": "test-story",
            "date": est_datetime,
            "createdDate": est_datetime,
            "updatedDate": est_datetime,
        }
        story = StoryResponse(**story_data)

        # Should convert to UTC (EST 12:00 = UTC 17:00)
        expected_utc = est_datetime.astimezone(timezone.utc)
        assert story.date == expected_utc
        assert story.createdDate == expected_utc
        assert story.updatedDate == expected_utc
        assert story.date.hour == 17  # Converted from EST 12:00 to UTC 17:00


class TestPageBase:
    """Test PageBase model"""

    @pytest.mark.unit
    def test_valid_page_base(self):
        """Test creating a valid PageBase"""
        page_data = {
            "title": "About Me",
            "content": "<p>This is the about page content.</p>",
            "page_type": "about",
            "is_published": True,
        }
        page = PageBase(**page_data)

        assert page.title == "About Me"
        assert page.content == "<p>This is the about page content.</p>"
        assert page.page_type == "about"
        assert page.is_published is True

    @pytest.mark.unit
    def test_page_base_contact_type(self):
        """Test PageBase with contact page type"""
        page_data = {
            "title": "Contact",
            "content": "Contact information here",
            "page_type": "contact",
        }
        page = PageBase(**page_data)
        assert page.page_type == "contact"

    @pytest.mark.unit
    def test_page_base_invalid_page_type(self):
        """Test that invalid page type raises validation error"""
        page_data = {
            "title": "Invalid",
            "content": "Content here",
            "page_type": "invalid",
        }

        with pytest.raises(ValidationError) as exc_info:
            PageBase(**page_data)

        errors = exc_info.value.errors()
        assert any("page_type" in str(error["loc"]) for error in errors)

    @pytest.mark.unit
    def test_page_base_empty_title(self):
        """Test that empty title raises validation error"""
        page_data = {
            "title": "",
            "content": "Some content",
            "page_type": "about",
        }

        with pytest.raises(ValidationError) as exc_info:
            PageBase(**page_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_short" for error in errors)

    @pytest.mark.unit
    def test_page_base_title_too_long(self):
        """Test that title longer than 200 chars raises validation error"""
        page_data = {
            "title": "x" * 201,
            "content": "Content",
            "page_type": "about",
        }

        with pytest.raises(ValidationError) as exc_info:
            PageBase(**page_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_long" for error in errors)

    @pytest.mark.unit
    def test_page_base_empty_content(self):
        """Test that empty content raises validation error"""
        page_data = {
            "title": "About",
            "content": "",
            "page_type": "about",
        }

        with pytest.raises(ValidationError) as exc_info:
            PageBase(**page_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_short" for error in errors)

    @pytest.mark.unit
    def test_page_base_default_is_published(self):
        """Test that is_published defaults to True"""
        page_data = {
            "title": "About",
            "content": "Content",
            "page_type": "about",
        }
        page = PageBase(**page_data)
        assert page.is_published is True


class TestPageUpdate:
    """Test PageUpdate model"""

    @pytest.mark.unit
    def test_page_update_all_optional(self):
        """Test that all fields in PageUpdate are optional"""
        page = PageUpdate()
        assert page.title is None
        assert page.content is None
        assert page.is_published is None

    @pytest.mark.unit
    def test_page_update_partial(self):
        """Test partial update with only some fields"""
        page = PageUpdate(title="New Title")
        assert page.title == "New Title"
        assert page.content is None


class TestPageResponse:
    """Test PageResponse model"""

    @pytest.mark.unit
    def test_valid_page_response(self):
        """Test creating a valid PageResponse"""
        now = datetime.now(timezone.utc)
        page_data = {
            "title": "About Me",
            "content": "<p>Content here</p>",
            "page_type": "about",
            "is_published": True,
            "id": "507f1f77bcf86cd799439011",
            "createdDate": now,
            "updatedDate": now,
        }
        page = PageResponse(**page_data)

        assert page.title == "About Me"
        assert page.id == "507f1f77bcf86cd799439011"
        assert page.createdDate == now
        assert page.updatedDate == now

    @pytest.mark.unit
    def test_page_response_timezone_validation(self):
        """Test that naive datetime gets converted to UTC"""
        naive_datetime = datetime(2024, 1, 1, 12, 0, 0)
        page_data = {
            "title": "About",
            "content": "Content",
            "page_type": "about",
            "is_published": True,
            "id": "507f1f77bcf86cd799439011",
            "createdDate": naive_datetime,
            "updatedDate": naive_datetime,
        }
        page = PageResponse(**page_data)

        expected_datetime = naive_datetime.replace(tzinfo=timezone.utc)
        assert page.createdDate == expected_datetime
        assert page.updatedDate == expected_datetime


class TestProjectBase:
    """Test ProjectBase model"""

    @pytest.mark.unit
    def test_valid_project_base(self):
        """Test creating a valid ProjectBase"""
        project_data = {
            "title": "My Awesome Project",
            "summary": "A brief summary of the project",
            "content": "<p>Detailed project description.</p>",
            "technologies": ["Python", "FastAPI", "MongoDB"],
            "github_url": "https://github.com/user/project",
            "live_url": "https://project.example.com",
            "is_published": True,
            "is_featured": True,
        }
        project = ProjectBase(**project_data)

        assert project.title == "My Awesome Project"
        assert project.summary == "A brief summary of the project"
        assert project.technologies == ["Python", "FastAPI", "MongoDB"]
        assert project.github_url == "https://github.com/user/project"
        assert project.is_featured is True

    @pytest.mark.unit
    def test_project_base_minimal(self):
        """Test ProjectBase with only required fields"""
        project_data = {
            "title": "Simple Project",
            "summary": "Summary",
            "content": "Content",
        }
        project = ProjectBase(**project_data)

        assert project.title == "Simple Project"
        assert project.technologies == []
        assert project.github_url is None
        assert project.live_url is None
        assert project.image_url is None
        assert project.is_published is True
        assert project.is_featured is False
        assert project.sort_order == 0

    @pytest.mark.unit
    def test_project_base_empty_title(self):
        """Test that empty title raises validation error"""
        project_data = {
            "title": "",
            "summary": "Summary",
            "content": "Content",
        }

        with pytest.raises(ValidationError) as exc_info:
            ProjectBase(**project_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_short" for error in errors)

    @pytest.mark.unit
    def test_project_base_title_too_long(self):
        """Test that title longer than 200 chars raises validation error"""
        project_data = {
            "title": "x" * 201,
            "summary": "Summary",
            "content": "Content",
        }

        with pytest.raises(ValidationError) as exc_info:
            ProjectBase(**project_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_long" for error in errors)

    @pytest.mark.unit
    def test_project_base_summary_too_long(self):
        """Test that summary longer than 500 chars raises validation error"""
        project_data = {
            "title": "Project",
            "summary": "x" * 501,
            "content": "Content",
        }

        with pytest.raises(ValidationError) as exc_info:
            ProjectBase(**project_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_long" for error in errors)

    @pytest.mark.unit
    def test_project_base_empty_summary(self):
        """Test that empty summary raises validation error"""
        project_data = {
            "title": "Project",
            "summary": "",
            "content": "Content",
        }

        with pytest.raises(ValidationError) as exc_info:
            ProjectBase(**project_data)

        errors = exc_info.value.errors()
        assert any(error["type"] == "string_too_short" for error in errors)

    @pytest.mark.unit
    def test_project_base_missing_required_fields(self):
        """Test that missing required fields raise validation error"""
        incomplete_data = {"title": "Project"}

        with pytest.raises(ValidationError) as exc_info:
            ProjectBase(**incomplete_data)

        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        assert "summary" in error_fields
        assert "content" in error_fields


class TestProjectUpdate:
    """Test ProjectUpdate model"""

    @pytest.mark.unit
    def test_project_update_all_optional(self):
        """Test that all fields in ProjectUpdate are optional"""
        project = ProjectUpdate()
        assert project.title is None
        assert project.summary is None
        assert project.content is None
        assert project.technologies is None
        assert project.is_featured is None

    @pytest.mark.unit
    def test_project_update_partial(self):
        """Test partial update with only some fields"""
        project = ProjectUpdate(title="New Title", is_featured=True)
        assert project.title == "New Title"
        assert project.is_featured is True
        assert project.summary is None


class TestProjectResponse:
    """Test ProjectResponse model"""

    @pytest.mark.unit
    def test_valid_project_response(self):
        """Test creating a valid ProjectResponse"""
        now = datetime.now(timezone.utc)
        project_data = {
            "title": "My Project",
            "summary": "Project summary",
            "content": "<p>Project content</p>",
            "technologies": ["React", "TypeScript"],
            "github_url": "https://github.com/user/project",
            "is_published": True,
            "is_featured": False,
            "sort_order": 1,
            "id": "507f1f77bcf86cd799439011",
            "slug": "my-project",
            "createdDate": now,
            "updatedDate": now,
        }
        project = ProjectResponse(**project_data)

        assert project.title == "My Project"
        assert project.id == "507f1f77bcf86cd799439011"
        assert project.slug == "my-project"
        assert project.technologies == ["React", "TypeScript"]

    @pytest.mark.unit
    def test_project_response_timezone_validation(self):
        """Test that naive datetime gets converted to UTC"""
        naive_datetime = datetime(2024, 1, 1, 12, 0, 0)
        project_data = {
            "title": "Project",
            "summary": "Summary",
            "content": "Content",
            "technologies": [],
            "is_published": True,
            "is_featured": False,
            "sort_order": 0,
            "id": "507f1f77bcf86cd799439011",
            "slug": "project",
            "createdDate": naive_datetime,
            "updatedDate": naive_datetime,
        }
        project = ProjectResponse(**project_data)

        expected_datetime = naive_datetime.replace(tzinfo=timezone.utc)
        assert project.createdDate == expected_datetime
        assert project.updatedDate == expected_datetime


class TestProjectCard:
    """Test ProjectCard model"""

    @pytest.mark.unit
    def test_valid_project_card(self):
        """Test creating a valid ProjectCard"""
        card_data = {
            "id": "507f1f77bcf86cd799439011",
            "title": "My Project",
            "slug": "my-project",
            "summary": "A brief summary",
            "technologies": ["Python", "FastAPI"],
            "image_url": "https://example.com/image.jpg",
            "github_url": "https://github.com/user/project",
            "live_url": "https://project.example.com",
            "is_featured": True,
        }
        card = ProjectCard(**card_data)

        assert card.id == "507f1f77bcf86cd799439011"
        assert card.title == "My Project"
        assert card.slug == "my-project"
        assert card.technologies == ["Python", "FastAPI"]
        assert card.is_featured is True

    @pytest.mark.unit
    def test_project_card_optional_urls(self):
        """Test ProjectCard with optional URL fields as None"""
        card_data = {
            "id": "507f1f77bcf86cd799439011",
            "title": "My Project",
            "slug": "my-project",
            "summary": "Summary",
            "technologies": [],
            "image_url": None,
            "github_url": None,
            "live_url": None,
            "is_featured": False,
        }
        card = ProjectCard(**card_data)

        assert card.image_url is None
        assert card.github_url is None
        assert card.live_url is None


class TestSectionBase:
    """Tests for SectionBase model."""

    @pytest.mark.unit
    def test_valid_section_base(self):
        """Test creating a valid SectionBase."""
        section = SectionBase(
            title="Blog",
            slug="blog",
            display_type="feed",
            content_type="story",
            nav_visibility="main",
            sort_order=0,
        )
        assert section.title == "Blog"
        assert section.slug == "blog"
        assert section.display_type == "feed"
        assert section.content_type == "story"
        assert section.nav_visibility == "main"
        assert section.sort_order == 0
        assert section.parent_id is None
        assert section.is_published is True

    @pytest.mark.unit
    def test_section_base_with_parent(self):
        """Test creating a section with parent_id."""
        section = SectionBase(
            title="Photography",
            slug="photography",
            display_type="gallery",
            content_type="image",
            nav_visibility="main",
            sort_order=1,
            parent_id="507f1f77bcf86cd799439011",
        )
        assert section.parent_id == "507f1f77bcf86cd799439011"

    @pytest.mark.unit
    def test_section_base_title_required(self):
        """Test that title is required."""
        with pytest.raises(ValidationError):
            SectionBase(
                slug="blog",
                display_type="feed",
                content_type="story",
                nav_visibility="main",
                sort_order=0,
            )

    @pytest.mark.unit
    def test_section_base_invalid_display_type(self):
        """Test that invalid display_type is rejected."""
        with pytest.raises(ValidationError):
            SectionBase(
                title="Blog",
                slug="blog",
                display_type="invalid",
                content_type="story",
                nav_visibility="main",
                sort_order=0,
            )

    @pytest.mark.unit
    def test_section_base_invalid_nav_visibility(self):
        """Test that invalid nav_visibility is rejected."""
        with pytest.raises(ValidationError):
            SectionBase(
                title="Blog",
                slug="blog",
                display_type="feed",
                content_type="story",
                nav_visibility="invalid",
                sort_order=0,
            )


class TestSectionCreate:
    """Tests for SectionCreate model."""

    @pytest.mark.unit
    def test_valid_section_create(self):
        """Test creating a valid SectionCreate."""
        section = SectionCreate(
            title="Projects",
            display_type="card-grid",
            content_type="project",
            nav_visibility="main",
            sort_order=2,
        )
        assert section.title == "Projects"
        assert section.slug is None  # Generated by handler


class TestSectionUpdate:
    """Tests for SectionUpdate model."""

    @pytest.mark.unit
    def test_section_update_partial(self):
        """Test updating with partial data."""
        update = SectionUpdate(title="New Title")
        assert update.title == "New Title"
        assert update.display_type is None
        assert update.is_published is None

    @pytest.mark.unit
    def test_section_update_empty_valid(self):
        """Test that empty update is valid."""
        update = SectionUpdate()
        assert update.title is None


class TestSectionResponse:
    """Tests for SectionResponse model."""

    @pytest.mark.unit
    def test_valid_section_response(self):
        """Test creating a valid SectionResponse."""
        now = datetime.now(timezone.utc)
        section = SectionResponse(
            id="507f1f77bcf86cd799439011",
            title="Blog",
            slug="blog",
            display_type="feed",
            content_type="story",
            nav_visibility="main",
            sort_order=0,
            is_published=True,
            createdDate=now,
            updatedDate=now,
        )
        assert section.id == "507f1f77bcf86cd799439011"
        assert section.createdDate.tzinfo is not None


class TestNavLinkBase:
    """Tests for NavLinkBase model."""

    @pytest.mark.unit
    def test_valid_navlink_base(self):
        """Test creating a valid NavLinkBase."""
        link = NavLinkBase(
            label="GitHub",
            url="https://github.com/user",
            sort_order=0,
        )
        assert link.label == "GitHub"
        assert link.url == "https://github.com/user"
        assert link.sort_order == 0
        assert link.is_published is True

    @pytest.mark.unit
    def test_navlink_internal_url(self):
        """Test creating a navlink with internal path."""
        link = NavLinkBase(
            label="About",
            url="/about",
            sort_order=1,
        )
        assert link.url == "/about"

    @pytest.mark.unit
    def test_navlink_label_required(self):
        """Test that label is required."""
        with pytest.raises(ValidationError):
            NavLinkBase(url="/about", sort_order=0)


class TestNavLinkCreate:
    """Tests for NavLinkCreate model."""

    @pytest.mark.unit
    def test_valid_navlink_create(self):
        """Test creating a valid NavLinkCreate."""
        link = NavLinkCreate(
            label="Contact",
            url="/contact",
            sort_order=2,
        )
        assert link.label == "Contact"


class TestNavLinkUpdate:
    """Tests for NavLinkUpdate model."""

    @pytest.mark.unit
    def test_navlink_update_partial(self):
        """Test updating with partial data."""
        update = NavLinkUpdate(label="New Label")
        assert update.label == "New Label"
        assert update.url is None


class TestNavLinkResponse:
    """Tests for NavLinkResponse model."""

    @pytest.mark.unit
    def test_valid_navlink_response(self):
        """Test creating a valid NavLinkResponse."""
        now = datetime.now(timezone.utc)
        link = NavLinkResponse(
            id="507f1f77bcf86cd799439011",
            label="GitHub",
            url="https://github.com/user",
            sort_order=0,
            is_published=True,
            createdDate=now,
            updatedDate=now,
        )
        assert link.id == "507f1f77bcf86cd799439011"


class TestStorySectionId:
    """Test section_id field in Story models."""

    @pytest.mark.unit
    def test_story_base_without_section_id(self):
        """StoryBase should work without section_id (backwards compatible)."""
        story = StoryCreate(
            title="Test Story",
            content="Test content",
            is_published=True,
        )
        assert story.title == "Test Story"

    @pytest.mark.unit
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

    @pytest.mark.unit
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


class TestProjectSectionId:
    """Test section_id field in Project models."""

    @pytest.mark.unit
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

    @pytest.mark.unit
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

    @pytest.mark.unit
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


class TestPageSectionId:
    """Test section_id field in Page models."""

    @pytest.mark.unit
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

    @pytest.mark.unit
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
