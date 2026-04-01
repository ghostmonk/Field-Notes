# Editor Command Center — Phase 7: Polish, Consolidation & Bug Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Phase 6 QA bugs, consolidate admin navigation into the command center, fix the assets tab crash, and remove redundant nav links. This is the final phase of issue #125.

**Architecture:** Bug fixes first, then nav consolidation. The hamburger menu's admin section gets replaced with a single "Command Center" link. Resume builder/tailor become tabs in the command center rather than standalone pages. Assets fetching switches from fire-all-at-once to sequential batching.

**Tech Stack:** React, Next.js, NextAuth.js (`useSession`), template CSS classes, shadcn/ui (command center only)

---

### Task 1: Hide SectionAdminBar on mobile

**Files:**
- Modify: `frontend/src/components/SectionAdminBar.tsx`

The SectionAdminBar renders "Add Content" and "Manage Section" on section list views. "Manage Section" links to `/admin` which is desktop-only (gated by `AdminDesktopGate`). Showing it on mobile sends users to a dead end.

**Step 1: Add hidden class for mobile**

Add `hidden md:flex` to the wrapper div so it only renders at 768px+. The current class is `flex gap-2 mb-md`.

```tsx
<div className="hidden md:flex gap-2 mb-md" data-testid="section-admin-bar">
```

**Step 2: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 3: Commit**

```bash
git add frontend/src/components/SectionAdminBar.tsx
git commit -m "fix: hide SectionAdminBar on mobile viewports"
```

---

### Task 2: Fix static page edit button positioning

**Files:**
- Modify: `frontend/src/pages/[...slugPath].tsx`

The AdminEditButton for static pages renders after the page content with no container, so it appears flush-left outside the content area. It should render inside the page content area, right-aligned, before the contact form (if present).

**Step 1: Read the static page view in `[...slugPath].tsx`**

Find the `view === 'static-page'` block. The `StaticDisplay` component renders the page content. The `AdminEditButton` should be wrapped in a container matching the page layout.

**Step 2: Wrap AdminEditButton in a page-container div**

```tsx
<StaticDisplay content={pageContent.content} title={pageContent.title} />
<div className="page-container flex justify-end mt-4">
    <AdminEditButton
        onClick={() => router.push({ pathname: '/editor', query: { section_id: section.id } })}
        data-testid="page-edit-button"
    />
</div>
```

The empty div renders for non-admins with zero height (no visible impact). This is acceptable — the alternative (adding admin state back to the component) defeats the self-gating purpose of AdminEditButton.

**Step 3: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/src/pages/\\[...slugPath\\].tsx
git commit -m "fix: wrap static page edit button in page-container for correct alignment"
```

---

### Task 3: Fix draft badge showing on published projects in command center

**Files:**
- Modify: `frontend/src/modules/admin/components/ContentTable.tsx` (or wherever the content table renders status badges)

The content table in the command center shows draft badges on published projects. This is likely a different badge component than `AdminDraftBadge` (which is for the public site). The command center uses shadcn Badge, not template CSS.

**Step 1: Read the content table component**

Find the file rendering the content list in the admin detail panel. Look at how `is_published` is read from the data and how the badge is rendered. The bug is likely one of:
- The `is_published` field is not being passed correctly from the API response
- The badge condition is inverted (`is_published` instead of `!is_published`)
- The unified `ContentRow` type doesn't map `is_published` correctly for projects

**Step 2: Fix the condition**

Ensure the draft badge only shows when `is_published === false`. Trace the data from the API response through the `ContentRow` mapping to the badge render.

**Step 3: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add frontend/src/modules/admin/
git commit -m "fix: draft badge only shows for unpublished content in command center"
```

---

### Task 4: Fix ProjectCard admin actions alignment

**Files:**
- Modify: `frontend/src/templates/default/styles/components.css`
- Possibly modify: `frontend/src/modules/projects/components/ProjectCard.tsx`

The edit button and draft badge on ProjectCard are misaligned. The `card__admin-actions` class uses `position: absolute; top: 0; right: 0` which positions relative to the `.card` element (which now has `position: relative` from the Phase 6 review fix). The padding of `.card` (`padding: var(--space-xl)`) means top:0/right:0 places the actions at the card edge, overlapping the border/padding.

**Step 1: Adjust positioning to respect card padding**

Update `.card__admin-actions` to use the card's padding value for offset:

```css
.card__admin-actions {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  display: flex;
  gap: var(--space-sm);
}
```

This aligns the actions inside the card's padded content area, matching how `story-header__actions` is positioned relative to `.story-header`.

**Step 2: Verify in browser**

Start dev environment and check ProjectCard alignment for both published (edit button only) and unpublished (edit button + draft badge) projects.

**Step 3: Commit**

```bash
git add frontend/src/templates/default/styles/components.css
git commit -m "fix: align ProjectCard admin actions inside card padding"
```

---

### Task 5: Fix assets tab — batch photo essay fetches

**Files:**
- Modify: `frontend/src/modules/admin/hooks/useSectionAssets.ts`

The `fetchPhotoEssayAssets` function fires `Promise.all` on every essay's detail fetch simultaneously (line 79-81). With many essays, this hammers the backend with N concurrent requests, crashing the service.

**Step 1: Replace Promise.all with sequential batching**

Replace the parallel fetch with a batch-of-3 approach:

```typescript
async function fetchPhotoEssayAssets(
  sectionId: string
): Promise<AssetInfo[]> {
  const listResponse = await apiClient.photoEssays.list({
    section_id: sectionId,
    limit: 50,
    offset: 0,
  });

  const assets: AssetInfo[] = [];

  for (const card of listResponse.items) {
    if (card.cover_image_url) {
      assets.push({
        url: card.cover_image_url,
        type: "image",
        fromContentTitle: card.title,
      });
    }
  }

  // Fetch essay details in batches of 3 to avoid overwhelming the backend
  const BATCH_SIZE = 3;
  for (let i = 0; i < listResponse.items.length; i += BATCH_SIZE) {
    const batch = listResponse.items.slice(i, i + BATCH_SIZE);
    const details = await Promise.all(
      batch.map((card) => apiClient.photoEssays.getById(card.id))
    );
    for (const essay of details) {
      for (const photo of essay.photos) {
        assets.push({
          url: photo.url,
          type: "image",
          fromContentTitle: essay.title,
        });
      }
    }
  }

  return assets;
}
```

**Step 2: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/modules/admin/hooks/useSectionAssets.ts
git commit -m "fix: batch photo essay detail fetches to prevent service crash"
```

---

### Task 6: Consolidate admin hamburger menu links

**Files:**
- Modify: `frontend/src/layout/HamburgerMenu.tsx`

Replace the three admin links ("New", "Sections", "Resume Tailor") with a single "Command Center" link pointing to `/admin`. All three functions are accessible from the command center:
- "New" → command center context menu "Add Content"
- "Sections" → command center sidebar (section tree)
- "Resume Tailor" → will become a command center tab (Task 7)

**Step 1: Replace admin links block**

Find the admin group (lines 130-163). Replace the three links with one:

```tsx
{session?.user?.role === "admin" && (
    <div className="menu-overlay__group">
        <h2 className="menu-overlay__heading">Admin</h2>
        <div className="menu-overlay__links">
            <Link
                href="/admin"
                className="menu-overlay__link"
                data-testid="nav-command-center-link"
                onClick={close}
            >
                <HiCog className="menu-overlay__link-icon" aria-hidden="true" />
                <span>Command Center</span>
            </Link>
        </div>
    </div>
)}
```

Remove the `HiPlusSm` and `HiDocumentText` imports if no longer used elsewhere in the file. Keep `HiCog`.

**Step 2: Update e2e test data if any tests reference `nav-new-content-link`, `nav-sections-link`, or `nav-tailor-link`**

Search for these test IDs in the e2e specs and update them to `nav-command-center-link`.

**Step 3: Run type check, lint, and unit tests**

```bash
cd frontend && npx tsc --noEmit && npm run lint
make test-frontend-unit
```

**Step 4: Commit**

```bash
git add frontend/src/layout/HamburgerMenu.tsx
git commit -m "feat: consolidate admin menu into single Command Center link"
```

---

### Task 7: Add Resume Tailor as a command center tab

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`
- Modify: `frontend/src/modules/admin/components/AdminLayout.tsx` (if tab state is managed here)
- Possibly create: `frontend/src/modules/admin/components/ResumeTailorTab.tsx`

The resume tailor functionality currently lives at `/admin/tailor` as a standalone page with three sub-tabs (Tailor, Applications, Voice). Move it into the command center as a fourth top-level tab, visible when no section is selected (or always visible as a global tool).

**Step 1: Read the current AdminDetailPanel tab structure**

Understand how tabs are managed (likely shadcn Tabs component). Read the existing Content, Assets, and Settings tabs.

**Step 2: Read the resume tailor page**

Read `frontend/src/pages/admin/tailor.tsx` to understand its components and state. The goal is to extract the content into a tab-compatible component, not to rewrite it.

**Step 3: Create ResumeTailorTab wrapper**

Create a component that wraps the resume tailor page content for embedding in the command center's tab panel. Import the existing tailor components (TailorTab, ApplicationsTab, VoiceTab) and render them with their existing sub-tab navigation.

```tsx
// frontend/src/modules/admin/components/ResumeTailorTab.tsx
// Wrapper that embeds the resume tailor UI into the command center
```

**Step 4: Add the tab to AdminDetailPanel**

Add a "Resume" tab to the shadcn Tabs component. This tab should be available regardless of which section is selected (it's a global tool, not section-specific).

**Step 5: Run type check, lint, and tests**

```bash
cd frontend && npx tsc --noEmit && npm run lint
make test-frontend-unit
```

**Step 6: Commit**

```bash
git add frontend/src/modules/admin/components/
git commit -m "feat: add Resume Tailor as command center tab"
```

---

### Task 8: Add Resume Builder as a command center tab

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`
- Possibly create: `frontend/src/modules/admin/components/ResumeBuilderTab.tsx`

Same pattern as Task 7. The resume builder at `/admin/resume` has a form for editing the canonical resume. Move it into the command center as a "Resume Editor" tab next to the "Resume Tailor" tab.

**Step 1: Read `frontend/src/pages/admin/resume.tsx`**

Understand the component structure and state management (uses `useResumeEditor()` hook).

**Step 2: Create ResumeBuilderTab wrapper**

Extract the page content into a tab-compatible component.

**Step 3: Add the tab to AdminDetailPanel**

Group the two resume tabs together, possibly as sub-tabs under a "Resume" parent tab to keep the top-level tab count manageable. The grouping options:
- Option A: Two top-level tabs ("Resume Editor", "Resume Tailor") — simple but crowded
- Option B: One top-level "Resume" tab with sub-tabs ("Editor", "Tailor", "Applications", "Voice") — cleaner

Choose Option B to consolidate. The "Resume" tab contains the sub-tabs from both the builder and tailor pages.

**Step 4: Run type check, lint, and tests**

```bash
cd frontend && npx tsc --noEmit && npm run lint
make test-frontend-unit
```

**Step 5: Commit**

```bash
git add frontend/src/modules/admin/components/
git commit -m "feat: add Resume Builder as command center tab, group resume tools"
```

---

### Task 9: Remove standalone resume pages and legacy sections page

**Files:**
- Delete or redirect: `frontend/src/pages/admin/tailor.tsx`
- Delete or redirect: `frontend/src/pages/admin/resume.tsx`
- Delete or redirect: `frontend/src/pages/admin/sections.tsx`

These pages are now redundant — their functionality lives in the command center. Replace each with a redirect to `/admin`.

**Step 1: Replace each page with a redirect**

```tsx
// frontend/src/pages/admin/tailor.tsx
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/admin', permanent: true },
});

export default function TailorRedirect() { return null; }
```

Apply the same pattern to `resume.tsx` and `sections.tsx`.

**Step 2: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/pages/admin/
git commit -m "feat: redirect legacy admin pages to command center"
```

---

### Task 10: Format, test, QA

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

Verify:
- SectionAdminBar hidden on mobile viewport
- Static page edit button is right-aligned inside content area
- Command center: published projects show no draft badge, unpublished show draft badge
- ProjectCard: edit button and draft badge cleanly aligned
- Assets tab: selecting a photo essay section loads assets without crashing
- Hamburger menu: single "Command Center" link, no "New"/"Sections"/"Resume Tailor"
- Command center: Resume tab with sub-tabs (Editor, Tailor, Applications, Voice)
- `/admin/tailor`, `/admin/resume`, `/admin/sections` all redirect to `/admin`
- Non-admin: no command center link in menu, no admin controls visible

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address phase 7 QA issues"
```

---

### Task 11: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/125_editor-command-center-phase7
```

**Step 2: Create draft PR**

```bash
gh pr create --draft \
  --title "feat: editor command center polish and consolidation (Phase 7)" \
  --body "$(cat <<'EOF'
## Summary
- Fix SectionAdminBar showing on mobile (hidden below 768px)
- Fix static page edit button alignment (wrapped in page-container)
- Fix draft badge showing on published projects in command center
- Fix ProjectCard admin actions alignment (respect card padding)
- Fix assets tab crash: batch photo essay detail fetches (3 at a time)
- Consolidate hamburger menu admin links into single "Command Center" link
- Move Resume Tailor and Resume Builder into command center as tabs
- Redirect legacy admin pages (/admin/tailor, /admin/resume, /admin/sections) to /admin

Closes #125

## Test plan
- [ ] SectionAdminBar hidden on mobile
- [ ] Static page edit button right-aligned in content area
- [ ] Published projects show no draft badge in command center
- [ ] ProjectCard admin actions cleanly aligned
- [ ] Assets tab loads without crashing on photo essay sections
- [ ] Hamburger menu shows only "Command Center" link for admins
- [ ] Resume tab in command center with Editor/Tailor/Applications/Voice sub-tabs
- [ ] /admin/tailor, /admin/resume, /admin/sections redirect to /admin
- [ ] Non-admin users see no admin controls
EOF
)"
```
