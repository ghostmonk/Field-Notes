# Phase 4: Stories Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `modules/stories/` to consolidate all story-related components and hooks.

**Architecture:** Module-first organization with clear separation between components, hooks, and page composition. Components handle presentation, hooks handle logic, pages compose them together.

**Tech Stack:** TypeScript, React, Next.js

---

## Pre-Flight Check

Before starting, ensure:
1. On feature branch: `ghostmonk/construct-stories-module`
2. Frontend builds: `cd frontend && npm run build`

---

## Task 1: Create Module Structure

**Files:**
- Create: `frontend/src/modules/stories/components/`
- Create: `frontend/src/modules/stories/hooks/`
- Create: `frontend/src/modules/stories/pages/`

**Step 1: Create directories and move hooks**

```bash
mkdir -p frontend/src/modules/stories/components
mkdir -p frontend/src/modules/stories/hooks
mkdir -p frontend/src/modules/stories/pages
```

**Step 2: Commit**

```bash
git add frontend/src/modules/
git commit -m "chore: create modules/stories/ directory structure"
```

---

## Task 2: Move Story Hooks

**Files:**
- Move: `frontend/src/hooks/stories/*` → `frontend/src/modules/stories/hooks/`

**Step 1: Move hooks**

```bash
git mv frontend/src/hooks/stories/useFetchStories.ts frontend/src/modules/stories/hooks/
git mv frontend/src/hooks/stories/useFetchStory.ts frontend/src/modules/stories/hooks/
git mv frontend/src/hooks/stories/useStoryMutations.ts frontend/src/modules/stories/hooks/
git mv frontend/src/hooks/stories/index.ts frontend/src/modules/stories/hooks/
rmdir frontend/src/hooks/stories
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: move story hooks to modules/stories/hooks/"
```

---

## Task 3: Move Story Components

**Files:**
- Move: `frontend/src/components/Stories.tsx` → `frontend/src/modules/stories/components/StoryList.tsx`
- Move: `frontend/src/components/LazyStoryContent.tsx` → `frontend/src/modules/stories/components/LazyStoryContent.tsx`

**Step 1: Move and rename components**

```bash
git mv frontend/src/components/Stories.tsx frontend/src/modules/stories/components/StoryList.tsx
git mv frontend/src/components/LazyStoryContent.tsx frontend/src/modules/stories/components/LazyStoryContent.tsx
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: move story components to modules/stories/components/"
```

---

## Task 4: Create Module Barrel Exports

**Files:**
- Create: `frontend/src/modules/stories/components/index.ts`
- Create: `frontend/src/modules/stories/index.ts`

**Step 1: Create components barrel**

Create `frontend/src/modules/stories/components/index.ts`:

```typescript
export { default as StoryList } from './StoryList';
export { LazyStoryContent } from './LazyStoryContent';
```

**Step 2: Create module barrel**

Create `frontend/src/modules/stories/index.ts`:

```typescript
// Components
export * from './components';

// Hooks
export * from './hooks';
```

**Step 3: Commit**

```bash
git add frontend/src/modules/stories/
git commit -m "chore: add modules/stories/ barrel exports"
```

---

## Task 5: Update Imports - Story Hooks

**Files to modify:**
- `frontend/src/modules/stories/components/StoryList.tsx` - update hook import
- Any other files importing from `@/hooks/stories`

**Step 1: Find and update all imports**

Change:
```typescript
from '@/hooks/stories'
```
To:
```typescript
from '@/modules/stories/hooks'
```

**Step 2: Verify no old imports remain**

```bash
grep -r "from '@/hooks/stories" frontend/src/
```

Expected: No results

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: update story hooks imports to modules/stories/"
```

---

## Task 6: Update Imports - Story Components

**Files to modify:**
- `frontend/src/pages/index.tsx` - update Stories import
- `frontend/src/pages/stories/[slug].tsx` - update LazyStoryContent import
- `frontend/src/modules/stories/components/StoryList.tsx` - update LazyStoryContent import

**Step 1: Update index.tsx**

Change:
```typescript
import Stories from '@/components/Stories';
```
To:
```typescript
import { StoryList } from '@/modules/stories';
```

And update the JSX to use `<StoryList ... />`.

**Step 2: Update story page and StoryList internal imports**

Change LazyStoryContent imports to use module path.

**Step 3: Verify no old imports remain**

```bash
grep -r "from '@/components/Stories" frontend/src/
grep -r "from '@/components/LazyStoryContent" frontend/src/
```

Expected: No results

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: update story component imports to modules/stories/"
```

---

## Task 7: Verify Build

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

Expected: No new errors

**Step 4: Commit any fixes**

If any issues found:
```bash
git add -A
git commit -m "fix: resolve issues after stories module extraction"
```

---

## Task 8: Run E2E Tests

**Step 1: Run E2E tests**

```bash
npx playwright test
```

Expected: Same pass rate as before (~74/86)

---

## Task 9: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/construct-stories-module
```

**Step 2: Create PR**

```bash
gh pr create --title "Phase 4: Stories Module" --body "$(cat <<'EOF'
## Summary

Creates `modules/stories/` to consolidate story-related code:

- Moves `hooks/stories/*` → `modules/stories/hooks/`
- Moves `Stories.tsx` → `modules/stories/components/StoryList.tsx`
- Moves `LazyStoryContent.tsx` → `modules/stories/components/LazyStoryContent.tsx`
- Adds barrel exports for clean imports
- Updates all imports to use new module paths

## Phase 4 of Frontend Architecture Refactor

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

- [ ] Task 1: Module structure created
- [ ] Task 2: Hooks moved
- [ ] Task 3: Components moved
- [ ] Task 4: Barrel exports created
- [ ] Task 5: Hook imports updated
- [ ] Task 6: Component imports updated
- [ ] Task 7: Build verified
- [ ] Task 8: E2E tests pass
- [ ] Task 9: PR created
