# Phase 6: Section & Content Management

**Goal:** Make the editor section-aware — admins can create/edit/delete sections and create content for any section type, with the editor form adapting to the section's content_type.

**Architecture:** Add section CRUD proxy routes and api-client methods, create an `/admin/sections` management page, refactor the editor page to accept a `section_id` and render content-type-specific forms (story, project, page). Reuse existing backend API (no backend changes).

**Tech Stack:** Next.js, TypeScript, NextAuth, TipTap, Playwright e2e

---

## Context

Dynamic Sections Phases 1-5 are released. The backend has full section CRUD. The frontend has a registry system mapping `display_type`/`content_type` to React components, dynamic routing via `[...slugPath].tsx`, and database-driven navigation. But the editor only creates stories — there's no UI for managing sections or creating content for different section types.

---

## Batch 1: API Layer

### Task 1: Add section CRUD types

**Files:**
- Modify: `frontend/src/shared/types/api.ts`

**Steps:**
1. Add `section_id?: string` to `Story`, `CreateStoryRequest`, `Project`, `ProjectCard`, `CreateProjectRequest`
2. Add `CreateSectionRequest` and `UpdateSectionRequest` interfaces
3. Verify: `cd frontend && npx tsc --noEmit`

### Task 2: Add section CRUD proxy routes

**Files:**
- Create: `frontend/src/pages/api/sections/index.ts` (GET list + POST create)
- Create: `frontend/src/pages/api/sections/[id].ts` (GET + PUT + DELETE by ID)

**Pattern:** Follow `pages/api/stories/[id].ts`. Existing `pages/api/sections/navigation.ts` and `pages/api/sections/by-slug/[slug].ts` must not be disturbed.

### Task 3: Add section CRUD methods to api-client

**Files:**
- Modify: `frontend/src/shared/lib/api-client.ts`

**Steps:**
1. Add to `apiRoutes.sections`: `list`, `getById`, `create`, `update`, `delete` (keep existing `getBySlug`, `navigation`)
2. Add to `apiClient.sections`: `list(token, params?)`, `getById(id, token)`, `create(data, token)`, `update(id, data, token)`, `delete(id, token)`
3. Verify: `npx tsc --noEmit`
4. Commit batch 1

---

## Batch 2: Section Management Page

### Task 4: Create sections module with hooks

**Files:**
- Create: `frontend/src/modules/sections/hooks/useSectionMutations.ts`
- Create: `frontend/src/modules/sections/hooks/useFetchSections.ts`
- Create: `frontend/src/modules/sections/hooks/index.ts`
- Create: `frontend/src/modules/sections/index.ts`

**Pattern:** Follow `modules/stories/hooks/useStoryMutations.ts` for mutations, simple fetch-on-mount for list.

### Task 5: Create /admin/sections page

**Files:**
- Create: `frontend/src/pages/admin/sections.tsx`

**Internal components:**
- `SectionCreateForm` — title, display_type select, content_type select, nav_visibility select
- `SectionRow` — shows section with Edit/Delete/"Add Content" buttons
- `SectionEditForm` — inline edit, same fields as create, pre-filled

**Behavior:** Auth guard (redirect non-admin), list all sections, CRUD operations, "Add Content" navigates to `/editor?section_id={id}`

### Task 6: Add nav cache invalidation and admin links

**Files:**
- Modify: `frontend/src/hooks/useNavSections.ts` — export `invalidateNavCache()`
- Modify: `frontend/src/shared/lib/navigation.ts` — add `id` to `NavSectionItem`
- Modify: `frontend/src/layout/TopNav.tsx` — add "Sections" admin link, context-aware "New" button using active section ID

Commit batch 2.

---

## Batch 3: Section-Aware Editor

### Task 7: Extract story editor form component

**Files:**
- Create: `frontend/src/modules/editor/components/StoryEditorForm.tsx`
- Modify: `frontend/src/modules/editor/hooks/useStoryEditor.ts` — accept `sectionId` param, include in save payload

Extract current form from `editor.tsx` (TitleInput, ContentEditor, PublishToggle, FormActions, EditorHeader) into `StoryEditorForm`. Props: `section: Section`, `storyId?: string`.

### Task 8: Create project editor form

**Files:**
- Create: `frontend/src/modules/editor/hooks/useProjectEditor.ts`
- Create: `frontend/src/modules/editor/components/ProjectEditorForm.tsx`

**Fields:** title, summary (textarea), content (RichTextEditor), technologies (comma-separated input), github_url, live_url, image_url, is_featured checkbox, sort_order, is_published. Uses `apiClient.projects.create/update`.

### Task 9: Create page editor form and refactor editor.tsx

**Files:**
- Create: `frontend/src/modules/editor/components/PageEditorForm.tsx`
- Modify: `frontend/src/pages/editor.tsx` — refactor to thin shell

**Refactored editor.tsx:**
1. Read `section_id` and `id` from `router.query`
2. If `id` (editing): fetch item, determine section from `section_id`
3. If `section_id` (new): fetch section for `content_type`
4. If neither: show `SectionPicker` dropdown
5. Render correct form based on `content_type`: story → `StoryEditorForm`, project → `ProjectEditorForm`, page → `PageEditorForm`

Commit batch 3.

---

## Batch 4: E2E Tests

### Task 10: Add section test data and mock routes

**Files:**
- Modify: `frontend/e2e/test-data.ts` — add `createTestSection()`
- Modify: `frontend/e2e/fixtures/api-mock.fixture.ts` — section CRUD mocks
- Modify: `frontend/e2e/mock-server.ts` — section endpoints

### Task 11: Admin sections page e2e tests

**Files:**
- Create: `frontend/e2e/page-objects/admin-sections.page.ts`
- Create: `frontend/e2e/specs/admin/sections.spec.ts`

**Tests:** page loads for admin, non-admin redirect, CRUD operations, "Add Content" navigation

### Task 12: Section-aware editor e2e tests

**Files:**
- Create: `frontend/e2e/specs/editor/section-editor.spec.ts`

**Tests:** correct form per content_type, section picker without params, section_id in save payload

Commit batch 4.

---

## Verification

1. `make dev` — start local stack
2. Log in as admin → `/admin/sections` — see blog, about, projects, contact
3. Create section → appears in navigation
4. Edit section title → slug updates
5. Delete section → removed from navigation
6. `/editor` → section picker shown
7. `/editor?section_id=<blog-id>` → story form
8. `/editor?section_id=<projects-id>` → project form
9. "Add Content" from admin page → correct editor form
10. `npx playwright test` — all pass

---

## Key Files

| File | Role |
|------|------|
| `frontend/src/shared/types/api.ts` | Types — updated first |
| `frontend/src/shared/lib/api-client.ts` | Section CRUD methods |
| `frontend/src/pages/api/sections/index.ts` | Proxy: list + create |
| `frontend/src/pages/api/sections/[id].ts` | Proxy: get + update + delete |
| `frontend/src/pages/admin/sections.tsx` | Admin management page |
| `frontend/src/pages/editor.tsx` | Refactored to section-aware shell |
| `frontend/src/modules/editor/hooks/useStoryEditor.ts` | Add section_id support |
| `frontend/src/modules/editor/hooks/useProjectEditor.ts` | New — project editor state |
| `frontend/src/modules/editor/components/StoryEditorForm.tsx` | New — extracted story form |
| `frontend/src/modules/editor/components/ProjectEditorForm.tsx` | New — project form |
| `frontend/src/modules/editor/components/PageEditorForm.tsx` | New — page form |
| `frontend/src/modules/sections/hooks/useSectionMutations.ts` | New — section CRUD hook |
| `frontend/src/modules/sections/hooks/useFetchSections.ts` | New — fetch sections hook |
| `frontend/src/hooks/useNavSections.ts` | Add invalidateNavCache |
| `frontend/src/shared/lib/navigation.ts` | Add id to NavSectionItem |
| `frontend/src/layout/TopNav.tsx` | Admin links, context-aware "New" |
