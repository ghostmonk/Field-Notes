<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: glogger-new-provider-implements-all-abstract-methods
title: New LogProvider implementations must override all abstract methods including `name` and `supports_structured_logging`
severity: error
globs:
  - shared/python/glogger/providers/**/*.py
tags:
  - logging
  - glogger
  - architecture
---

Any class that extends `LogProvider` (from `shared/python/glogger/interfaces.py`) must implement all six abstract members: `initialize()`, `log()`, `flush()`, `close()`, `name` (property), and `supports_structured_logging` (property). Missing any of these will cause a `TypeError` at instantiation time in Python, but the issue is better caught in review.

Look for new classes with `class Foo(LogProvider)` that are missing any of:
- `def initialize(self, config) -> bool`
- `def log(self, entry) -> bool`
- `def flush(self) -> None`
- `def close(self) -> None`
- `@property def name(self) -> str`
- `@property def supports_structured_logging(self) -> bool`

Also verify that `log()` and `initialize()` return the correct bool rather than implicitly returning `None`.

### Violations

```
class DatadogLogProvider(LogProvider):
    def initialize(self, config): pass
    def log(self, entry): pass
    # Missing flush, close, name, supports_structured_logging
```

### Compliant

```
class DatadogLogProvider(LogProvider):
    def initialize(self, config) -> bool: ...
    def log(self, entry) -> bool: ...
    def flush(self) -> None: ...
    def close(self) -> None: ...
    @property
    def name(self) -> str: return 'datadog'
    @property
    def supports_structured_logging(self) -> bool: return True
```
