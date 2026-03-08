"""Add text indexes for full-text search across content collections."""

name = "0007_add_text_indexes"
dependencies = ["0006_normalize_section_id_to_string"]


def upgrade(db):
    # Stories: search title and content
    db.stories.create_index(
        [("title", "text"), ("content", "text")],
        weights={"title": 10, "content": 1},
        name="stories_text_search",
    )
    # Projects: search title, summary, and content
    db.projects.create_index(
        [("title", "text"), ("summary", "text"), ("content", "text")],
        weights={"title": 10, "summary": 5, "content": 1},
        name="projects_text_search",
    )
    # Pages: search title and content
    db.pages.create_index(
        [("title", "text"), ("content", "text")],
        weights={"title": 10, "content": 1},
        name="pages_text_search",
    )


def downgrade(db):
    db.stories.drop_index("stories_text_search")
    db.projects.drop_index("projects_text_search")
    db.pages.drop_index("pages_text_search")
