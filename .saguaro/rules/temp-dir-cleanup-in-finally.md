<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: temp-dir-cleanup-in-finally
title: Temporary directories created with tempfile.mkdtemp must be cleaned up in a finally block
severity: error
globs:
  - backend/**/*.py
  - cloud-functions/**/*.py
tags:
  - resource-management
  - cloud-functions
---

Any code that creates a temporary directory with `tempfile.mkdtemp()` must clean it up using `shutil.rmtree()` inside a `finally` block. Placing cleanup only in the happy path (or only in the `except` block) leaks disk space when errors occur or when cleanup is skipped.

Established pattern from `cloud-functions/video-processor/main.py`:
```python
temp_dir = None
try:
    temp_dir = tempfile.mkdtemp()
    # ... use temp_dir ...
finally:
    if temp_dir and os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
```

Look for:
- `tempfile.mkdtemp()` where `shutil.rmtree(temp_dir)` is not inside a `finally` block
- `tempfile.mkdtemp()` where there is no `try/finally` wrapping the usage at all
- Missing `os.path.exists()` guard before `shutil.rmtree()` (protects against double-cleanup)

### Violations

```
temp_dir = tempfile.mkdtemp()
process(temp_dir)
shutil.rmtree(temp_dir)  # Not called if process() raises
```

### Compliant

```
temp_dir = None
try:
    temp_dir = tempfile.mkdtemp()
    process(temp_dir)
finally:
    if temp_dir and os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
```
