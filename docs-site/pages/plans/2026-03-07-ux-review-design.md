# UX Review: Field Notes

**Date:** 2026-03-07
**Scope:** Full usability and experience audit of the Field Notes frontend
**Method:** Component-level code review against usability heuristics, accessibility standards, and content site best practices

---

## Priority Definitions

- **P0 — Broken:** Functionality that fails, blocks users, or violates accessibility requirements
- **P1 — Painful:** Usable but creates friction, confusion, or lost work
- **P2 — Weak:** Functional but below expectations for a content-focused site
- **P3 — Polish:** Refinements that elevate the experience from adequate to good

---

## 1. Navigation & Information Architecture

### P0

**#6 — No home link or site identity in nav.**
TopNav has no logo, title, or root link. Users on any subpage cannot navigate to the home page. `site.config.json` defines `title` and `tagline` but neither navigation component references them. This is the most fundamental navigation failure — every page is a dead end with respect to the site root.

**#33 — Bottom nav has no home item.**
The bottom nav is the primary navigation surface on mobile. It renders only API-returned sections. If no section routes to `/`, mobile users have no path home.

**#7 — Mobile hamburger menu empty for non-admins.**
The hamburger button in TopNav is always visible on mobile. For non-admin users it opens an empty dropdown. A button that produces no result is a broken interaction.

### P1

**#3 — Footer pointer-events-none blocks link clicks.**
The footer uses `pointer-events: none` with `z-index: 55` to allow content to scroll behind it. Footer links (Privacy, Terms) become unclickable when content overlaps. The workaround defeats the footer's purpose.

**#2 — No breadcrumbs on detail pages.**
The catch-all route `/section-slug/item-slug` drops users into content with no visible path back to the parent section. Navigation back requires the browser back button or finding the section in the nav bar.

**#1 — Bottom nav duplicates top nav inconsistently.**
Desktop gets section links in TopNav. Mobile gets them in BottomNav. Admin links (New, Sections) only appear in TopNav's hamburger. Navigation is split across two surfaces with different content, forcing users to check both.

### P2

**#5 — No search.**
A content site with stories, projects, and pages across multiple sections has no way to find content except browsing by section. As content volume grows, this becomes increasingly painful.

**#4 — Home page hero is hardcoded.**
The hero section (title + tagline) is baked into the index page component rather than driven by `site.config.json` or the template system. Limits reusability and template flexibility.

### Recommendations

1. Add a site title/logo to TopNav that links to `/`. Source from `site.config.json`.
2. Add a home item to BottomNav (either a dedicated home icon or make the site title tappable).
3. Hide the hamburger button when the mobile menu would be empty.
4. Fix the footer z-index/pointer-events issue — either raise footer above content properly or restructure the layout so the footer doesn't need the hack.
5. Add breadcrumbs to detail pages: `Section > Item Title`.
6. Consolidate navigation: admin links should be accessible from the same surface as section links on both breakpoints.
7. Plan for search as content volume grows — even a simple client-side filter would help.

---

## 2. Content Presentation & Reading Experience

### P1

**#10 — Story excerpts are uncontrolled.**
Story cards display content without an explicit excerpt field. Long first paragraphs create inconsistent card heights across the feed. No truncation strategy visible in the StoryCard component.

**#9 — Infinite scroll with no fallback navigation.**
The feed uses `react-infinite-scroll-component` with no pagination alternative. Users cannot jump to older content, bookmark a position, or recover their place after navigating away. No "back to top" button.

**#11 — Card grid loads everything at once.**
`CardGridDisplay` fetches all items without pagination or lazy loading. Sections with many projects send a single large payload with no progressive rendering.

### P2

**#8 — No visual hierarchy on home page.**
The index page renders a flat `StoryList` where every story gets equal visual weight. No featured/pinned content, no distinction between recent and older posts.

**#12 — Reading progress bar defined but not wired up.**
The template CSS defines `.story__progress-bar` but no component implements it. A reading progress indicator is expected on long-form content pages.

**#14 — No estimated reading time.**
Standard on content sites, absent here. Computable from word count at render time.

**#15 — Date display lacks relative time.**
Dates render as absolute timestamps only. Relative time ("3 days ago") is more scannable in feed contexts.

### P3

**#13 — Prose styling is functional but flat.**
Body text, headings, blockquotes, code blocks — and nothing else. No drop caps, pull quotes, or typographic flourish. For a content-focused site, the reading experience is utilitarian.

### Recommendations

1. Add an explicit `excerpt` field to stories (or auto-generate from first N characters) and enforce consistent card height via CSS truncation.
2. Add pagination controls alongside infinite scroll — page numbers or "load more" button as a fallback.
3. Paginate or lazy-load `CardGridDisplay`.
4. Support pinning or featuring content on the home page (a `featured` flag on stories, surface the first one differently).
5. Wire up the reading progress bar on `StoryDetail`.
6. Add reading time estimate to story cards and detail pages.
7. Add relative date display (keep absolute as tooltip).
8. Introduce richer prose elements as the template matures.

---

## 3. Editor & Content Creation

### P0

**#17 — No autosave or draft recovery.**
The editor has no periodic save, no `localStorage` backup, and no `beforeunload` warning. A browser crash, accidental navigation, or tab close loses all work in progress.

### P1

**#18 — TipTap toolbar missing common controls.**
The Link extension is loaded but has no toolbar button. Code blocks, horizontal rules, undo/redo, and text alignment are absent. Users must know keyboard shortcuts for anything beyond the visible toolbar.

**#19 — No image management after upload.**
Images upload inline but cannot be resized, captioned, aligned, or given alt text from the editor UI. The Image extension supports responsive attributes but they're set programmatically, not by the user.

**#21 — Delete uses browser `confirm()` only.**
Destructive action guarded by a native dialog with no undo, no soft delete, no trash. One misclick permanently removes content.

### P2

**#16 — Section picker adds a click to every creation flow.**
The "New" button routes to a section picker grid before the editor loads. For a site with 3-4 sections this is unnecessary friction. The TopNav already context-links with `section_id` when a section is active, but only on desktop.

**#20 — No preview mode.**
The TipTap editable view doesn't match the published prose styling. No toggle to see how content will render on the detail page.

**#23 — Publish toggle is a checkbox.**
A checkbox labeled "Publish" doesn't communicate the weight of making content visible to everyone. No confirmation step, no scheduled publishing.

### P3

**#22 — No content versioning or revision history.**
No way to see what changed between edits or revert to a previous version. Low priority now, but becomes painful as content volume and collaboration grow.

### Recommendations

1. Add `beforeunload` handler and `localStorage` draft backup with recovery prompt on editor mount.
2. Add toolbar buttons for links, code blocks, and undo/redo at minimum.
3. Add an image popover or modal for alt text, sizing, and alignment after upload.
4. Replace `confirm()` with a custom confirmation dialog. Consider soft delete (trash with 30-day retention).
5. Skip the section picker when navigating from a section context — pass `section_id` through consistently.
6. Add a preview toggle that renders content with the published prose CSS.
7. Replace the publish checkbox with a more deliberate action (button with confirmation, or a status dropdown).

---

## 4. Error Handling, Loading States & Feedback

### P1

**#28 — No success feedback on save.**
The editor button text changes to "Saving..." during submission and reverts to "Save" on completion. No toast, no visual confirmation. Users infer success from the absence of failure.

**#25 — No offline or network-down handling mid-session.**
If the backend becomes unreachable after initial load, individual API calls fail with per-component error messages. No global network status indicator. The warmup banner only runs on first load.

**#27 — Error toasts auto-dismiss at 5 seconds.**
For error messages, 5 seconds may not be enough to read technical details or decide on an action. Error toasts should persist until the user dismisses them.

### P2

**#24 — Skeleton screens don't match card layout.**
`StoryItemSkeleton` renders generic shimmer bars that don't mirror the actual StoryCard structure (engagement counts, metadata row, action buttons). Content shifts visibly when real data replaces the skeleton.

**#26 — Error display dismissible with no recovery.**
The `ErrorDisplay` component shows a message with an X button. Dismissing it clears the error state but resolves nothing. Feed list views have retry buttons; detail pages and the editor do not.

**#29 — Infinite scroll spinner ambiguous on failure.**
The loading spinner between pagination requests is identical to the initial load spinner. A failed page fetch silently stops the scroll with no error indication.

**#30 — Empty states are generic.**
"No content found" with optional admin CTA. No illustration, no guidance for public users, no indication of what the section is for. An empty section looks broken.

### Recommendations

1. Add a success toast on save/publish/delete operations.
2. Add a global network status listener that shows a persistent banner when the backend is unreachable, with automatic recovery detection.
3. Make error toasts persist until dismissed; keep 5-second auto-dismiss for success/info toasts.
4. Update skeletons to match the actual card structure more closely.
5. Add retry buttons to all error states, not just feed lists.
6. Distinguish "loading more" from "failed to load" in infinite scroll with an error message and retry.
7. Design section-specific empty states with description text and guidance.

---

## 5. Accessibility & Mobile UX

### P0

**#36 — No alt text prompt during image upload.**
The TipTap image upload provides no UI for entering alt text. Images likely render with empty `alt` attributes. WCAG 1.1.1 failure (non-text content).

**#31 — No focus management on route changes.**
Next.js client-side navigation doesn't move focus to the new content. Screen reader users get no feedback after activating a nav link. No skip-to-content link exists.

**#37 — Infinite scroll is a keyboard trap.**
Focus enters the scroll container and new content loads below. Keyboard users cannot skip past the feed to reach the footer or other regions. No landmark regions or skip links provide escape.

### P1

**#35 — Reaction buttons lack accessible labels.**
Emoji buttons display the emoji character as content. Screen reader behavior with emoji is inconsistent across assistive technology. No `aria-label` provides context like "React with thumbs up (3 reactions)".

**#34 — Dark mode contrast unverified.**
Token system defines dark mode colors but contrast ratios against WCAG AA have not been validated. `text-secondary` and `text-tertiary` on dark surfaces are the most likely failures.

**#39 — No reduced motion support.**
Skeleton shimmer animations, hover transitions, and the warmup banner animation all run regardless of `prefers-reduced-motion`. OS-level motion preferences are ignored.

**#40 — Theme toggle doesn't announce state.**
The toggle switches between light and dark with an icon change. No `aria-live` region or status announcement for screen readers.

### P2

**#32 — Mobile hamburger opens empty menu for non-admins (a11y).**
A toggle button that produces no visible or announced result violates user expectations and creates confusion for assistive technology users.

**#38 — Editor toolbar touch targets likely undersized.**
TipTap toolbar buttons on mobile are likely below the 44x44px minimum recommended touch target size. No mobile-specific sizing adjustments in the toolbar CSS.

### Recommendations

1. Add an alt text input to the image upload flow — either inline popover or modal before insertion.
2. Implement focus management on route change: move focus to `<main>` or an `h1` after navigation. Add a skip-to-content link as the first focusable element.
3. Add landmark roles and a skip link that bypasses the infinite scroll feed.
4. Add `aria-label` to all reaction buttons with context: emoji name + count.
5. Audit dark mode palette against WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text/UI).
6. Add `@media (prefers-reduced-motion: reduce)` rules that disable animations and transitions.
7. Add `aria-live="polite"` announcement when theme changes.
8. Hide hamburger button when menu content would be empty.
9. Increase editor toolbar touch targets to minimum 44x44px on mobile.

---

## 6. Visual Design & Template System

### P2

**#43 — Design tokens mixed with hardcoded Tailwind classes.**
Components inconsistently use CSS custom properties (`var(--spacing-md)`) alongside Tailwind utilities (`p-4`). Two spacing/styling systems coexist without a clear boundary, undermining visual consistency.

**#44 — No consistent whitespace rhythm.**
Gaps between elements vary — some use token spacing, some use Tailwind's scale, some are inline values. The page feels assembled rather than designed.

**#47 — Dark mode is color inversion, not designed.**
The `.dark` selector swaps surface and text colors but doesn't adjust shadows, borders, or visual weight. Shadows on dark backgrounds are invisible. Borders that work on light backgrounds look harsh on dark ones.

**#41 — Template system is CSS-only with no layout variants.**
Templates can change colors, fonts, and component styling, but page structure (TopNav + content + BottomNav + Footer) is hardcoded in `Layout.tsx`. A template cannot rearrange layout, add a sidebar, or change the navigation pattern.

**#45 — Cards lack visual weight differentiation.**
Story cards and project cards have similar visual treatment — bordered rectangles with text. No imagery on story cards, no visual hook to differentiate content types or draw the eye. The feed is a wall of text rectangles.

**#46 — Typographic scale ratios appear arbitrary.**
Font sizes are defined with `clamp()` but the ratio between sizes doesn't follow a modular scale (major third, perfect fourth, etc.). Heading hierarchy doesn't produce a clear visual cascade.

### P3

**#42 — No template preview or switching UI.**
Changing templates requires editing `_app.tsx` imports and redeploying. No runtime selector, no admin UI. The "swappable" promise is developer-only.

**#48 — No microinteractions or delight.**
Hover states exist (color swap, shadow lift) but there's no animation personality. No content reveal on load, no state change transitions, no subtle motion to suggest a living interface. Functional but inert.

### Recommendations

1. Choose one system — either CSS custom properties as the source of truth with Tailwind as utility-only, or Tailwind with token values mapped into its config. Eliminate the dual system.
2. Define a spacing scale and apply it consistently across all page regions and component gaps.
3. Design dark mode intentionally: soften borders, adjust shadow colors (lighter, more diffuse), reconsider visual weight of UI elements.
4. Consider template "slots" or layout variant support — even 2-3 layout options (centered, sidebar, full-width) would expand template capability meaningfully.
5. Add cover images or lead images to story cards to break up the text wall.
6. Adopt a modular typographic scale and apply it to the heading hierarchy.
7. Add subtle transitions on page/content load and state changes as the design matures.

---

## Implementation Priority

Sequenced by impact and dependency. Items within a tier can be parallelized.

### Tier 1 — Fix what's broken

| # | Issue | Area |
|---|-------|------|
| 6 | Add home link/site identity to nav | Navigation |
| 33 | Add home item to bottom nav | Navigation |
| 7/32 | Hide hamburger when menu is empty | Navigation |
| 17 | Add autosave + draft recovery to editor | Editor |
| 36 | Add alt text prompt to image upload | Accessibility |
| 31 | Focus management on route changes + skip link | Accessibility |
| 37 | Skip link past infinite scroll + landmark roles | Accessibility |
| 3 | Fix footer pointer-events blocking clicks | Navigation |

### Tier 2 — Reduce friction

| # | Issue | Area |
|---|-------|------|
| 28 | Add success feedback on save | Feedback |
| 25 | Global network status indicator | Feedback |
| 27 | Error toasts persist until dismissed | Feedback |
| 18 | Add missing toolbar buttons (link, code, undo/redo) | Editor |
| 10 | Controlled excerpts on story cards | Content |
| 35 | Accessible labels on reaction buttons | Accessibility |
| 34 | Audit dark mode contrast ratios | Accessibility |
| 39 | Reduced motion support | Accessibility |
| 19 | Image alt text, resize, caption in editor | Editor |
| 21 | Replace confirm() with custom dialog | Editor |

### Tier 3 — Improve the experience

| # | Issue | Area |
|---|-------|------|
| 2 | Breadcrumbs on detail pages | Navigation |
| 1 | Consolidate nav surfaces | Navigation |
| 9 | Pagination fallback for infinite scroll | Content |
| 11 | Paginate card grid | Content |
| 8 | Featured/pinned content on home page | Content |
| 12 | Wire up reading progress bar | Content |
| 14 | Reading time estimate | Content |
| 15 | Relative date display | Content |
| 24 | Skeletons match card layout | Feedback |
| 26 | Retry on all error states | Feedback |
| 30 | Section-specific empty states | Feedback |
| 43 | Resolve token/Tailwind dual system | Design |
| 44 | Consistent spacing rhythm | Design |
| 47 | Intentional dark mode design | Design |
| 40 | Theme toggle announces state | Accessibility |
| 16 | Skip section picker from context | Editor |
| 20 | Preview mode in editor | Editor |
| 23 | Publish action redesign | Editor |

### Tier 4 — Polish and ambition

| # | Issue | Area |
|---|-------|------|
| 5 | Search | Navigation |
| 4 | Template-driven hero | Navigation |
| 13 | Richer prose styling | Content |
| 22 | Content versioning | Editor |
| 29 | Distinguish scroll loading vs failure | Feedback |
| 38 | Editor toolbar touch targets | Accessibility |
| 41 | Template layout variants | Design |
| 42 | Template switching UI | Design |
| 45 | Card visual differentiation | Design |
| 46 | Modular typographic scale | Design |
| 48 | Microinteractions | Design |
