# Code Quality Conventions

Structural rules for all source code, backend (Python) and frontend (TypeScript/React). Names follow the Checkstyle checks they derive from; the rules below are their translation to this stack. Where a rule is already enforced by black, isort, flake8, or eslint, the tool wins — don't fight the formatter. Rules marked **(review)** have no automated check and must be enforced in review.

## LineLength

- Python: 100 characters (black `line-length = 100`, flake8 `max-line-length = 100`).
- TypeScript/TSX: 100 characters.
- Don't break a line just to satisfy the limit if the result is harder to read; extract a named variable or helper instead.
- Exempt: URLs, import paths, and string literals that would lose meaning if split. Long strings that are user-facing copy belong in constants, not inline.

## FinalParameters (review)

Never reassign a function parameter. Parameters are inputs, not scratch variables.

- Python: assign a new local instead of rebinding the argument. Never mutate a mutable argument (list, dict, model instance) unless mutation is the function's documented purpose; return a new value instead.
- TypeScript: treat props and arguments as read-only. Don't reassign them; don't mutate objects or arrays passed in. Prefer `Readonly<T>` / `readonly T[]` in signatures where the type is shared.
- Mutable default arguments in Python (`def f(items=[])`) are forbidden. Use `None` and construct inside.

## HiddenField (review)

A local variable or parameter must not shadow a field, module-level name, import, or builtin.

- Python: don't name locals `id`, `type`, `list`, `dict`, `input`, `filter`, `format`, `hash`, `object`. Don't shadow a module-level constant or logger with a local of the same name.
- TypeScript: a local must not shadow an outer-scope variable, an import, or a prop. In components, a destructured prop and a state variable must not share a name.
- Constructor/`__init__` parameters that map one-to-one onto attributes (`self.name = name`) are the one accepted exception.

## MissingSwitchDefault

Every branch on a discrete value must handle the unhandled case explicitly.

- TypeScript `switch`: always include `default`. When switching on a union or enum, the `default` must be an exhaustiveness check that fails the build when a new member is added:
  ```ts
  default: {
    const _exhaustive: never = value;
    throw new Error(`Unhandled value: ${_exhaustive}`);
  }
  ```
- Python `match`: always include `case _:`. Same for `if`/`elif` chains dispatching on a type, status, or display type — end with `else` that raises or logs, never a silent fall-through.
- Lookup-table dispatch (`HANDLERS[key]`) must handle the missing key (`.get()` with explicit fallback, or raise with the bad key in the message).

## DesignForExtension (review)

Prefer composition over inheritance. Classes are closed unless explicitly designed to be extended.

- Python: a base class meant for extension must be an `ABC` with `@abstractmethod` on every member subclasses must provide (see `LogProvider` in `backend.md`). Don't subclass concrete classes to override behaviour; inject the varying part instead.
- Mark methods that subclasses must not override with `@typing.final`; mark classes not meant for extension with `@final`.
- React: no class components, no component inheritance. Extend behaviour through props, composition, and hooks.
- New registries (display types, templates, handlers) must expose a register/lookup API rather than requiring subclassing.

## MagicNumber (review)

No unexplained numeric or string literals in logic.

- Allowed inline: `-1`, `0`, `1`, `2`, and values whose meaning is unambiguous in context (`len(x) == 0`, `array[0]`).
- Everything else gets a named constant: timeouts, retry counts, size limits, pagination sizes, dimensions, quality settings, HTTP status codes in logic, breakpoints.
- Python: module-level `UPPER_SNAKE_CASE` constants; cross-module values go in `backend/constants.py`.
- TypeScript: `UPPER_SNAKE_CASE` `const` at module top; shared values in a constants module under `@/shared`. Tailwind classes are exempt, but arbitrary values (`w-[347px]`) need justification.
- Units go in the name: `UPLOAD_TIMEOUT_MS`, `MAX_IMAGE_BYTES`, `THUMBNAIL_WIDTH_PX`.

## VisibilityModifier (review)

Expose the minimum surface. Internal state is not part of the API.

- Python: attributes and methods not intended for callers outside the class or module are prefixed `_`. Don't access `_`-prefixed members from another module. Use `@property` for read access to internal state rather than a public mutable attribute. Define `__all__` in modules that are imported with intent to expose a public API.
- TypeScript: export only what other modules consume. Use `private` / `readonly` on class members. Module internals stay unexported; don't export a helper just to test it — test through the public API.
- Pydantic/data models are exempt: their fields are the public contract.

## RightCurly (review)

Closing-brace placement follows a consistent style.

- TypeScript: `}` closes on its own line, and `else`, `catch`, `finally` sit on the same line as the preceding `}` (`} else {`). No eslint rule enforces this; reviewers catch violations.
- Python: no braces; the equivalent concern (closing brackets on multi-line calls and literals) is owned by black. Don't hand-align.

## NeedBraces (review)

- TypeScript: every `if`, `else`, `for`, `while`, and `do` body uses braces, including one-liners. No `if (x) return;`. Early-return guards are written `if (x) { return; }` or split across lines.
- Python: no single-line compound statements. `if x: return` on one line is forbidden; the body goes on its own indented line.
- JSX: conditional rendering with `&&` or ternaries is fine; this rule applies to statements, not expressions.

## LocalVariableName

- Python: `snake_case` for locals, functions, and parameters; `UPPER_SNAKE_CASE` only for module-level constants; `PascalCase` for classes.
- TypeScript: `camelCase` for locals, functions, and parameters; `PascalCase` for components, types, and interfaces; `UPPER_SNAKE_CASE` for module-level constants.
- Names describe content, not type: `stories`, not `storyList` or `arr`. Single-letter names only for loop indices and trivial lambdas (`(a, b) => a - b`).
- No abbreviations that aren't industry-standard (`url`, `id`, `db` are fine; `stryCnt`, `usrMgr` are not).
- Booleans read as predicates: `isPublished`, `hasDraft`, `should_retry`.
- Intentionally unused values use the `_` prefix (matches the eslint `argsIgnorePattern`).

## MethodParamPad

No whitespace between a function name and its opening parenthesis, in definitions or calls: `fetchStory(id)`, never `fetchStory (id)`. Same for `def`, constructors, and decorators. Python: enforced by black. TypeScript: no eslint rule; enforced in review.

## AvoidNestedBlocks

- No bare scoping blocks (`{ ... }` used only to limit variable scope) in TypeScript. If a section needs its own scope, it needs its own function.
- Limit nesting depth to 3 levels of control flow inside a function. Flatten with guard clauses and early returns; extract inner loops or branches into named helpers.
- Python: same depth limit. Prefer `continue` / early `return` over nested `if` pyramids. Nested `with` statements combine into one `with a, b:`.
- JSX: deeply nested conditional rendering is extracted into a subcomponent or a variable computed before `return`.

## Enforcement

Formatter-owned rules (LineLength, MethodParamPad/Python) are covered by `make format`. All other rules — including NeedBraces, RightCurly, and MethodParamPad/TypeScript — are checked in review: the PR review bot and human reviewers flag violations against this file by rule name. When fixing a violation in touched code, fix only what the change touches; don't mix bulk cleanup into feature PRs.
