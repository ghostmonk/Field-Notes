# Logging Usage Guide

This project uses the `glogger` package for unified logging across all Python components.

## Quick Reference

### Import and Use
```python
from glogger import logger

logger.info("Message", key="value")
logger.error("Error occurred", exception=error, context="important")
```

### Component Loggers
```python
from glogger import get_component_logger

auth_logger = get_component_logger('auth')
api_logger = get_component_logger('api') 
video_logger = get_component_logger('video-processor')
```

### Current Usage in Project

#### Backend (`backend/`)
```python
from glogger import logger
from glogger import get_component_logger, get_request_logger

# Used in: app.py, handlers/*.py, middleware/*.py
```

#### Cloud Functions (`cloud-functions/video-processor/`)
```python
from glogger import get_component_logger

logger = get_component_logger("video-processor")
video_logger = logger.with_context(video_id=video_id)
```

## Log Levels & Methods

- `logger.debug()` - Debug information
- `logger.info()` - General info
- `logger.warn()` - Warnings  
- `logger.error()` - Errors (with optional exception)
- `logger.critical()` - Critical errors
- `logger.log_request()` - HTTP request logging

## Environment Behavior

- **Development**: Pretty console output
- **GCP (Cloud Run/Functions)**: Structured JSON with GCP fields
- **Other Production**: Structured JSON to stdout

## Full Documentation

See `shared/python/README.md` for complete API documentation and examples.
