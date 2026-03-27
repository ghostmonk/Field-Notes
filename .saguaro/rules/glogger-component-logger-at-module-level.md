<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: glogger-component-logger-at-module-level
title: Component loggers must be created at module level, not inside functions
severity: warning
globs:
  - shared/python/**/*.py
  - backend/**/*.py
  - cloud-functions/**/*.py
tags:
  - logging
  - glogger
  - architecture
---

Calls to `get_component_logger()` or `_factory.create_logger()` must appear at module level, not inside function bodies. Per-operation context enrichment should use `.with_context()` on an already-created logger.

Look for:
- `get_component_logger(...)` called inside a function or method body
- `_factory.create_logger(...)` called inside a function or method body

Correct pattern (as seen in `cloud-functions/video-processor/main.py`):
```python
# Module level
logger = get_component_logger("video-processor")

# Inside a function — use with_context() for per-operation enrichment
def process(video_id):
    video_logger = logger.with_context(video_id=video_id)
```

Exception: test setup code or factory initialization functions that intentionally construct loggers with dynamic configuration.

### Violations

```
def handle_request(req):
    logger = get_component_logger('api')
    logger.info('handling')
```

### Compliant

```
logger = get_component_logger('api')

def handle_request(req):
    req_logger = logger.with_context(request_id=req.id)
    req_logger.info('handling')
```
