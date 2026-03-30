from typing import Literal

ItemType = Literal["section", "content"]

CONTENT_COLLECTIONS: list[tuple[str, str]] = [
    ("stories", "story"),
    ("projects", "project"),
    ("photo_essays", "photo_essay"),
    ("pages", "page"),
]

CONTENT_TYPE_TO_COLLECTION: dict[str, str] = {ct: col for col, ct in CONTENT_COLLECTIONS}
