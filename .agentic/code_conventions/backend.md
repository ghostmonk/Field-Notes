# Backend Conventions

## Logging

- Create loggers at module level with `get_component_logger()`. Use `.with_context()` inside functions for per-operation enrichment. Don't create loggers inside function bodies.
- Pass exceptions as keyword argument: `logger.error("msg", exception=e)`, not `logger.error("msg", e)`. The `Logger` interface expects `exception` as a keyword — positional passing binds it to an unintended context field.
- Check `LogProvider.initialize()` return value. `False` means initialization failed — fall back to `ConsoleLogProvider` or raise. Ignoring the return silently drops all logs.
- New `LogProvider` implementations must implement all six abstract members: `initialize()`, `log()`, `flush()`, `close()`, `name` (property), `supports_structured_logging` (property). Verify `log()` and `initialize()` return `bool`, not implicit `None`.

## Resource Management

Any `tempfile.mkdtemp()` must have `shutil.rmtree()` in a `finally` block with an `os.path.exists()` guard. Don't place cleanup only in the happy path.
