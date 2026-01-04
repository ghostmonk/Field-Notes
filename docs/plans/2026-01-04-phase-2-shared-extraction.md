# Phase 2: Shared Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `shared/` folder and consolidate cross-cutting utilities, lib, and types.

**Architecture:** Move `utils/`, `lib/`, and `types/` into `shared/` subfolder. Update all imports from `@/utils/` to `@/shared/utils/`, etc. No functional changes - pure reorganization.

**Tech Stack:** TypeScript, Next.js path aliases

---

## Pre-Flight Check

Before starting, ensure:
1. On `main` branch with latest changes: `git checkout main && git pull`
2. Create feature branch: `git checkout -b ghostmonk/phase-2-shared-extraction`
3. Frontend builds: `cd frontend && npm run build`

---

## Task 1: Create Shared Directory Structure

**Files:**
- Create: `frontend/src/shared/`
- Create: `frontend/src/shared/utils/`
- Create: `frontend/src/shared/lib/`
- Create: `frontend/src/shared/types/`

**Step 1: Create directories**

```bash
mkdir -p frontend/src/shared/utils frontend/src/shared/lib frontend/src/shared/types
```

**Step 2: Commit**

```bash
git add frontend/src/shared/
git commit -m "chore: create shared/ directory structure"
```

---

## Task 2: Move Utils

**Files:**
- Move: `frontend/src/utils/*` → `frontend/src/shared/utils/`

**Step 1: Move all utils files**

```bash
git mv frontend/src/utils/* frontend/src/shared/utils/
rmdir frontend/src/utils
```

**Step 2: Create barrel export**

Create `frontend/src/shared/utils/index.ts`:

```typescript
export * from './extractImageFromContent';
export * from './formatDate';
export * from './logger';
export * from './sanitizer';
export * from './uploadUtils';
export * from './urls';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move utils/ to shared/utils/"
```

---

## Task 3: Move Lib

**Files:**
- Move: `frontend/src/lib/*` → `frontend/src/shared/lib/`

**Step 1: Move all lib files**

```bash
git mv frontend/src/lib/* frontend/src/shared/lib/
rmdir frontend/src/lib
```

**Step 2: Create barrel export**

Create `frontend/src/shared/lib/index.ts`:

```typescript
export * from './api-client';
export * from './auth';
export * from './keep-alive';
export * from './navigation';
export * from './logging';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move lib/ to shared/lib/"
```

---

## Task 4: Move Types

**Files:**
- Move: `frontend/src/types/*` → `frontend/src/shared/types/`

**Step 1: Move all types files**

```bash
git mv frontend/src/types/* frontend/src/shared/types/
rmdir frontend/src/types
```

**Step 2: Create barrel export**

Create `frontend/src/shared/types/index.ts`:

```typescript
export * from './api';
export * from './error';
// Note: next-auth.d.ts is a declaration file, not exported
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move types/ to shared/types/"
```

---

## Task 5: Create Shared Index

**Files:**
- Create: `frontend/src/shared/index.ts`

**Step 1: Create main barrel export**

Create `frontend/src/shared/index.ts`:

```typescript
// Re-export all shared modules
export * from './utils';
export * from './lib';
export * from './types';
```

**Step 2: Commit**

```bash
git add frontend/src/shared/index.ts
git commit -m "chore: add shared/ barrel exports"
```

---

## Task 6: Update Utils Imports

**Files to modify (13 files):**
- `frontend/src/pages/api/engagement/[...path].ts`
- `frontend/src/pages/api/stories.ts`
- `frontend/src/pages/stories/[slug].tsx`
- `frontend/src/hooks/uploads/useVideoUpload.ts`
- `frontend/src/pages/api/projects/index.ts`
- `frontend/src/pages/api/projects/[slug].ts`
- `frontend/src/pages/api/pages/[pageType].ts`
- `frontend/src/hooks/uploads/useImageUpload.ts`
- `frontend/src/hooks/uploads/useFileUpload.ts`
- `frontend/src/hooks/editor/useStoryEditor.ts`
- `frontend/src/pages/_app.tsx`
- `frontend/src/services/errorService.ts`
- `frontend/src/pages/api/upload-proxy.ts`

**Step 1: Find and replace all utils imports**

For each file, replace:
```typescript
from '@/utils/...'
```
With:
```typescript
from '@/shared/utils/...'
```

**Step 2: Verify no remaining old imports**

```bash
grep -r "from '@/utils/" frontend/src/
```

Expected: No results

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: update utils imports to @/shared/utils/"
```

---

## Task 7: Update Lib Imports

**Files to modify (15 files):**
- `frontend/src/hooks/useEngagement.ts`
- `frontend/src/components/Stories.tsx`
- `frontend/src/components/BottomNav.tsx`
- `frontend/src/pages/projects/[slug].tsx`
- `frontend/src/pages/projects.tsx`
- `frontend/src/pages/contact.tsx`
- `frontend/src/pages/about.tsx`
- `frontend/src/hooks/useActiveSection.ts`
- `frontend/src/hooks/stories/useStoryMutations.ts`
- `frontend/src/hooks/stories/useFetchStory.ts`
- `frontend/src/hooks/stories/useFetchStories.ts`
- `frontend/src/hooks/editor/useStoryEditor.ts`
- `frontend/src/pages/_app.tsx`
- `frontend/src/utils/logger.ts` (now at `shared/utils/logger.ts`)
- `frontend/src/lib/logging/index.ts` (now at `shared/lib/logging/index.ts`)

**Step 1: Find and replace all lib imports**

For each file, replace:
```typescript
from '@/lib/...'
```
With:
```typescript
from '@/shared/lib/...'
```

**Step 2: Verify no remaining old imports**

```bash
grep -r "from '@/lib/" frontend/src/
```

Expected: No results

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: update lib imports to @/shared/lib/"
```

---

## Task 8: Update Types Imports

**Files to modify (21 files):**
- `frontend/src/pages/index.tsx`
- `frontend/src/components/engagement/CommentThread.tsx`
- `frontend/src/components/engagement/ReactionBar.tsx`
- `frontend/src/pages/stories/[slug].tsx`
- `frontend/src/lib/api-client.ts` (now at `shared/lib/api-client.ts`)
- `frontend/src/hooks/useEngagement.ts`
- `frontend/src/components/engagement/EngagementProvider.tsx`
- `frontend/src/components/engagement/CommentSection.tsx`
- `frontend/src/components/Stories.tsx`
- `frontend/src/pages/projects/[slug].tsx`
- `frontend/src/pages/projects.tsx`
- `frontend/src/pages/contact.tsx`
- `frontend/src/pages/about.tsx`
- `frontend/src/hooks/uploads/useFileUpload.ts`
- `frontend/src/hooks/stories/useStoryMutations.ts`
- `frontend/src/hooks/stories/useFetchStory.ts`
- `frontend/src/hooks/stories/useFetchStories.ts`
- `frontend/src/hooks/editor/useStoryEditor.ts`
- `frontend/src/services/errorService.ts`
- `frontend/src/utils/uploadUtils.ts` (now at `shared/utils/uploadUtils.ts`)
- `frontend/src/components/ErrorDisplay.tsx`

**Step 1: Find and replace all types imports**

For each file, replace:
```typescript
from '@/types/...'
```
With:
```typescript
from '@/shared/types/...'
```

**Step 2: Verify no remaining old imports**

```bash
grep -r "from '@/types/" frontend/src/
```

Expected: No results

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: update types imports to @/shared/types/"
```

---

## Task 9: Verify Build

**Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Run lint**

```bash
npm run lint
```

Expected: No new errors (existing warnings acceptable)

**Step 4: Commit any fixes**

If any issues found:
```bash
git add -A
git commit -m "fix: resolve import issues after shared extraction"
```

---

## Task 10: Run E2E Tests

**Step 1: Start backend (if not running)**

```bash
# In separate terminal
make dev-backend
```

**Step 2: Run E2E tests**

```bash
cd frontend && npm run test:e2e
```

Expected: All tests pass

**Step 3: Commit any fixes**

If any issues found:
```bash
git add -A
git commit -m "fix: resolve test issues after shared extraction"
```

---

## Task 11: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/phase-2-shared-extraction
```

**Step 2: Create PR**

```bash
gh pr create --title "Phase 2: Shared Extraction" --body "$(cat <<'EOF'
## Summary

Consolidates cross-cutting code into `shared/` directory:

- Moves `utils/` → `shared/utils/`
- Moves `lib/` → `shared/lib/`
- Moves `types/` → `shared/types/`
- Updates all imports (49 files)
- Adds barrel exports for clean imports

## Phase 2 of Frontend Architecture Refactor

See `docs/plans/2026-01-03-frontend-architecture-refactor.md` for full plan.

## No Functional Changes

This is a pure reorganization. No behavior changes.

## Test Plan

- [x] TypeScript compiles without errors
- [x] Build succeeds
- [x] Lint passes
- [x] E2E tests pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Completion Checklist

- [ ] Task 1: Directory structure created
- [ ] Task 2: Utils moved
- [ ] Task 3: Lib moved
- [ ] Task 4: Types moved
- [ ] Task 5: Shared index created
- [ ] Task 6: Utils imports updated (13 files)
- [ ] Task 7: Lib imports updated (15 files)
- [ ] Task 8: Types imports updated (21 files)
- [ ] Task 9: Build verified
- [ ] Task 10: E2E tests pass
- [ ] Task 11: PR created
