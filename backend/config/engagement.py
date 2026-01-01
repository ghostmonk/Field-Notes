"""
TEMPORARY: Engagement configuration

TODO: Move to section configuration when dynamic section routing
is implemented. This file should be deleted and engagement settings
should be defined per-section in the section config system.
"""

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
