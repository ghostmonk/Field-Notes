# Enhanced Error Handling System

## Overview

This document describes the comprehensive error handling system implemented to provide users with clear, actionable error messages while maintaining security and consistency across the platform.

## Key Features

### 1. Structured Error Responses
- **Standardized format** across all backend endpoints
- **User-friendly messages** instead of technical jargon
- **Contextual information** (file sizes, format requirements, suggestions)
- **Security-safe** (no stack traces or sensitive data exposed to users)

### 2. Error Codes and Categories
- `UPLOAD_FILE_TOO_LARGE` - File exceeds size limits
- `UPLOAD_INVALID_FORMAT` - Unsupported file format
- `UPLOAD_PROCESSING_FAILED` - Server-side processing error
- `AUTHENTICATION_*` - Auth-related errors
- `VALIDATION_*` - Input validation errors
- `NETWORK_ERROR` - Connectivity issues
- `INTERNAL_ERROR` - Server errors

### 3. Enhanced User Experience
- **Clear error messages** with specific details
- **Helpful suggestions** for resolving issues
- **File size limits** and format requirements shown
- **Consistent UI** across all error scenarios
- **Dismissible errors** with optional technical details

## Implementation

### Backend Changes

#### New Error Models (`backend/models/error.py`)
```python
class StandardErrorResponse(BaseModel):
    error_code: ErrorCode
    user_message: str
    details: ErrorDetails | None = None
    request_id: str | None = None
```

#### Updated Upload Handlers (`backend/handlers/uploads.py`)
- File validation now returns structured errors
- Specific messages for image vs video uploads
- File size and format details included

#### Example Error Response
```json
{
  "error_code": "UPLOAD_FILE_TOO_LARGE",
  "user_message": "The image file is too large. Please choose a file smaller than 5MB.",
  "details": {
    "max_file_size": "5MB",
    "current_file_size": "8.2MB",
    "suggestions": [
      "Compress the image",
      "Use a different image format like WebP"
    ]
  }
}
```

### Frontend Changes

#### New Error Types (`frontend/src/types/error.ts`)
- Enhanced `ApiRequestError` class
- Structured error response interfaces
- Error severity levels for styling

#### Error Service (`frontend/src/services/errorService.ts`)
- Centralized error parsing and handling
- User-friendly message extraction
- Context-aware error suggestions
- Consistent logging

#### Error UI Components (`frontend/src/components/ErrorDisplay.tsx`)
- `ErrorDisplay` - Main error component with details
- `ErrorToast` - Auto-dismissing notifications
- `InlineError` - Form field errors
- Severity-based styling (info, warning, error, critical)

#### Updated Components
- **RichTextEditor**: Shows specific upload errors with file details
- **Editor Page**: Uses new error display components
- **API Client**: Enhanced error parsing
- **Story Hooks**: Improved error handling

## Usage Examples

### Upload Errors
When a user tries to upload a file that's too large:

**Before**: Generic alert "Failed to upload image. Please try again."

**After**: Detailed error message with:
- Specific reason (file too large)
- Current file size (8.2MB)
- Maximum allowed size (5MB)
- Helpful suggestions (compress image, use different format)

### Form Validation
- Field-specific error messages
- Clear indication of what needs to be fixed
- Consistent styling across all forms

### Network Errors
- Distinguish between connectivity issues and server errors
- Appropriate retry suggestions
- User-friendly descriptions

## Benefits

1. **Better User Experience**
   - Users understand what went wrong
   - Clear guidance on how to fix issues
   - No confusing technical messages

2. **Improved Security**
   - No stack traces or sensitive data exposed
   - Controlled error information disclosure
   - Debug details only for development

3. **Consistency**
   - Same error format across all endpoints
   - Uniform styling and behavior
   - Maintainable error handling

4. **Developer Experience**
   - Easy to add new error types
   - Centralized error handling logic
   - Comprehensive logging for debugging

## Testing

To test the error handling:

1. **Upload Large File**: Try uploading an image > 5MB or video > 100MB
2. **Invalid Format**: Upload unsupported file types
3. **Network Issues**: Test with poor connectivity
4. **Authentication**: Test with expired tokens

The system now provides specific, actionable error messages for each scenario.

## Future Enhancements

- Internationalization support
- More granular error codes
- Error analytics and monitoring
- Progressive error disclosure
- Contextual help links
