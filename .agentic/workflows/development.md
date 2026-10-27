# Development Workflows

## General Principles

- Always explore existing code before making changes
- Follow established patterns in each technology stack
- Use the virtual environment for backend Python work
- Check formatting before committing changes
- New features must include docs-site updates — add or update pages under `docs-site/pages/` (guides, architecture, features, or releases as appropriate). The docs site auto-deploys to GitHub Pages on push to main when `docs-site/` files change.
- Design plans go in `docs-site/pages/plans/` with filename format `YYYY-MM-DD-<topic>.md`. Update `_meta.ts` in the same directory when adding a new plan.

## Import Rules

All imports must be at the top of the file. No local imports inside functions, methods, or conditional blocks. The only exception is `if __name__ == "__main__"` blocks. This applies to all Python files in the project.

## Formatting Rules

`make format` is mandatory before every commit — CI rejects unformatted code.
- Backend: black + isort + flake8
- Frontend: eslint --fix

## Debugging Protocol

- Before proposing any fix: read the actual error message, trace the call path from entry point to failure, identify the root cause. State the root cause explicitly before writing code.
- Never apply speculative fixes. If the cause is unclear, add logging or reproduce the issue first.
- Maximum one fix attempt per hypothesis. If it doesn't work, the hypothesis was wrong — re-investigate, don't iterate on the same guess.

## Completion Checklist

Before declaring work done:
- If a backend endpoint changed: check all frontend callers
- If a data model changed: check migrations, API serialization, and frontend types
- If CSS/template variables changed: verify both light and dark mode
- Run `make format` and `make test`
- If the change affects deployment (new env vars, new dependencies, Dockerfile changes): update `deploy.yml` and document the new vars
