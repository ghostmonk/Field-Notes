# Phase 3: Layout Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract layout components into dedicated `layout/` folder for clear app shell separation.

**Architecture:** Move Layout, TopNav, Footer, BottomNav from `components/` to `layout/`. These form the app shell that wraps all pages. Separating them makes the architecture clearer.

**Tech Stack:** TypeScript, Next.js

---

## Pre-Flight Check

Before starting, ensure:
1. On `main` branch with latest changes: `git checkout main && git pull`
2. Create feature branch: `git checkout -b ghostmonk/phase-3-layout-extraction`
3. Frontend builds: `cd frontend && npm run build`

---

## Task 1: Create Layout Directory

**Files:**
- Create: `frontend/src/layout/`

**Step 1: Create directory**

```bash
mkdir -p frontend/src/layout
```

**Step 2: Commit**

```bash
git add frontend/src/layout/
git commit -m "chore: create layout/ directory"
```

---

## Task 2: Move Layout Components

**Files:**
- Move: `frontend/src/components/Layout.tsx` → `frontend/src/layout/Layout.tsx`
- Move: `frontend/src/components/TopNav.tsx` → `frontend/src/layout/TopNav.tsx`
- Move: `frontend/src/components/Footer.tsx` → `frontend/src/layout/Footer.tsx`
- Move: `frontend/src/components/BottomNav.tsx` → `frontend/src/layout/BottomNav.tsx`

**Step 1: Move all layout files**

```bash
git mv frontend/src/components/Layout.tsx frontend/src/layout/
git mv frontend/src/components/TopNav.tsx frontend/src/layout/
git mv frontend/src/components/Footer.tsx frontend/src/layout/
git mv frontend/src/components/BottomNav.tsx frontend/src/layout/
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: move layout components to layout/"
```

---

## Task 3: Create Barrel Export

**Files:**
- Create: `frontend/src/layout/index.ts`

**Step 1: Create barrel export**

Create `frontend/src/layout/index.ts`:

```typescript
export { default as Layout } from './Layout';
export { default as TopNav } from './TopNav';
export { default as Footer } from './Footer';
export { default as BottomNav } from './BottomNav';
```

**Step 2: Commit**

```bash
git add frontend/src/layout/index.ts
git commit -m "chore: add layout/ barrel export"
```

---

## Task 4: Update Imports in _app.tsx

**Files:**
- Modify: `frontend/src/pages/_app.tsx`

**Step 1: Update import**

Change:
```typescript
import Layout from "@/components/Layout";
```

To:
```typescript
import { Layout } from "@/layout";
```

**Step 2: Commit**

```bash
git add frontend/src/pages/_app.tsx
git commit -m "refactor: update Layout import to use layout/"
```

---

## Task 5: Verify Build

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
git commit -m "fix: resolve issues after layout extraction"
```

---

## Task 6: Run E2E Tests

**Step 1: Run E2E tests**

```bash
cd frontend && npx playwright test
```

Expected: Same pass rate as before (~74/86)

---

## Task 7: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/phase-3-layout-extraction
```

**Step 2: Create PR**

```bash
gh pr create --title "Phase 3: Layout Extraction" --body "$(cat <<'EOF'
## Summary

Extracts layout components into dedicated `layout/` folder:

- Moves `Layout.tsx` → `layout/Layout.tsx`
- Moves `TopNav.tsx` → `layout/TopNav.tsx`
- Moves `Footer.tsx` → `layout/Footer.tsx`
- Moves `BottomNav.tsx` → `layout/BottomNav.tsx`
- Adds barrel export for clean imports

## Phase 3 of Frontend Architecture Refactor

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

- [ ] Task 1: Directory created
- [ ] Task 2: Components moved
- [ ] Task 3: Barrel export created
- [ ] Task 4: Imports updated
- [ ] Task 5: Build verified
- [ ] Task 6: E2E tests pass
- [ ] Task 7: PR created
