# PR Review

## Review Bot Rules

When reviewing PRs as a bot, follow these rules strictly:

- **Verify before reporting.** Read the actual code at the line you're citing. If the code already handles the concern, don't report it.
- **Do not repeat rejected findings.** If a previous review raised an issue and it was addressed or explicitly rejected, do not raise it again in subsequent reviews. Check the commit history and previous comment threads before reporting.
- **Understand React's event model.** React attaches `onLoad`/`onError` handlers directly to DOM elements for non-bubbling events. Direct `src` mutation on an `<img>` element still triggers React's synthetic event handlers. Do not claim otherwise without verification.
- **Understand HTTP caching.** Network errors and timeouts produce no response body — browsers do not cache them. `Cache-Control: immutable` only applies to successful responses. Cache-busting query params (`?_retry=N`) create distinct cache keys by design.
- **Severity must match impact.** HIGH means "will cause data loss, security vulnerability, or production outage." A theoretical concern about edge-case CDN behavior is not HIGH.

## PR Review Loop

When told to "review loop" or "monitor PR" on an active PR, execute this cycle:

1. **Push latest changes** to the PR branch.
2. **Wait 5 minutes**, then check for new bot review comments.
3. **Triage each finding**: valid (fix it), false positive (skip it), repeat (skip it). Track counts.
4. **Fix all valid findings** in one commit. Push.
5. **Delete the resolved bot comment**.
6. **Run tests**: `make test`, `make test-frontend-unit`, `make format`. Fix any failures before continuing.
7. **Wait 5 minutes** and check again. Repeat from step 3.
8. **Stop when** two consecutive rounds produce only repeats, false positives, or low-value nitpicks.
9. **Update `docs-site/data/review-findings.json`** with a new entry for this PR:
   - `pr`, `date`, `title`, `rounds`, `totals` (findings/valid/false_positive/skipped), `by_category`, `by_severity`, `flagged_files`, `notes`
   - Commit this to main, not the PR branch.

## Triage Rules

- A finding is **valid** if it identifies a real bug, security issue, or code quality problem that affects behavior or maintainability.
- A finding is a **false positive** if the code already handles the concern, or the bot misunderstands the runtime model (e.g., React event delegation, CSP scope).
- A finding is a **repeat** if the same concern was raised in a prior round and was already addressed or explicitly rejected.
- **Always fix** high and medium severity valid findings. Fix low severity if the change is clean and doesn't bloat the diff.
