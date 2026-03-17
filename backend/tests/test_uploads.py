import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from handlers.uploads import IMAGE_SIZES, process_image_file
from PIL import Image


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
