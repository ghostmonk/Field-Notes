"""Tests for engagement models (reactions and comments)."""

import pytest
from pydantic import ValidationError


class TestReactionModels:
    """Tests for reaction Pydantic models."""

    def test_reaction_create_valid(self):
        """Test creating a valid reaction."""
        from models.reaction import ReactionCreate

        reaction = ReactionCreate(reaction_tag="thumbup")
        assert reaction.reaction_tag == "thumbup"

    def test_reaction_create_invalid_tag(self):
        """Test that invalid reaction tags are rejected."""
        from models.reaction import ReactionCreate

        with pytest.raises(ValidationError) as exc_info:
            ReactionCreate(reaction_tag="invalid_tag")
        assert "reaction_tag" in str(exc_info.value)


class TestCommentModels:
    """Tests for comment Pydantic models."""

    def test_comment_create_valid(self):
        """Test creating a valid comment."""
        from models.comment import CommentCreate

        comment = CommentCreate(
            content="This is a test comment",
            parent_id=None,
            mentions=[],
        )
        assert comment.content == "This is a test comment"
        assert comment.parent_id is None

    def test_comment_create_with_mentions(self):
        """Test creating a comment with mentions."""
        from models.comment import CommentCreate, Mention

        mention = Mention(user_id="user123", user_name="John Doe")
        comment = CommentCreate(
            content="Hey @John Doe check this out",
            parent_id=None,
            mentions=[mention],
        )
        assert len(comment.mentions) == 1
        assert comment.mentions[0].user_name == "John Doe"

    def test_comment_create_empty_content_rejected(self):
        """Test that empty content is rejected."""
        from models.comment import CommentCreate

        with pytest.raises(ValidationError):
            CommentCreate(content="", parent_id=None, mentions=[])
