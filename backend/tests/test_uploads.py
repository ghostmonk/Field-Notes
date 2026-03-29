import io
import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from handlers.uploads import (
    IMAGE_SIZES,
    SIZE_TO_VARIANT,
    build_asset_path,
    process_image_file,
    process_video_file,
)
from PIL import Image


class TestAssetPaths:
    """Tests for type-based asset path generation."""

    def test_image_original_path(self):
        path = build_asset_path("20260329_143022_a7f3b2", "image", "originals")
        assert path == "images/originals/20260329_143022_a7f3b2.webp"

    def test_image_thumbnail_path(self):
        path = build_asset_path("20260329_143022_a7f3b2", "image", "thumbnails")
        assert path == "images/thumbnails/20260329_143022_a7f3b2.webp"

    def test_image_medium_path(self):
        path = build_asset_path("20260329_143022_a7f3b2", "image", "medium")
        assert path == "images/medium/20260329_143022_a7f3b2.webp"

    def test_image_large_path(self):
        path = build_asset_path("20260329_143022_a7f3b2", "image", "large")
        assert path == "images/large/20260329_143022_a7f3b2.webp"

    def test_video_original_path(self):
        path = build_asset_path("20260329_143022_a7f3b2", "video", "originals", ext=".mov")
        assert path == "video/originals/20260329_143022_a7f3b2.mov"

    def test_video_processed_path(self):
        path = build_asset_path("20260329_143022_a7f3b2", "video", "processed")
        assert path == "video/processed/20260329_143022_a7f3b2.mp4"

    def test_video_thumbnail_path(self):
        path = build_asset_path("20260329_143022_a7f3b2", "video", "thumbnails")
        assert path == "video/thumbnails/20260329_143022_a7f3b2.jpg"

    def test_invalid_media_type_raises(self):
        with pytest.raises(ValueError, match="Unknown media type"):
            build_asset_path("id", "audio", "originals")

    def test_invalid_variant_raises(self):
        with pytest.raises(ValueError, match="Unknown variant"):
            build_asset_path("id", "image", "huge")

    def test_video_original_without_ext_raises(self):
        with pytest.raises(ValueError, match="requires an explicit ext"):
            build_asset_path("id", "video", "originals")

    def test_invalid_video_variant_raises(self):
        with pytest.raises(ValueError, match="Unknown variant"):
            build_asset_path("id", "video", "huge")


class TestImageSizes:
    def test_image_sizes(self):
        assert IMAGE_SIZES == [2048, 1536, 768, 400]


def _make_test_image(width=3000, height=2000, color="red"):
    """Create a test image and return it as bytes."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def _make_upload_file(filename="test.png", content_type="image/png"):
    """Create a mock UploadFile."""
    mock_file = MagicMock()
    mock_file.filename = filename
    mock_file.content_type = content_type
    return mock_file


class TestProcessImageFileVariantPaths:
    """Verify process_image_file uses type-based asset paths (images/{variant}/{asset_id}.webp)."""

    @pytest.mark.asyncio
    async def test_upload_paths_use_variant_directories(self):
        """Each upload call should use build_asset_path format: images/{variant}/{asset_id}.webp"""
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("blob", "/url")

            await process_image_file(mock_file, contents, len(contents), None)

        assert mock_upload.call_count == len(IMAGE_SIZES)

        uploaded_filenames = [call[0][1] for call in mock_upload.call_args_list]
        for filename in uploaded_filenames:
            assert re.match(
                r"^images/(originals|large|medium|thumbnails)/\d{8}_\d{6}_[a-f0-9]{8}\.webp$",
                filename,
            ), f"Unexpected upload path: {filename}"

    @pytest.mark.asyncio
    async def test_primary_url_is_originals_variant(self):
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("blob", "/url")

            result = await process_image_file(mock_file, contents, len(contents), None)

        assert "/uploads/images/originals/" in result.primary_url
        assert result.primary_url.endswith(".webp")

    @pytest.mark.asyncio
    async def test_srcset_contains_all_variants(self):
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("blob", "/url")

            result = await process_image_file(mock_file, contents, len(contents), None)

        for size, variant in SIZE_TO_VARIANT.items():
            assert f"images/{variant}/" in result.srcset, f"Missing variant {variant} in srcset"
            assert f"{size}w" in result.srcset, f"Missing size {size}w in srcset"

    @pytest.mark.asyncio
    async def test_section_id_does_not_affect_paths(self):
        """section_id parameter should be ignored for path generation."""
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("blob", "/url")

            result = await process_image_file(
                mock_file, contents, len(contents), None, section_id="abc123def456abc123def456"
            )

        # No section_id or "photos" in any path
        assert "photos" not in result.primary_url
        assert "photos" not in result.srcset
        uploaded_filenames = [call[0][1] for call in mock_upload.call_args_list]
        for filename in uploaded_filenames:
            assert "photos" not in filename
            assert filename.startswith("images/")

    @pytest.mark.asyncio
    async def test_all_variants_share_same_asset_id(self):
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("blob", "/url")

            await process_image_file(mock_file, contents, len(contents), None)

        uploaded_filenames = [call[0][1] for call in mock_upload.call_args_list]
        # Extract asset_id from each path (images/{variant}/{asset_id}.webp)
        asset_ids = set()
        for filename in uploaded_filenames:
            parts = filename.split("/")
            asset_id = parts[-1].replace(".webp", "")
            asset_ids.add(asset_id)

        assert len(asset_ids) == 1, f"Expected one asset_id across all variants, got: {asset_ids}"


class TestProcessImageFileWithFilter:
    @pytest.mark.asyncio
    async def test_no_filter(self):
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("uploads/test.webp", "/uploads/test.webp")

            result = await process_image_file(
                mock_file, contents, len(contents), None, image_filter="none"
            )

        assert result.primary_url is not None
        assert result.srcset != ""
        assert mock_upload.call_count == len(IMAGE_SIZES)

    @pytest.mark.asyncio
    async def test_bw_filter(self):
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("uploads/test.webp", "/uploads/test.webp")

            result = await process_image_file(
                mock_file, contents, len(contents), None, image_filter="bw"
            )

        assert result.primary_url is not None
        assert result.srcset != ""
        assert mock_upload.call_count == len(IMAGE_SIZES)

        # Verify the uploaded bytes are grayscale (bw filter converts to grayscale)
        # Check the first call's image data
        first_call_bytes = mock_upload.call_args_list[0][0][0]
        uploaded_img = Image.open(io.BytesIO(first_call_bytes))
        # Sample a pixel — R, G, B should be equal for grayscale
        r, g, b = uploaded_img.getpixel((0, 0))[:3]
        assert r == g == b, "bw filter should produce grayscale output"

    @pytest.mark.asyncio
    async def test_default_filter_param(self):
        """When image_filter is not passed, it defaults to 'none'."""
        contents = _make_test_image()
        mock_file = _make_upload_file()

        with patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = ("uploads/test.webp", "/uploads/test.webp")

            # Call without image_filter argument — should default to "none"
            result = await process_image_file(mock_file, contents, len(contents), None)

        assert result.primary_url is not None
        assert mock_upload.call_count == len(IMAGE_SIZES)


def _make_video_upload_file(filename="test_video.mp4", content_type="video/mp4"):
    """Create a mock UploadFile for video."""
    mock_file = MagicMock()
    mock_file.filename = filename
    mock_file.content_type = content_type
    return mock_file


class TestProcessVideoFilePaths:
    """Verify process_video_file uploads to flat video/ directory (matching Cloud Function expectations)."""

    @pytest.mark.asyncio
    async def test_upload_path_uses_flat_video_directory(self):
        """Video original should upload to video/{filename} (not video/originals/)."""
        video_bytes = b"\x00" * 1024
        mock_file = _make_video_upload_file()

        with (
            patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload,
            patch("handlers.uploads.get_database", new_callable=AsyncMock) as mock_db,
        ):
            mock_upload.return_value = ("blob", "/url")
            mock_db.return_value.video_processing_jobs = AsyncMock()

            await process_video_file(mock_file, video_bytes, len(video_bytes), None)

        assert mock_upload.call_count == 1
        uploaded_path = mock_upload.call_args[0][1]
        assert re.match(
            r"^video/\d{8}_\d{6}_[a-f0-9]{8}\.mp4$",
            uploaded_path,
        ), f"Unexpected upload path: {uploaded_path}"

    @pytest.mark.asyncio
    async def test_primary_url_uses_flat_video_directory(self):
        """Returned primary_url should reference /uploads/video/{filename}."""
        video_bytes = b"\x00" * 1024
        mock_file = _make_video_upload_file()

        with (
            patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload,
            patch("handlers.uploads.get_database", new_callable=AsyncMock) as mock_db,
        ):
            mock_upload.return_value = ("blob", "/url")
            mock_db.return_value.video_processing_jobs = AsyncMock()

            result = await process_video_file(mock_file, video_bytes, len(video_bytes), None)

        assert "/uploads/video/" in result.primary_url
        assert "/originals/" not in result.primary_url
        assert result.primary_url.endswith(".mp4")

    @pytest.mark.asyncio
    async def test_preserves_original_extension(self):
        """Video upload should preserve the original file extension (.mov, .webm, etc.)."""
        video_bytes = b"\x00" * 1024
        mock_file = _make_video_upload_file(filename="clip.mov", content_type="video/quicktime")

        with (
            patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload,
            patch("handlers.uploads.get_database", new_callable=AsyncMock) as mock_db,
        ):
            mock_upload.return_value = ("blob", "/url")
            mock_db.return_value.video_processing_jobs = AsyncMock()

            await process_video_file(mock_file, video_bytes, len(video_bytes), None)

        uploaded_path = mock_upload.call_args[0][1]
        assert uploaded_path.endswith(".mov"), f"Expected .mov extension, got: {uploaded_path}"

    @pytest.mark.asyncio
    async def test_job_original_file_matches_upload_path(self):
        """Video processing job original_file should match the upload path."""
        video_bytes = b"\x00" * 1024
        mock_file = _make_video_upload_file()

        with (
            patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload,
            patch("handlers.uploads.get_database", new_callable=AsyncMock) as mock_db,
        ):
            mock_upload.return_value = ("blob", "/url")
            mock_db.return_value.video_processing_jobs = AsyncMock()

            await process_video_file(mock_file, video_bytes, len(video_bytes), None)

        mock_collection = mock_db.return_value.video_processing_jobs
        insert_call = mock_collection.insert_one.call_args[0][0]
        assert re.match(
            r"^uploads/video/\d{8}_\d{6}_[a-f0-9]{8}\.mp4$",
            insert_call["original_file"],
        ), f"Unexpected original_file in job: {insert_call['original_file']}"
