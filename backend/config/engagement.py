"""Engagement configuration constants."""

ENGAGEMENT_ENABLED_TYPES: dict[str, dict[str, bool]] = {
    "story": {"reactions": True, "comments": True},
    "project": {"reactions": True, "comments": False},
}

ALLOWED_REACTION_TAGS: list[str] = [
    "thumbup",
    "heart",
    "surprise",
    "celebrate",
    "insightful",
]

REALTIME_STRATEGY: str = "websocket"  # or "polling" or "none"
POLLING_INTERVAL_SECONDS: int = 10

# Query limits
MAX_REACTIONS_PER_QUERY: int = 1000
MAX_COMMENTS_PER_QUERY: int = 1000

# Rate limits
REACTION_RATE_LIMIT: str = "10/minute"
COMMENT_CREATE_RATE_LIMIT: str = "3/minute"
COMMENT_DELETE_RATE_LIMIT: str = "10/minute"
