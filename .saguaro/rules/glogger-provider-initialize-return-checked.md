<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: glogger-provider-initialize-return-checked
title: LogProvider.initialize() return value must be checked and fallback handled
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

Any code that calls `provider.initialize(config)` must check the boolean return value. A return of `False` means the provider failed to initialize; the caller must either fall back to a working provider (e.g., `ConsoleLogProvider`) or raise an error. Ignoring the return value leaves the application logging silently dropped.

Pattern established in `shared/python/glogger/setup.py`:
```python
if not provider.initialize(config):
    provider = ConsoleLogProvider()
    provider.initialize({})
```

Look for:
- `provider.initialize(config)` where the return value is not assigned or checked
- `provider.initialize(config)` result assigned but never branched on

### Violations

```
provider = GCPLogProvider()
provider.initialize(config)  # return value ignored
return create_logger_factory(provider)
```

### Compliant

```
provider = GCPLogProvider()
if not provider.initialize(config):
    provider = ConsoleLogProvider()
    provider.initialize({})
return create_logger_factory(provider)
```
