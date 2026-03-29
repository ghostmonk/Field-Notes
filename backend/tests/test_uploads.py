import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from handlers.uploads import IMAGE_SIZES, build_asset_path, process_image_file
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
