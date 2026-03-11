"""Tests for photo essay Pydantic models."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError


class TestPhotoItem:
    """Tests for PhotoItem model."""

    def test_valid_creation(self):
        from models.photo_essay import PhotoItem

        item = PhotoItem(url="https://example.com/photo.jpg", width=1920, height=1080, sort_order=0)
        assert item.url == "https://example.com/photo.jpg"
        assert item.width == 1920
        assert item.height == 1080
        assert item.sort_order == 0
        assert item.caption is None
        assert item.srcset is None

    def test_with_caption_and_srcset(self):
        from models.photo_essay import PhotoItem

        item = PhotoItem(
            url="https://example.com/photo.jpg",
            srcset="photo-400.jpg 400w, photo-800.jpg 800w",
            caption="A beautiful sunset",
            width=1920,
            height=1080,
            sort_order=1,
        )
        assert item.srcset == "photo-400.jpg 400w, photo-800.jpg 800w"
        assert item.caption == "A beautiful sunset"

    def test_requires_dimensions(self):
        from models.photo_essay import PhotoItem

        with pytest.raises(ValidationError):
            PhotoItem(url="https://example.com/photo.jpg", sort_order=0)

    def test_rejects_zero_width(self):
        from models.photo_essay import PhotoItem

        with pytest.raises(ValidationError):
            PhotoItem(url="https://example.com/photo.jpg", width=0, height=1080, sort_order=0)

    def test_rejects_zero_height(self):
        from models.photo_essay import PhotoItem

        with pytest.raises(ValidationError):
            PhotoItem(url="https://example.com/photo.jpg", width=1920, height=0, sort_order=0)

    def test_rejects_negative_sort_order(self):
        from models.photo_essay import PhotoItem

        with pytest.raises(ValidationError):
            PhotoItem(url="https://example.com/photo.jpg", width=1920, height=1080, sort_order=-1)

    def test_rejects_empty_url(self):
        from models.photo_essay import PhotoItem

        with pytest.raises(ValidationError):
            PhotoItem(url="", width=1920, height=1080, sort_order=0)


class TestPhotoEssayCreate:
    """Tests for PhotoEssayCreate model."""

    def test_valid_creation(self):
        from models.photo_essay import PhotoEssayCreate

        essay = PhotoEssayCreate(
            title="My Photo Essay",
            cover_image_url="https://example.com/cover.jpg",
        )
        assert essay.title == "My Photo Essay"
        assert essay.cover_image_url == "https://example.com/cover.jpg"
        assert essay.is_published is False
        assert essay.photos == []
        assert essay.description is None
        assert essay.section_id is None

    def test_defaults_is_published_false(self):
        from models.photo_essay import PhotoEssayCreate

        essay = PhotoEssayCreate(
            title="Test",
            cover_image_url="https://example.com/cover.jpg",
        )
        assert essay.is_published is False

    def test_requires_title(self):
        from models.photo_essay import PhotoEssayCreate

        with pytest.raises(ValidationError):
            PhotoEssayCreate(cover_image_url="https://example.com/cover.jpg")

    def test_rejects_empty_title(self):
        from models.photo_essay import PhotoEssayCreate

        with pytest.raises(ValidationError):
            PhotoEssayCreate(title="", cover_image_url="https://example.com/cover.jpg")

    def test_requires_cover_image_url(self):
        from models.photo_essay import PhotoEssayCreate

        with pytest.raises(ValidationError):
            PhotoEssayCreate(title="My Essay")

    def test_rejects_empty_cover_image_url(self):
        from models.photo_essay import PhotoEssayCreate

        with pytest.raises(ValidationError):
            PhotoEssayCreate(title="My Essay", cover_image_url="")

    def test_with_photos(self):
        from models.photo_essay import PhotoEssayCreate, PhotoItem

        photos = [
            PhotoItem(url="https://example.com/1.jpg", width=800, height=600, sort_order=0),
            PhotoItem(url="https://example.com/2.jpg", width=1200, height=900, sort_order=1),
        ]
        essay = PhotoEssayCreate(
            title="With Photos",
            cover_image_url="https://example.com/cover.jpg",
            photos=photos,
        )
        assert len(essay.photos) == 2


class TestPhotoEssayUpdate:
    """Tests for PhotoEssayUpdate model."""

    def test_all_fields_optional(self):
        from models.photo_essay import PhotoEssayUpdate

        update = PhotoEssayUpdate()
        assert update.title is None
        assert update.description is None
        assert update.cover_image_url is None
        assert update.photos is None
        assert update.section_id is None
        assert update.is_published is None

    def test_partial_update(self):
        from models.photo_essay import PhotoEssayUpdate

        update = PhotoEssayUpdate(title="New Title", is_published=True)
        assert update.title == "New Title"
        assert update.is_published is True
        assert update.description is None


class TestPhotoEssayResponse:
    """Tests for PhotoEssayResponse model."""

    def test_full_construction(self):
        from models.photo_essay import PhotoEssayResponse, PhotoItem

        now = datetime.now(timezone.utc)
        photos = [
            PhotoItem(url="https://example.com/1.jpg", width=800, height=600, sort_order=0),
        ]
        response = PhotoEssayResponse(
            id="abc123",
            title="My Essay",
            description="A description",
            cover_image_url="https://example.com/cover.jpg",
            photos=photos,
            is_published=True,
            section_id="section1",
            user_id="user1",
            createdDate=now,
            updatedDate=now,
        )
        assert response.id == "abc123"
        assert response.title == "My Essay"
        assert len(response.photos) == 1
        assert response.createdDate.tzinfo is not None

    def test_ensure_utc_naive_datetime(self):
        from models.photo_essay import PhotoEssayResponse

        naive = datetime(2024, 1, 1, 12, 0, 0)
        response = PhotoEssayResponse(
            id="abc",
            title="Test",
            cover_image_url="https://example.com/cover.jpg",
            photos=[],
            is_published=False,
            createdDate=naive,
            updatedDate=naive,
        )
        assert response.createdDate.tzinfo == timezone.utc
        assert response.updatedDate.tzinfo == timezone.utc


class TestPhotoEssayCard:
    """Tests for PhotoEssayCard model."""

    def test_card_construction(self):
        from models.photo_essay import PhotoEssayCard

        now = datetime.now(timezone.utc)
        card = PhotoEssayCard(
            id="abc123",
            title="My Essay",
            description="Short desc",
            cover_image_url="https://example.com/cover.jpg",
            is_published=True,
            photo_count=5,
            section_id="section1",
            createdDate=now,
            updatedDate=now,
        )
        assert card.id == "abc123"
        assert card.photo_count == 5

    def test_card_defaults(self):
        from models.photo_essay import PhotoEssayCard

        now = datetime.now(timezone.utc)
        card = PhotoEssayCard(
            id="abc",
            title="Test",
            cover_image_url="https://example.com/cover.jpg",
            is_published=False,
            createdDate=now,
            updatedDate=now,
        )
        assert card.photo_count == 0
        assert card.description is None
        assert card.section_id is None
