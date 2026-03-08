from PIL import Image, ImageEnhance, ImageOps


def _adjust_channel(image, channel_index, offset):
    """Adjust a single RGB channel by a fixed offset, clamping to 0-255."""
    channels = list(image.split())
    channels[channel_index] = channels[channel_index].point(lambda v: max(0, min(255, v + offset)))
    return Image.merge("RGB", channels)


def _filter_none(image):
    return image.copy()


def _filter_auto_enhance(image):
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Sharpness(image).enhance(1.2)
    image = ImageEnhance.Color(image).enhance(1.1)
    return image


def _filter_warm(image):
    image = ImageEnhance.Color(image).enhance(1.15)
    image = _adjust_channel(image, 0, 10)
    image = _adjust_channel(image, 1, 5)
    image = _adjust_channel(image, 2, -10)
    return image


def _filter_cool(image):
    image = _adjust_channel(image, 0, -10)
    image = _adjust_channel(image, 2, 15)
    image = ImageEnhance.Contrast(image).enhance(1.1)
    return image


def _filter_high_contrast(image):
    image = ImageEnhance.Contrast(image).enhance(1.4)
    image = ImageEnhance.Sharpness(image).enhance(1.15)
    return image


def _filter_bw(image):
    image = ImageOps.grayscale(image)
    image = image.convert("RGB")
    image = ImageEnhance.Contrast(image).enhance(1.2)
    return image


def _filter_vivid(image):
    image = ImageEnhance.Color(image).enhance(1.5)
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Brightness(image).enhance(1.05)
    return image


def _filter_vintage(image):
    image = ImageEnhance.Color(image).enhance(0.7)
    image = ImageEnhance.Contrast(image).enhance(0.95)
    image = _adjust_channel(image, 0, 15)
    image = _adjust_channel(image, 1, 5)
    image = _adjust_channel(image, 2, -20)
    return image


_FILTER_MAP = {
    "none": _filter_none,
    "auto_enhance": _filter_auto_enhance,
    "warm": _filter_warm,
    "cool": _filter_cool,
    "high_contrast": _filter_high_contrast,
    "bw": _filter_bw,
    "vivid": _filter_vivid,
    "vintage": _filter_vintage,
}

AVAILABLE_FILTERS = list(_FILTER_MAP.keys())


def validate_filter_name(filter_name):
    """Raise ValueError if filter_name is not in AVAILABLE_FILTERS."""
    if filter_name not in _FILTER_MAP:
        raise ValueError(
            f"Invalid filter '{filter_name}'. Must be one of: {', '.join(AVAILABLE_FILTERS)}"
        )


def apply_filter(image, filter_name):
    """Apply a named filter to a PIL Image. Returns a new Image."""
    validate_filter_name(filter_name)
    return _FILTER_MAP[filter_name](image)
