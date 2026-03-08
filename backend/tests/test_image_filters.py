import pytest
from handlers.image_filters import AVAILABLE_FILTERS, apply_filter
from PIL import Image


@pytest.fixture
def sample_image():
    """Create a 100x100 RGB test image with known pixel values."""
    img = Image.new("RGB", (100, 100), (128, 128, 128))
    return img


class TestAvailableFilters:
    def test_contains_all_expected_names(self):
        expected = [
            "none",
            "auto_enhance",
            "warm",
            "cool",
            "high_contrast",
            "bw",
            "vivid",
            "vintage",
        ]
        for name in expected:
            assert name in AVAILABLE_FILTERS

    def test_no_unexpected_filters(self):
        expected = {
            "none",
            "auto_enhance",
            "warm",
            "cool",
            "high_contrast",
            "bw",
            "vivid",
            "vintage",
        }
        assert set(AVAILABLE_FILTERS) == expected


class TestNoneFilter:
    def test_returns_unchanged_copy(self, sample_image):
        result = apply_filter(sample_image, "none")
        assert list(result.getdata()) == list(sample_image.getdata())

    def test_returns_different_object(self, sample_image):
        result = apply_filter(sample_image, "none")
        assert result is not sample_image


class TestAutoEnhanceFilter:
    def test_changes_pixel_values(self):
        # Use non-uniform image; contrast/sharpness are no-ops on uniform fills
        img = Image.new("RGB", (100, 100), (200, 100, 50))
        result = apply_filter(img, "auto_enhance")
        assert list(result.getdata()) != list(img.getdata())

    def test_preserves_size(self, sample_image):
        result = apply_filter(sample_image, "auto_enhance")
        assert result.size == sample_image.size

    def test_returns_rgb(self, sample_image):
        result = apply_filter(sample_image, "auto_enhance")
        assert result.mode == "RGB"


class TestWarmFilter:
    def test_changes_pixel_values(self, sample_image):
        result = apply_filter(sample_image, "warm")
        assert list(result.getdata()) != list(sample_image.getdata())

    def test_boosts_red_channel(self, sample_image):
        result = apply_filter(sample_image, "warm")
        orig_r = sample_image.split()[0]
        result_r = result.split()[0]
        orig_r_avg = sum(orig_r.getdata()) / len(list(orig_r.getdata()))
        result_r_avg = sum(result_r.getdata()) / len(list(result_r.getdata()))
        assert result_r_avg > orig_r_avg

    def test_preserves_size(self, sample_image):
        result = apply_filter(sample_image, "warm")
        assert result.size == sample_image.size

    def test_returns_rgb(self, sample_image):
        result = apply_filter(sample_image, "warm")
        assert result.mode == "RGB"


class TestCoolFilter:
    def test_changes_pixel_values(self, sample_image):
        result = apply_filter(sample_image, "cool")
        assert list(result.getdata()) != list(sample_image.getdata())

    def test_boosts_blue_channel(self, sample_image):
        result = apply_filter(sample_image, "cool")
        orig_b = sample_image.split()[2]
        result_b = result.split()[2]
        orig_b_avg = sum(orig_b.getdata()) / len(list(orig_b.getdata()))
        result_b_avg = sum(result_b.getdata()) / len(list(result_b.getdata()))
        assert result_b_avg > orig_b_avg

    def test_preserves_size(self, sample_image):
        result = apply_filter(sample_image, "cool")
        assert result.size == sample_image.size

    def test_returns_rgb(self, sample_image):
        result = apply_filter(sample_image, "cool")
        assert result.mode == "RGB"


class TestHighContrastFilter:
    def test_changes_pixel_values(self):
        # Use non-uniform image; contrast is a no-op on uniform fills
        img = Image.new("RGB", (100, 100), (200, 100, 50))
        result = apply_filter(img, "high_contrast")
        assert list(result.getdata()) != list(img.getdata())

    def test_preserves_size(self, sample_image):
        result = apply_filter(sample_image, "high_contrast")
        assert result.size == sample_image.size

    def test_returns_rgb(self, sample_image):
        result = apply_filter(sample_image, "high_contrast")
        assert result.mode == "RGB"


class TestBwFilter:
    def test_changes_pixel_values(self):
        # Use a non-gray image so BW actually changes values
        img = Image.new("RGB", (100, 100), (200, 100, 50))
        result = apply_filter(img, "bw")
        assert list(result.getdata()) != list(img.getdata())

    def test_produces_equal_rgb_channels(self):
        img = Image.new("RGB", (100, 100), (200, 100, 50))
        result = apply_filter(img, "bw")
        r, g, b = result.split()
        assert list(r.getdata()) == list(g.getdata())
        assert list(g.getdata()) == list(b.getdata())

    def test_preserves_size(self, sample_image):
        result = apply_filter(sample_image, "bw")
        assert result.size == sample_image.size

    def test_returns_rgb(self, sample_image):
        result = apply_filter(sample_image, "bw")
        assert result.mode == "RGB"


class TestVividFilter:
    def test_changes_pixel_values(self, sample_image):
        result = apply_filter(sample_image, "vivid")
        assert list(result.getdata()) != list(sample_image.getdata())

    def test_preserves_size(self, sample_image):
        result = apply_filter(sample_image, "vivid")
        assert result.size == sample_image.size

    def test_returns_rgb(self, sample_image):
        result = apply_filter(sample_image, "vivid")
        assert result.mode == "RGB"


class TestVintageFilter:
    def test_changes_pixel_values(self, sample_image):
        result = apply_filter(sample_image, "vintage")
        assert list(result.getdata()) != list(sample_image.getdata())

    def test_preserves_size(self, sample_image):
        result = apply_filter(sample_image, "vintage")
        assert result.size == sample_image.size

    def test_returns_rgb(self, sample_image):
        result = apply_filter(sample_image, "vintage")
        assert result.mode == "RGB"


class TestInvalidFilter:
    def test_returns_unchanged_copy(self, sample_image):
        result = apply_filter(sample_image, "nonexistent_filter")
        assert list(result.getdata()) == list(sample_image.getdata())

    def test_returns_different_object(self, sample_image):
        result = apply_filter(sample_image, "nonexistent_filter")
        assert result is not sample_image


class TestAllFiltersPreserveSize:
    @pytest.mark.parametrize("filter_name", AVAILABLE_FILTERS)
    def test_preserves_size(self, sample_image, filter_name):
        result = apply_filter(sample_image, filter_name)
        assert result.size == sample_image.size

    @pytest.mark.parametrize("filter_name", AVAILABLE_FILTERS)
    def test_returns_rgb(self, sample_image, filter_name):
        result = apply_filter(sample_image, filter_name)
        assert result.mode == "RGB"
