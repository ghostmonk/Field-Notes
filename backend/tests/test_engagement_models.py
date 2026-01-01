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
