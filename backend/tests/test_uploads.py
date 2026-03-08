import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from handlers.image_filters import AVAILABLE_FILTERS
from handlers.uploads import IMAGE_SIZES, process_image_file
from httpx import ASGITransport, AsyncClient
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


class TestFilterPreviewEndpoint:
    @pytest.mark.asyncio
    async def test_returns_all_filter_names(self, mock_auth, auth_headers):
        """Preview endpoint returns a preview URL for each non-none filter."""
        from tests.conftest import test_app

        contents = _make_test_image(width=400, height=300)

        with (
            patch("handlers.uploads.upload_file", new_callable=AsyncMock) as mock_upload,
            patch("handlers.uploads._cleanup_old_previews"),
            patch("handlers.uploads.LOCAL_STORAGE_PATH", "/tmp/test-uploads"),
        ):
            mock_upload.return_value = ("uploads/preview.webp", "/uploads/preview.webp")

            async with AsyncClient(
                transport=ASGITransport(app=test_app), base_url="http://test"
            ) as ac:
                response = await ac.post(
                    "/uploads/filter-previews",
                    files={"file": ("test.jpg", io.BytesIO(contents), "image/jpeg")},
                    headers=auth_headers,
                )

        assert response.status_code == 200
        data = response.json()
        expected_filters = [f for f in AVAILABLE_FILTERS if f != "none"]
        assert "previews" in data
        for filter_name in expected_filters:
            assert filter_name in data["previews"]

    @pytest.mark.asyncio
    async def test_requires_auth(self):
        """Preview endpoint requires authentication."""
        from tests.conftest import test_app

        contents = _make_test_image(width=400, height=300)

        async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as ac:
            response = await ac.post(
                "/uploads/filter-previews",
                files={"file": ("test.jpg", io.BytesIO(contents), "image/jpeg")},
            )

        assert response.status_code == 401
