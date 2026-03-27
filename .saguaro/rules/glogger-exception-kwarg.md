<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: glogger-exception-kwarg
title: Exceptions must be passed via the `exception=` keyword argument to logger.error/critical
severity: error
globs:
  - shared/python/**/*.py
  - backend/**/*.py
  - cloud-functions/**/*.py
tags:
  - logging
  - glogger
  - error-handling
---

When logging exceptions, the `exception` object must be passed as the keyword argument `exception=e` to `logger.error()` or `logger.critical()`. The `Logger` interface (defined in `shared/python/glogger/interfaces.py`) declares the signature as `error(self, message, exception=None, **context)` — positional passing will bind the exception to an unintended context field.

Look for:
- `logger.error("msg", e)` — exception passed positionally
- `logger.critical("msg", exc)` — exception passed positionally
- `logger.error("msg")` inside an `except` block without passing `exception=e` at all when the exception object is available

Correct pattern:
```python
except Exception as e:
    logger.error("Processing failed", exception=e)
```

### Violations

```
except Exception as e:
    logger.error("Video processing failed", e)
```

```
except ValueError as e:
    logger.critical("Fatal error", e, extra_field="value")
```

### Compliant

```
except Exception as e:
    logger.error("Video processing failed", exception=e)
```

```
except ValueError as e:
    logger.critical("Fatal error", exception=e, extra_field="value")
```
