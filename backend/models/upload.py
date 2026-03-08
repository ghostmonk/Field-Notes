from typing import List

from pydantic import BaseModel, ConfigDict


class MediaDimensions(BaseModel):
    """Dimensions of a media file."""

    width: int
    height: int


class ProcessedMediaFile(BaseModel):
    """Result of processing an uploaded media file (image or video)."""

    primary_url: str
    srcset: str  # For images: responsive srcset, for videos: empty string
    width: int
    height: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "primary_url": "/uploads/20241201_123456_abc123.webp",
                "srcset": "/uploads/20241201_123456_abc123_400.webp 400w, /uploads/20241201_123456_abc123_768.webp 768w, /uploads/20241201_123456_abc123_1536.webp 1536w, /uploads/20241201_123456_abc123.webp 2048w",
                "width": 2048,
                "height": 800,
            }
        }
    )


class UploadResponse(BaseModel):
    """Response from the upload endpoint."""

    urls: List[str]
    srcsets: List[str]
    dimensions: List[MediaDimensions]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "urls": ["/uploads/20241201_123456_abc123.webp"],
                "srcsets": [
                    "/uploads/20241201_123456_abc123_400.webp 400w, /uploads/20241201_123456_abc123_768.webp 768w, /uploads/20241201_123456_abc123_1536.webp 1536w, /uploads/20241201_123456_abc123.webp 2048w"
                ],
                "dimensions": [{"width": 2048, "height": 800}],
            }
        }
    )


class ErrorContext(BaseModel):
    """Context information for error logging."""

    error_type: str
    error_details: str
    traceback: str
