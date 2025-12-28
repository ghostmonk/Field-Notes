from enum import Enum
from typing import Dict, List

from pydantic import BaseModel, ConfigDict


class ErrorCode(str, Enum):
    """Standardized error codes for consistent error handling."""

    # Upload errors
    UPLOAD_FILE_TOO_LARGE = "UPLOAD_FILE_TOO_LARGE"
    UPLOAD_INVALID_FORMAT = "UPLOAD_INVALID_FORMAT"
    UPLOAD_PROCESSING_FAILED = "UPLOAD_PROCESSING_FAILED"
    UPLOAD_NETWORK_ERROR = "UPLOAD_NETWORK_ERROR"

    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    VALIDATION_REQUIRED_FIELD = "VALIDATION_REQUIRED_FIELD"
    VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT"

    # Authentication errors
    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    AUTHENTICATION_EXPIRED = "AUTHENTICATION_EXPIRED"
    AUTHENTICATION_INVALID = "AUTHENTICATION_INVALID"

    # Authorization errors
    PERMISSION_DENIED = "PERMISSION_DENIED"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"

    # Network/System errors
    NETWORK_ERROR = "NETWORK_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class ErrorDetails(BaseModel):
    """Context information for errors."""

    max_file_size: str | None = None
    current_file_size: str | None = None
    allowed_formats: List[str] | None = None
    field_errors: Dict[str, str] | None = None
    suggestions: List[str] | None = None
    resource_id: str | None = None

    def has_content(self) -> bool:
        """Check if the error details contain any meaningful content."""
        return bool(self.model_dump(exclude_unset=True, exclude_none=True))


class StandardErrorResponse(BaseModel):
    """Standardized error response format."""

    error_code: ErrorCode
    user_message: str
    details: ErrorDetails | None = None
    request_id: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error_code": "UPLOAD_FILE_TOO_LARGE",
                "user_message": "The image file is too large. Please choose a file smaller than 5MB.",
                "details": {
                    "max_file_size": "5MB",
                    "current_file_size": "8.2MB",
                    "suggestions": ["Compress the image", "Use a different image format like WebP"],
                },
                "request_id": "req_abc123",
            }
        }
    )


# Error message templates for consistent messaging
ERROR_MESSAGES = {
    ErrorCode.UPLOAD_FILE_TOO_LARGE: {
        "image": "The image file is too large. Please choose a file smaller than {max_size}.",
        "video": "The video file is too large. Please choose a file smaller than {max_size}.",
        "generic": "The file is too large. Please choose a file smaller than {max_size}.",
    },
    ErrorCode.UPLOAD_INVALID_FORMAT: {
        "image": "This image format is not supported. Please use JPEG, PNG, GIF, or WebP.",
        "video": "This video format is not supported. Please use MP4, WebM, QuickTime, or AVI.",
        "generic": "This file format is not supported.",
    },
    ErrorCode.UPLOAD_PROCESSING_FAILED: {
        "image": "There was an error processing your image. Please try again or use a different image.",
        "video": "There was an error processing your video. Please try again or use a different video.",
        "generic": "There was an error processing your file. Please try again.",
    },
    ErrorCode.AUTHENTICATION_REQUIRED: "You need to be logged in to perform this action.",
    ErrorCode.AUTHENTICATION_EXPIRED: "Your session has expired. Please log in again.",
    ErrorCode.AUTHENTICATION_INVALID: "Your authentication is invalid. Please log in again.",
    ErrorCode.PERMISSION_DENIED: "You don't have permission to perform this action.",
    ErrorCode.RESOURCE_NOT_FOUND: "The requested resource was not found.",
    ErrorCode.VALIDATION_ERROR: "Please check your input and try again.",
    ErrorCode.NETWORK_ERROR: "Network error occurred. Please check your connection and try again.",
    ErrorCode.INTERNAL_ERROR: "An unexpected error occurred. Please try again later.",
    ErrorCode.SERVICE_UNAVAILABLE: "Service is temporarily unavailable. Please try again later.",
}


def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f}KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f}MB"


def get_error_message(error_code: ErrorCode, context: str = "generic", **kwargs) -> str:
    """Get formatted error message for an error code."""
    messages = ERROR_MESSAGES.get(error_code)

    if isinstance(messages, dict):
        message_template = messages.get(context, messages.get("generic", "An error occurred."))
    else:
        message_template = messages or "An error occurred."

    try:
        return message_template.format(**kwargs)
    except (KeyError, ValueError):
        return message_template


def create_upload_error_response(
    error_code: ErrorCode,
    file_type: str = "generic",
    current_size: int | None = None,
    max_size: int | None = None,
    allowed_formats: List[str] | None = None,
    request_id: str | None = None,
) -> StandardErrorResponse:
    """Create a standardized upload error response."""

    details = ErrorDetails()
    kwargs = {}

    if max_size:
        details.max_file_size = format_file_size(max_size)
        kwargs["max_size"] = details.max_file_size

    if current_size:
        details.current_file_size = format_file_size(current_size)

    if allowed_formats:
        details.allowed_formats = allowed_formats

    # Add helpful suggestions based on error type
    if error_code == ErrorCode.UPLOAD_FILE_TOO_LARGE:
        details.suggestions = [
            "Compress the file using an online tool",
            "Use a different file with smaller size",
            "For images: convert to WebP format for better compression",
        ]
    elif error_code == ErrorCode.UPLOAD_INVALID_FORMAT:
        details.suggestions = [
            f"Convert the file to one of the supported formats: {', '.join(allowed_formats or [])}"
        ]

    user_message = get_error_message(error_code, file_type, **kwargs)

    return StandardErrorResponse(
        error_code=error_code,
        user_message=user_message,
        details=details if details.has_content() else None,
        request_id=request_id,
    )
