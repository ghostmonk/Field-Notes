"""
Unit tests for Redirect models
"""

from datetime import datetime, timezone

import pytest
from models.redirect import RedirectCreate, RedirectResponse


class TestRedirectCreate:
    @pytest.mark.unit
    def test_valid_redirect_create(self):
        redirect = RedirectCreate(old_path="blog/old-post", new_path="blog/new-post")
        assert redirect.old_path == "blog/old-post"
        assert redirect.new_path == "blog/new-post"
        assert redirect.content_id is None
        assert redirect.content_type is None
        assert redirect.expires_at is None

    @pytest.mark.unit
    def test_redirect_create_with_content_fields(self):
        redirect = RedirectCreate(
            old_path="projects/old-slug",
            new_path="projects/new-slug",
            content_id="abc123",
            content_type="project",
        )
        assert redirect.content_id == "abc123"
        assert redirect.content_type == "project"

    @pytest.mark.unit
    def test_redirect_create_strips_leading_slashes(self):
        redirect = RedirectCreate(old_path="/blog/old-post", new_path="/blog/new-post")
        assert redirect.old_path == "blog/old-post"
        assert redirect.new_path == "blog/new-post"

    @pytest.mark.unit
    def test_redirect_create_strips_multiple_leading_slashes(self):
        redirect = RedirectCreate(old_path="///blog/old", new_path="//blog/new")
        assert redirect.old_path == "blog/old"
        assert redirect.new_path == "blog/new"

    @pytest.mark.unit
    def test_redirect_create_with_expires_at(self):
        expires = datetime(2026, 12, 31, tzinfo=timezone.utc)
        redirect = RedirectCreate(old_path="blog/old", new_path="blog/new", expires_at=expires)
        assert redirect.expires_at == expires


class TestRedirectResponse:
    @pytest.mark.unit
    def test_redirect_response_all_fields(self):
        now = datetime.now(timezone.utc)
        expires = datetime(2026, 12, 31, tzinfo=timezone.utc)
        response = RedirectResponse(
            id="redirect123",
            old_path="blog/old-post",
            new_path="blog/new-post",
            content_id="story456",
            content_type="story",
            created_at=now,
            expires_at=expires,
        )
        assert response.id == "redirect123"
        assert response.old_path == "blog/old-post"
        assert response.new_path == "blog/new-post"
        assert response.content_id == "story456"
        assert response.content_type == "story"
        assert response.created_at == now
        assert response.expires_at == expires

    @pytest.mark.unit
    def test_redirect_response_minimal_fields(self):
        now = datetime.now(timezone.utc)
        response = RedirectResponse(
            id="redirect123",
            old_path="blog/old",
            new_path="blog/new",
            created_at=now,
        )
        assert response.content_id is None
        assert response.content_type is None
        assert response.expires_at is None
