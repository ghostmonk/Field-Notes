"""Tests for asset listing endpoint."""

import os
import tempfile

import pytest

from handlers.asset_listing import (
    ASSET_ID_PATTERN,
    extract_asset_id,
    extract_asset_ids_from_html,
    extract_asset_ids_from_url,
    parse_created_date,
    _group_files_into_assets,
    _list_local_files,
    _paginate,
)


class TestExtractAssetId:
    def test_standard_image_filename(self):
        assert extract_asset_id("20260329_143022_a7f3b2c1.webp") == "20260329_143022_a7f3b2c1"

    def test_path_with_directories(self):
        assert extract_asset_id("images/originals/20260329_143022_a7f3b2c1.webp") == "20260329_143022_a7f3b2c1"

    def test_no_match(self):
        assert extract_asset_id("random_file.jpg") is None

    def test_video_filename(self):
        assert extract_asset_id("20260101_120000_deadbeef.mp4") == "20260101_120000_deadbeef"


class TestParseCreatedDate:
    def test_valid_asset_id(self):
        result = parse_created_date("20260329_143022_a7f3b2c1")
        assert result == "2026-03-29T14:30:22+00:00"

    def test_invalid_asset_id(self):
        assert parse_created_date("not_a_date_12345678") is None


class TestGroupFilesIntoAssets:
    def test_groups_image_variants(self):
        files = [
            {"path": "images/originals/20260329_143022_a7f3b2c1.webp", "size_bytes": 245000},
            {"path": "images/large/20260329_143022_a7f3b2c1.webp", "size_bytes": 180000},
            {"path": "images/medium/20260329_143022_a7f3b2c1.webp", "size_bytes": 95000},
            {"path": "images/thumbnails/20260329_143022_a7f3b2c1.webp", "size_bytes": 32000},
        ]
        assets = _group_files_into_assets(files)
        assert len(assets) == 1
        assert assets[0]["asset_id"] == "20260329_143022_a7f3b2c1"
        assert assets[0]["type"] == "image"
        assert len(assets[0]["variants"]) == 4
        assert assets[0]["total_size_bytes"] == 552000

    def test_groups_video_variants(self):
        files = [
            {"path": "video/originals/20260329_143022_a7f3b2c1.mov", "size_bytes": 5000000},
            {"path": "video/processed/20260329_143022_a7f3b2c1.mp4", "size_bytes": 2000000},
            {"path": "video/thumbnails/20260329_143022_a7f3b2c1.jpg", "size_bytes": 50000},
        ]
        assets = _group_files_into_assets(files)
        assert len(assets) == 1
        assert assets[0]["type"] == "video"
        assert len(assets[0]["variants"]) == 3

    def test_multiple_assets_sorted_by_date(self):
        files = [
            {"path": "images/originals/20260101_120000_aaaaaaaa.webp", "size_bytes": 100},
            {"path": "images/originals/20260329_143022_bbbbbbbb.webp", "size_bytes": 200},
        ]
        assets = _group_files_into_assets(files)
        assert len(assets) == 2
        # Newest first
        assert assets[0]["asset_id"] == "20260329_143022_bbbbbbbb"
        assert assets[1]["asset_id"] == "20260101_120000_aaaaaaaa"

    def test_skips_unrecognized_files(self):
        files = [
            {"path": "other/random_file.txt", "size_bytes": 100},
            {"path": "images/originals/20260329_143022_a7f3b2c1.webp", "size_bytes": 200},
        ]
        assets = _group_files_into_assets(files)
        assert len(assets) == 1


class TestPaginate:
    def test_first_page(self):
        items = list(range(10))
        page, cursor = _paginate(items, 3, None)
        assert page == [0, 1, 2]
        assert cursor == "3"

    def test_middle_page(self):
        items = list(range(10))
        page, cursor = _paginate(items, 3, "3")
        assert page == [3, 4, 5]
        assert cursor == "6"

    def test_last_page(self):
        items = list(range(10))
        page, cursor = _paginate(items, 3, "9")
        assert page == [9]
        assert cursor is None

    def test_empty(self):
        page, cursor = _paginate([], 10, None)
        assert page == []
        assert cursor is None


class TestListLocalFiles:
    def test_lists_files_in_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            uploads_dir = os.path.join(tmpdir, "uploads", "images", "originals")
            os.makedirs(uploads_dir)
            test_file = os.path.join(uploads_dir, "20260329_143022_a7f3b2c1.webp")
            with open(test_file, "wb") as f:
                f.write(b"x" * 100)

            files = _list_local_files(tmpdir, "images")
            assert len(files) == 1
            assert files[0]["path"] == "images/originals/20260329_143022_a7f3b2c1.webp"
            assert files[0]["size_bytes"] == 100

    def test_empty_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, "uploads"))
            files = _list_local_files(tmpdir, "nonexistent")
            assert files == []

    def test_lists_all_when_no_prefix(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            for subdir in ["images/originals", "video/originals"]:
                d = os.path.join(tmpdir, "uploads", subdir)
                os.makedirs(d)
                with open(os.path.join(d, "20260329_143022_a7f3b2c1.webp"), "wb") as f:
                    f.write(b"x" * 50)

            files = _list_local_files(tmpdir, "")
            assert len(files) == 2


class TestExtractAssetIdsFromHtml:
    def test_extracts_image_ids(self):
        html = '<img src="/uploads/images/originals/20260329_143022_a7f3b2c1.webp">'
        ids = extract_asset_ids_from_html(html)
        assert ids == {"20260329_143022_a7f3b2c1"}

    def test_extracts_video_ids(self):
        html = '<video src="/uploads/video/processed/20260329_143022_a7f3b2c1.mp4">'
        ids = extract_asset_ids_from_html(html)
        assert ids == {"20260329_143022_a7f3b2c1"}

    def test_multiple_assets(self):
        html = """
        <img src="/uploads/images/originals/20260329_143022_a7f3b2c1.webp">
        <img src="/uploads/images/medium/20260101_120000_deadbeef.webp">
        """
        ids = extract_asset_ids_from_html(html)
        assert ids == {"20260329_143022_a7f3b2c1", "20260101_120000_deadbeef"}

    def test_no_assets(self):
        html = "<p>Hello world</p>"
        ids = extract_asset_ids_from_html(html)
        assert ids == set()


class TestExtractAssetIdFromUrl:
    def test_image_url(self):
        url = "/uploads/images/originals/20260329_143022_a7f3b2c1.webp"
        assert extract_asset_ids_from_url(url) == "20260329_143022_a7f3b2c1"

    def test_non_asset_url(self):
        assert extract_asset_ids_from_url("https://example.com/photo.jpg") is None
