# Editor Command Center — Phase 6: Inline Admin Affordances

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize inline edit buttons, draft badges, and section-header admin controls across all content types on the public site, so admins can manage content without navigating to the command center.

**Architecture:** Extract a reusable `AdminEditButton` component using template CSS classes (not shadcn — public site respects the active template). Add draft badges to ProjectCard and PhotoEssayCard. Create a `SectionAdminBar` component with "Add content" and "Add child section" actions rendered as a popover in the section header area. All admin affordances are gated on `session?.user?.role === 'admin'` and render nothing for non-admin users.

**Tech Stack:** React, NextAuth.js (`useSession`), template CSS classes (`.btn`, `.btn--secondary`, `.btn--sm`, `.badge`, `.badge--draft`), existing `useRouter` for navigation

---

### Task 1: Extract AdminEditButton component

**Files:**
- Create: `frontend/src/components/AdminEditButton.tsx`

This is a small template-styled button that renders only for admin users. It replaces the inconsistent edit button implementations scattered across StoryCard, StoryDetail, ProjectDetail, PhotoEssayPage, and the static page view.

**Step 1: Create the component**

```tsx
// frontend/src/components/AdminEditButton.tsx
import { useSession } from "next-auth/react";

interface AdminEditButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

export function AdminEditButton({
  onClick,
  label = "Edit",
  className = "",
  "data-testid": testId,
}: AdminEditButtonProps) {
  const { data: session } = useSession();
  if (session?.user?.role !== "admin") return null;

  return (
    <button
      onClick={onClick}
      className={`btn btn--secondary btn--sm ${className}`.trim()}
      data-testid={testId}
    >
      {label}
    </button>
  );
}
```

Design decisions:
- Uses template CSS classes (`btn btn--secondary btn--sm`) so it matches the active template.
- Self-gating: checks admin role internally, so callers don't need auth logic.
- No `useRouter` dependency — caller provides `onClick`, keeping the component generic.

**Step 2: Commit**

```bash
git add frontend/src/components/AdminEditButton.tsx
git commit -m "feat: add AdminEditButton component with template-aware styling"
```

---

### Task 2: Extract AdminDraftBadge component

**Files:**
- Create: `frontend/src/components/AdminDraftBadge.tsx`

A badge that renders "Draft" for unpublished content, visible only to admins. Currently only StoryCard shows this; ProjectCard and PhotoEssayCard don't.

**Step 1: Create the component**

```tsx
// frontend/src/components/AdminDraftBadge.tsx
import { useSession } from "next-auth/react";

interface AdminDraftBadgeProps {
  isPublished: boolean;
  className?: string;
}

export function AdminDraftBadge({
  isPublished,
  className = "",
}: AdminDraftBadgeProps) {
  const { data: session } = useSession();
  if (isPublished || session?.user?.role !== "admin") return null;

  return (
    <span className={`badge badge--draft ${className}`.trim()}>Draft</span>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/AdminDraftBadge.tsx
git commit -m "feat: add AdminDraftBadge component for consistent draft indicators"
```

---

### Task 3: Add edit button and draft badge to ProjectCard

**Files:**
- Modify: `frontend/src/modules/projects/components/ProjectCard.tsx`

ProjectCard is currently read-only. Add an edit button (top-right, consistent with StoryCard) and a draft badge. The edit action navigates to `/editor?id={project.id}`.

**Step 1: Read ProjectCard and understand its structure**

Read `frontend/src/modules/projects/components/ProjectCard.tsx`. Understand the card layout, what props it accepts, and where the edit button should go.

**Step 2: Add AdminEditButton and AdminDraftBadge**

Import `AdminEditButton`, `AdminDraftBadge`, and `useRouter`. Add an `onClick` handler that navigates to the editor. Place the button in a position consistent with StoryCard's `.story-header__actions` pattern — absolute-positioned top-right of the card.

The project model has `is_published` — check `frontend/src/shared/types/api.ts` for the `Project` or `ProjectCard` interface to confirm the field name.

Key points:
- The card wraps content in a link. The edit button must use `e.stopPropagation()` and `e.preventDefault()` to prevent the link navigation when clicking edit.
- Place `AdminDraftBadge` near the title or at the top of the card.
- Use `position: relative` on the card container and `position: absolute; top: 0; right: 0;` on the button wrapper, matching StoryCard's pattern.

**Step 3: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add frontend/src/modules/projects/components/ProjectCard.tsx
git commit -m "feat: add edit button and draft badge to ProjectCard"
```

---

### Task 4: Add edit button and draft badge to PhotoEssayCard

**Files:**
- Modify: `frontend/src/modules/photo-essays/components/PhotoEssayCard.tsx`

Same pattern as Task 3. PhotoEssayCard is currently read-only.

**Step 1: Read PhotoEssayCard and understand its structure**

Read `frontend/src/modules/photo-essays/components/PhotoEssayCard.tsx`. Check the `PhotoEssayCard` type in `api.ts` for `is_published`.

**Step 2: Add AdminEditButton and AdminDraftBadge**

Same approach as ProjectCard: absolute-positioned edit button, draft badge, `stopPropagation` on the button click.

**Step 3: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add frontend/src/modules/photo-essays/components/PhotoEssayCard.tsx
git commit -m "feat: add edit button and draft badge to PhotoEssayCard"
```

---

### Task 5: Standardize edit button on detail pages

**Files:**
- Modify: `frontend/src/modules/stories/components/StoryDetail.tsx`
- Modify: `frontend/src/modules/projects/components/ProjectDetail.tsx`
- Modify: `frontend/src/modules/photo-essays/components/PhotoEssayPage.tsx`

Replace the ad-hoc edit buttons in detail pages with `AdminEditButton`. Currently:
- StoryDetail: uses shadcn `Button` with `onEdit` callback
- ProjectDetail: uses shadcn `Button` with `onEdit` callback
- PhotoEssayPage: uses template CSS `.btn btn--secondary btn--sm` with `onEdit` callback

For StoryDetail and ProjectDetail, replace the shadcn `Button` with `AdminEditButton`. Since these components receive `onEdit` from the parent (which already does the admin check), the `AdminEditButton`'s internal admin check is redundant but harmless — it means the parent can stop doing the check, simplifying the call site.

For PhotoEssayPage, it already uses template CSS — just swap to `AdminEditButton` so the auth check is self-contained.

**Step 1: Update StoryDetail**

Replace the conditional `{onEdit && <Button ...>Edit</Button>}` block with `<AdminEditButton onClick={onEdit} data-testid="story-edit-button" />`. Remove the `onEdit` conditionality — `AdminEditButton` handles visibility.

Keep the `onEdit` prop but change its type from `(() => void) | undefined` to `() => void` (required), since the parent always knows the edit route. The admin gate is now in `AdminEditButton`, not the parent.

Actually — preserve the optional `onEdit` prop for backward compatibility. `AdminEditButton` already returns null for non-admins. If `onEdit` is undefined, don't render the button at all.

```tsx
{onEdit && <AdminEditButton onClick={onEdit} data-testid="story-edit-button" />}
```

**Step 2: Update ProjectDetail**

Same pattern as StoryDetail.

**Step 3: Update PhotoEssayPage**

Replace the inline `<button className="btn btn--secondary btn--sm" onClick={onEdit}>Edit</button>` with `AdminEditButton`. Keep the delete button as-is (delete has its own confirmation flow).

**Step 4: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 5: Commit**

```bash
git add frontend/src/modules/stories/components/StoryDetail.tsx frontend/src/modules/projects/components/ProjectDetail.tsx frontend/src/modules/photo-essays/components/PhotoEssayPage.tsx
git commit -m "feat: standardize edit buttons on detail pages with AdminEditButton"
```

---

### Task 6: SectionAdminBar component

**Files:**
- Create: `frontend/src/components/SectionAdminBar.tsx`

A bar rendered below the section title on list views. Contains two buttons: "Add content" and "Add section". Visible only to admins. Uses template CSS classes.

"Add content" navigates to `/editor?section_id={sectionId}`. "Add section" needs to open a dialog for creating a child section — but the public site doesn't have shadcn dialogs. Two options:

**Approach: Navigate to the command center.** "Add section" links to `/admin?section={sectionId}` which opens the command center with that section selected. The admin can then use the context menu to add a child section. This avoids pulling shadcn into the public site.

**Step 1: Create the component**

```tsx
// frontend/src/components/SectionAdminBar.tsx
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

interface SectionAdminBarProps {
  sectionId: string;
}

export function SectionAdminBar({ sectionId }: SectionAdminBarProps) {
  const { data: session } = useSession();
  const router = useRouter();

  if (session?.user?.role !== "admin") return null;

  return (
    <div
      className="flex gap-sm mb-md"
      data-testid="section-admin-bar"
    >
      <button
        className="btn btn--primary btn--sm"
        onClick={() => router.push(`/editor?section_id=${sectionId}`)}
        data-testid="section-add-content"
      >
        Add Content
      </button>
      <button
        className="btn btn--secondary btn--sm"
        onClick={() => router.push(`/admin?section=${sectionId}`)}
        data-testid="section-manage"
      >
        Manage Section
      </button>
    </div>
  );
}
```

Design decisions:
- "Manage Section" instead of "Add Section" — links to the command center where all section operations are available (add child, edit settings, delete). Avoids duplicating the AddSectionDialog on the public site.
- Uses `gap-sm` and `mb-md` which are template spacing utilities (defined as CSS custom properties in `tokens.css`). Verify these classes exist; if not, use inline `style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}` or Tailwind equivalents.
- Self-gating on admin role.

**Step 2: Commit**

```bash
git add frontend/src/components/SectionAdminBar.tsx
git commit -m "feat: add SectionAdminBar component for section-level admin actions"
```

---

### Task 7: Wire SectionAdminBar into the catch-all route

**Files:**
- Modify: `frontend/src/pages/[...slugPath].tsx`

The section list view renders the section title as `<h1 className="page-title">{section.title}</h1>`. Place `SectionAdminBar` directly below this title.

**Step 1: Read the list view rendering in `[...slugPath].tsx`**

Find the section where the page title is rendered in the list view (around line 414-417). Import `SectionAdminBar`.

**Step 2: Add SectionAdminBar below the title**

```tsx
<h1 className="page-title">{section.title}</h1>
<SectionAdminBar sectionId={section.id} />
```

Also add it to the static-page view, below the page title.

**Step 3: Simplify admin checks in the catch-all route**

The catch-all route currently does manual admin checks before passing `onEdit` callbacks to detail components. With `AdminEditButton` handling the gate internally, the detail view callers can always pass `onEdit` regardless of role — the button self-hides for non-admins.

Review each detail view (StoryDetail, ProjectDetail, PhotoEssayPage) call site. If the only reason for the admin check is to conditionally pass `onEdit`, simplify: always pass `onEdit`. The admin check at the call site is now redundant (but harmless to keep for the first pass — removing it is a cleanup, not a requirement).

**Step 4: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 5: Commit**

```bash
git add frontend/src/pages/[...slugPath].tsx
git commit -m "feat: wire SectionAdminBar into section list and static page views"
```

---

### Task 8: Format, test, QA

**Step 1: Run formatting and tests**

```bash
make format
make test-frontend-unit
make test
```

**Step 2: Start dev environment and QA**

```bash
make dev-local
```

Navigate the public site as admin. Verify:
- StoryCard: edit button and draft badge still work (no regression)
- ProjectCard: edit button visible for admins, navigates to editor, draft badge shows for unpublished
- PhotoEssayCard: edit button visible for admins, draft badge shows for unpublished
- StoryDetail: edit button renders with template styling
- ProjectDetail: edit button renders with template styling
- PhotoEssayPage: edit button renders with template styling
- Section list views: "Add Content" and "Manage Section" buttons appear below title for admins
- Static pages: same admin bar appears
- Non-admin view: none of the above buttons or badges appear
- Mobile: admin buttons don't break layout

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address phase 6 QA issues"
```

---

### Task 9: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/125_editor-command-center-phase6
```

**Step 2: Create draft PR**

```bash
gh pr create --draft \
  --title "feat: inline admin affordances across all content types (Phase 6)" \
  --body "$(cat <<'EOF'
## Summary
- AdminEditButton: self-gating, template-styled edit button extracted as shared component
- AdminDraftBadge: self-gating draft indicator for unpublished content
- ProjectCard: now shows edit button and draft badge for admins
- PhotoEssayCard: now shows edit button and draft badge for admins
- Detail pages (Story, Project, PhotoEssay): standardized edit buttons using AdminEditButton
- SectionAdminBar: "Add Content" and "Manage Section" buttons on section list views
- All admin affordances use template CSS classes (not shadcn) to respect active theme
- All admin affordances self-gate on admin role — render nothing for non-admins

## Test plan
- [ ] ProjectCard shows edit button for admin, hidden for non-admin
- [ ] ProjectCard shows draft badge for unpublished projects
- [ ] PhotoEssayCard shows edit button for admin, hidden for non-admin
- [ ] PhotoEssayCard shows draft badge for unpublished essays
- [ ] StoryCard edit button still works (no regression)
- [ ] Detail pages render edit buttons with template styling
- [ ] Section list views show "Add Content" + "Manage Section" for admin
- [ ] "Add Content" navigates to editor with section_id
- [ ] "Manage Section" navigates to command center with section selected
- [ ] Static pages show admin bar
- [ ] Non-admin users see no admin controls
- [ ] Mobile layout not broken by admin controls
EOF
)"
```
