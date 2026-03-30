# Editor Command Center Design

## Problem

The editor system works but lacks a management layer. There's no way to see content across sections, no explicit hierarchy view, and admin workflows require navigating to individual content pages to edit. The admin sections page (`/admin/sections`) is a flat list with no structural awareness.

Issue #125 — design and implement proper editor functionality.

## System Structure

Two admin interfaces, one shared backend:

**Desktop Command Center** (`/admin`) — Full-screen, desktop-only. Tree sidebar showing the complete section hierarchy. Detail panel showing content, assets, and settings for the selected section. Root state is a site dashboard. This is where site structure, tag organization, and site-level management happens.

**Inline Admin Affordances** — Contextual edit/add buttons on the public site when authenticated as admin. Consistent across all content types and display types. This is the primary mobile creation path: navigate to the section, hit "Add", choose content or child section. No separate mobile route needed.

The editor forms (StoryEditorForm, ProjectEditorForm, PageEditorForm) are shared between both entry points. The command center is a navigation and management layer on top of the existing editor infrastructure.

## Desktop vs Mobile Philosophy

Desktop is the control plane — site structure, hierarchy management, bulk operations, metrics. Mobile is the field kit — navigate to a section, add photos, write articles, collect content. The same forms serve both; only the navigation layer differs.

## Desktop Command Center

### Tree Sidebar (Left Panel)

Renders the full section hierarchy using the existing parent/child model with materialized paths.

- **Tree nodes**: Section title, icon, content item count badge
- **Collapsed by default** beyond first level, expand/collapse with chevron
- **Drag-and-drop**: Reorder within a level (updates `sort_order`) and reparent (moves under a different parent). Backend already supports reparenting with cycle detection and cascading path updates.
- **Right-click context menu**: Edit settings, Add content, Add child section, Delete
- **Search/filter input** at top of sidebar narrows tree to matching titles
- **"Add section" button** at bottom for root-level sections
- **URL-synced selection**: `/admin?section=section-id` so links to specific sections are shareable
- **Desktop-only gate**: Below 1024px, show a message directing to desktop. The public site with inline buttons handles mobile.

### Detail Panel — Root/No Selection (Site Dashboard)

- Content stats: totals by type, published vs drafts, recently updated
- Site-wide tag list with usage counts, clickable to see tagged content
- Quick actions: "Add root section"
- Extensibility surface for future metrics, analytics, deployment status

### Detail Panel — Section Selected (Tabbed)

**Content tab** (default):
- Table of all content items in the section
- Columns: title, status badge (draft/published), last updated, actions (edit, publish/unpublish toggle, delete)
- Sortable by any column
- Child sections appear in the list with a "section" type badge — complete view of everything under this node
- "Add content" and "Add section" buttons at top

**Assets tab**:
- Grid of images and videos referenced by content in the section
- Thumbnails with filename, dimensions, which content item references them
- Read-only for now — audit and reuse surface

**Settings tab**:
- Section configuration form: title, slug (editable, generates redirect), nav_visibility, icon picker, display_type, content_type (locked after creation), sort_order, published toggle
- Built with shadcn form components

## Inline Admin Affordances

Contextual buttons on the public site for admins. These use the active template's CSS classes, not shadcn.

**Section header area**: "Add" button with popover — two options:
- "Add content" — opens editor with section pre-selected
- "Add section" — opens shadcn dialog with title, content_type, display_type fields. New section is automatically a child of the current one.

**Content items in listings** (FeedDisplay, CardGridDisplay): Edit icon button on every item, consistent top-right placement. Currently StoryCard has this, ProjectCard doesn't. Standardize across all types. Draft badge visible for admins on all types.

**Content detail pages** (StoryDetail, ProjectDetail, static pages): Edit button in consistent top-right position. Currently exists but placement and styling vary. Standardize: same component, same behavior.

## UI Framework

**shadcn/ui** for the command center only. Already on Tailwind, shadcn provides Radix primitives with composable patterns — tree view, dialogs, popovers, tabs, context menus, drag handles.

Clean boundary: shadcn styles the admin command center, the template system styles the public site. No conflict.

Components needed: tree, tabs, dialog, popover, context-menu, button, input, badge, table, dropdown-menu.

Inline admin buttons on the public site do NOT use shadcn — they respect the active template's visual language.

## Editor Form Adjustments

Forms stay functionally the same. Changes:

- **Back navigation**: `origin` query param so the editor knows whether to return to the command center or the section page
- **PageEditorForm**: Add draft/publish toggle (backend supports `is_published`, form currently always saves as published)
- **Character count indicators**: Subtle counters near fields with backend limits (title: 200, summary: 500, content: 10k/50k). Red when approaching limit. Not blocking.

## Implementation Phases

Each phase is a standalone PR.

1. **Shadcn setup + Command Center shell** — Install shadcn, configure for `/admin`. Build layout: tree sidebar, detail panel with tab structure, desktop-only gate. No live data.

2. **Tree sidebar with live data** — Fetch section hierarchy, render tree with expand/collapse, selection, count badges. Drag-and-drop reorder/reparent. Context menu. URL-synced selection.

3. **Detail panel: Content tab** — Content list for selected section. Table with status, sort, inline actions. Add content/section popovers. Child sections in list.

4. **Detail panel: Settings + Assets tabs** — Section settings form. Assets grid.

5. **Site dashboard (root view)** — Stats, tag management, quick actions.

6. **Inline admin affordances** — Standardize edit buttons across all content/display types. Add popover to section headers. Consistent placement, template-aware styling.

7. **Editor form adjustments** — Back-navigation origin param. Page form publish toggle. Character count indicators.
