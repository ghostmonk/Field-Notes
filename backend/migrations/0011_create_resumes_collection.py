"""Create resumes collection with unique user_id index."""

name = "0011_create_resumes_collection"
dependencies = ["0010_add_icon_to_sections"]


def upgrade(db):
    if "resumes" not in db.list_collection_names():
        db.create_collection("resumes")

    # Check if user_id index already exists (may have been created by ensure_indexes at startup)
    existing_indexes = {idx["name"] for idx in db.resumes.list_indexes()}
    if "user_id_1" not in existing_indexes and "resumes_user_id_unique" not in existing_indexes:
        db.resumes.create_index("user_id", unique=True, name="resumes_user_id_unique")


def downgrade(db):
    existing_indexes = {idx["name"] for idx in db.resumes.list_indexes()}
    if "resumes_user_id_unique" in existing_indexes:
        db.resumes.drop_index("resumes_user_id_unique")
    elif "user_id_1" in existing_indexes:
        db.resumes.drop_index("user_id_1")
    db.drop_collection("resumes")
