# Ghostmonk.com Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current default template with the "dark precision" design direction — near-black background, emerald accent, Space Grotesk + Instrument Serif + JetBrains Mono typography, Perlin noise flow field with flocking particles, ruler ticks, engineering grid, identity-cycling hero, photography-first content, and section page designs for article, gallery, feed, and project detail views.

**Architecture:** New template `ghostmonk` under `frontend/src/templates/ghostmonk/` following the existing template CONTRACT.md. The flow field canvas is a standalone React component. Layout components (TopNav, Footer, Layout) consume CSS variables — their structure stays the same, but their visual treatment changes entirely through the new template's CSS. The homepage (`index.tsx`) gets a new compositional layout. No backend changes required.

**Tech Stack:** Next.js Pages Router, CSS custom properties, Canvas API (Perlin noise + boid flocking), React components, TypeScript

**Design Reference:** Artifact at https://claude.ai/artifact/Gxg3y6LWzFqKYuptm88NTx — the living mockup with all design decisions, flow field tuning panel, and section page designs.

---

## Phase 1: New Template — CSS Foundation

Create the `ghostmonk` template with all required CSS custom properties and component classes per CONTRACT.md, mapped to the design mockup's visual language.

### Task 1: Create template directory and tokens.css

**Files:**
- Create: `frontend/src/templates/ghostmonk/index.css`
- Create: `frontend/src/templates/ghostmonk/styles/tokens.css`

**Step 1: Create tokens.css**

Map the mockup's design tokens to CONTRACT.md required properties:

| Mockup Token | CONTRACT Property | Dark Value | Light Value |
|---|---|---|---|
| `--bg` | `--color-surface-primary` | `#0a0a0c` | `#f0ede8` |
| `--bg-raised` | `--color-surface-secondary` | `#111114` | `#e8e5e0` |
| `--bg-card` | `--color-surface-tertiary` | `#16161a` | `#ebe8e2` |
| `--fg` | `--color-text-primary` | `#e0ddd8` | `#1a1815` |
| `--fg-muted` | `--color-text-secondary` | `#8a8580` | `#706b65` |
| `--fg-dim` | `--color-text-tertiary` | `#4a4540` | `#a5a09a` |
| `--accent` | `--color-brand-primary` | `#34d399` (emerald) | `#059669` |
| `--border` | `--color-border-primary` | `#1e1e22` | `#d5d0ca` |

Fonts:
- `--font-family-sans` → `'Space Grotesk', -apple-system, sans-serif`
- `--font-family-serif` → `'Instrument Serif', Georgia, serif`
- `--font-family-mono` → `'JetBrains Mono', monospace`
- `--font-family-heading` → `var(--font-family-sans)` (Space Grotesk for headings)
- `--font-family-body` → `var(--font-family-sans)`

Dark mode is the default (`:root`). Light overrides under `.dark` inverted — the current template uses `.dark` class for dark mode via `next-themes`. Follow the same pattern but with dark as base values.

**Important:** The existing theme system uses a `.dark` class toggle, NOT `prefers-color-scheme` media queries at the template level. The mockup uses media queries; the implementation must use `.dark` class to match the existing `ThemeToggle` and `applyTheme()` infrastructure. Dark values go on `:root`, light values go on `:root:not(.dark)` or override via specificity.

**Step 2: Create index.css entry point**

```css
@import './styles/tokens.css';
@import './styles/typography.css';
@import './styles/layout.css';
@import './styles/components.css';
```

**Step 3: Verify all required CONTRACT.md properties exist**

Cross-check every property listed in CONTRACT.md against the new tokens.css. Missing properties get sensible defaults derived from the design system.

**Step 4: Commit**

```bash
git add frontend/src/templates/ghostmonk/
git commit -m "feat: create ghostmonk template tokens and entry point"
```

---

### Task 2: Create typography.css

**Files:**
- Create: `frontend/src/templates/ghostmonk/styles/typography.css`

Map the mockup's type scale. The mockup uses:
- Headlines: Space Grotesk 700, sizes from 14px labels to 48px hero
- Article titles: Instrument Serif 400 (italic available)
- Body: Space Grotesk 400, 15px/1.6
- Mono: JetBrains Mono for labels, coordinates, metadata
- Uppercase tracking on section labels: `letter-spacing: 0.12em`

Use `clamp()` for responsive sizing, matching the scale ratios in the mockup.

**Step 1: Write typography.css**

Define heading styles (h1-h6), body defaults, `.prose` reading styles with `max-width: 60ch`, blockquote styles (left border in accent color, Instrument Serif italic).

**Step 2: Commit**

```bash
git add frontend/src/templates/ghostmonk/styles/typography.css
git commit -m "feat: add ghostmonk template typography"
```

---

### Task 3: Create layout.css

**Files:**
- Create: `frontend/src/templates/ghostmonk/styles/layout.css`

Layout dimensions from the mockup:
- `--layout-container-max-width`: `1100px`
- `--layout-nav-height`: ~50px (compact nav with backdrop blur)
- `--layout-content-padding`: `24px` (left padding for ruler clearance)
- `--layout-page-content-max-width`: `680px` (article reading width)

**Step 1: Write layout.css**

**Step 2: Commit**

```bash
git add frontend/src/templates/ghostmonk/styles/layout.css
git commit -m "feat: add ghostmonk template layout"
```

---

### Task 4: Create components.css

**Files:**
- Create: `frontend/src/templates/ghostmonk/styles/components.css`

This is the largest file. Every class listed in CONTRACT.md must be defined. Key design changes from the mockup:

**Navigation (`.nav`, `.nav__container`, `.nav__link--home`):**
- Sticky, backdrop-blur, semi-transparent `--color-surface-primary` at 85% opacity
- Border-bottom in `--color-border-primary`
- Mono font for nav links, skull icon for home

**Cards (`.card`, `.card--hoverable`):**
- Background `--color-surface-tertiary`, 1px border, 4px radius
- No shadows — flat with border, matching mockup's `.bg-card` treatment
- Hover: subtle border color shift to accent

**Hero (`.hero`, `.hero__title`, `.hero__subtitle`):**
- Left-aligned (not centered like current)
- Title in Space Grotesk 700, subtitle in muted
- Space for identity cycling text below

**Story (`.story-header`, `.story-title`, `.story-content`):**
- Story title in Instrument Serif (not heading font)
- Metadata line in mono, dim color, with reading time
- Reading progress bar in accent color

**Footer (`.site-footer` etc.):**
- Minimal, mono font, single-line copyright + links
- No grid columns — horizontal layout

**Buttons (`.btn` variants):**
- Primary: emerald fill
- Secondary: border only, no fill
- Small, squared-off (2px radius), mono font labels

**Hamburger menu:**
- Dark overlay, mono font links, accent color for active

**Grid and gallery:**
- `.gallery-landing` needs masonry-like treatment matching the photography section mockup
- `.grid--responsive` tighter gaps (4px between photo cells)

**Step 1: Write all required component classes**

Port every class from the current `default/styles/components.css` (2577 lines), restyling each to match the mockup. Do NOT delete classes — other templates need them. The new file is independent.

**Step 2: Test class coverage**

Grep the codebase for every class referenced in React components. Verify each has a definition in the new components.css.

```bash
grep -rh 'className=' frontend/src/ | grep -oP '(?<=className=")[^"]+' | tr ' ' '\n' | sort -u
```

**Step 3: Commit**

```bash
git add frontend/src/templates/ghostmonk/styles/components.css
git commit -m "feat: add ghostmonk template component styles"
```

---

### Task 5: Wire up the new template

**Files:**
- Modify: `frontend/src/pages/_app.tsx` — change CSS import
- Modify: `frontend/site.config.json` — set `template.active` to `"ghostmonk"`
- Modify: `frontend/site.config.json` — update `fonts` to Space Grotesk, Instrument Serif, JetBrains Mono
- Modify: `frontend/src/pages/_document.tsx` — update FOUC background to `#0a0a0c`, add Google Fonts link for new fonts

**Step 1: Update _app.tsx import**

```tsx
import '../templates/ghostmonk/index.css';
```

**Step 2: Update site.config.json**

```json
{
  "template": { "active": "ghostmonk" },
  "fonts": {
    "heading": "Space Grotesk",
    "body": "Space Grotesk",
    "serif": "Instrument Serif",
    "mono": "JetBrains Mono"
  }
}
```

**Step 3: Update _document.tsx FOUC color to #0a0a0c**

**Step 4: Run `make dev-local`, verify site loads with new template**

Check: nav renders, cards render, dark/light toggle works, no unstyled elements.

**Step 5: Commit**

```bash
git add frontend/src/pages/_app.tsx frontend/site.config.json frontend/src/pages/_document.tsx
git commit -m "feat: switch active template to ghostmonk"
```

---

### Review Finding: FOUC blocking script (Phase 2)

Light-mode users see a dark flash on every page load because `_document.tsx` sends `className="dark"` and a dark inline background on `<Html>`. A blocking `<script>` in `<Head>` should read localStorage theme preference and set the class + background before first paint (same pattern next-themes uses). Implement when the theme toggle ships in Phase 2.

---

## Phase 2: Homepage / Landing Page

The current homepage is a simple story feed. The mockup has a compositional layout: hero with identity cycling, photography strip, featured story, recent writing, project cards, GitHub heatmap. This is what users see first — build it before the decorative background effects.

### Task 6: Create homepage hero section

**Files:**
- Modify: `frontend/src/pages/index.tsx`
- Create: `frontend/src/components/IdentityHero.tsx`

The hero from the mockup:
- "Nicholas Hillier" in large Space Grotesk
- Subtitle cycles through identity facets with a highlighted tag
- Role ticker showing all facets
- Section header with coordinates annotation

**Step 1: Create IdentityHero component**

- Cycling text with `setInterval` rotating through roles
- Tags for each facet, active one highlighted in accent
- Mono coordinate annotations on section headers

**Step 2: Replace current hero in index.tsx**

Remove the simple `hero__subtitle` tagline. Replace with `<IdentityHero />`.

**Step 3: Verify animation cycles, responsive at mobile**

**Step 4: Commit**

```bash
git add frontend/src/components/IdentityHero.tsx frontend/src/pages/index.tsx
git commit -m "feat: add identity-cycling hero section"
```

---

### Task 7: Create homepage sections layout

**Files:**
- Modify: `frontend/src/pages/index.tsx`

The mockup's homepage has distinct sections below the hero:

1. **Photography strip** — horizontal scroll of recent photos with EXIF metadata overlay
2. **Featured story** — large card with cover image, Instrument Serif title, excerpt
3. **Recent writing** — scannable list (title + date + section, no cards)
4. **Projects** — card grid with status badges and tech stack tags
5. **GitHub contributions** — heatmap component (already referenced in site.config.json)

Each section has a header with:
- Mono label (e.g., "PHOTOGRAPHY")
- Horizontal rule
- Coordinates annotation (e.g., "5 recent")

**Step 1: Create section header component**

Reusable `<SectionHeader label="Photography" annotation="5 recent" />`

**Step 2: Update getStaticProps to fetch data for all sections**

Currently fetches only stories. Add: recent photos (from gallery section), projects, and GitHub contribution data.

**Step 3: Build each homepage section as a sub-component**

- `HomepagePhotoStrip`
- `HomepageFeaturedStory`
- `HomepageRecentWriting`
- `HomepageProjects`
- `HomepageGitHub`

**Step 4: Compose in index.tsx**

**Step 5: Test all sections render, responsive layout works**

**Step 6: Commit**

```bash
git add frontend/src/pages/index.tsx frontend/src/components/
git commit -m "feat: redesign homepage with compositional section layout"
```

---

### Task 8: Create avatar component

**Files:**
- Create: `frontend/src/components/SkullAvatar.tsx`

The mockup's skull with beard, glasses, emerald pupils that track cursor, waving hand, speech bubble with cycling messages on click. This is a placeholder that works now; it can be replaced later with the AI personality avatar.

**Step 1: Port the SVG skull from the mockup into a React component**

- Eye tracking via `onMouseMove` on document, calculate angle to each pupil center
- Click handler cycles speech bubble messages
- Wave animation on initial load (3.2s delay)
- CSS animations for speech bubble appear/disappear

**Step 2: Position in the homepage hero area**

**Step 3: Test eye tracking, click interaction, responsive sizing**

**Step 4: Commit**

```bash
git add frontend/src/components/SkullAvatar.tsx
git commit -m "feat: add interactive skull avatar with eye tracking"
```

---

## Phase 3: Flow Field & Background Effects

The Perlin noise flow field with boid flocking, ruler ticks, and engineering grid overlay. Decorative background layer behind all content.

### Task 9: Create FlowField React component

**Files:**
- Create: `frontend/src/components/FlowField.tsx`

Port the canvas script from the mockup artifact into a React component:
- `useRef` for canvas element
- `useEffect` for animation loop with `requestAnimationFrame`
- Cleanup on unmount (cancel animation frame)
- `useCallback` for resize handler
- Read theme from the existing theme system (check for `.dark` class on `document.documentElement`)
- Configurable particle count, noise scale, speed, decay, flock params via props with sensible defaults matching the tuned values from the mockup control panel

**Tuned defaults from the mockup session:**
```
particles: 4000
noiseScale: 0.004
maxSpeed: 0.55
fadeAlpha: 0.09
flockRadius: 80
separationRadius: 12
alignWeight: 0.2
cohesionWeight: 0.015
separationWeight: 0.15
noiseWeight: 0.5
timeStep: 0.0006
noiseOctaves: 5
```

The component renders a `<canvas>` with `position: fixed; inset: 0; z-index: -2; pointer-events: none`.

**Performance considerations:**
- Respect `prefers-reduced-motion` — disable animation, show static scatter
- Use `devicePixelRatio` capped at 2
- Spatial hash grid for O(n) neighbor lookups (already implemented in mockup)
- Consider reducing particle count on mobile (`window.innerWidth < 768` → halve count)

**Step 1: Write FlowField.tsx with all the above**

**Step 2: Add to Layout.tsx**

```tsx
import { FlowField } from '@/components/FlowField';
// Inside Layout render, before TopNav:
<FlowField />
```

**Step 3: Run dev, verify canvas renders behind content, grid visible on top, ruler ticks work**

**Step 4: Test dark/light toggle — particle colors and fade color should switch**

**Step 5: Commit**

```bash
git add frontend/src/components/FlowField.tsx frontend/src/layout/Layout.tsx
git commit -m "feat: add Perlin noise flow field with boid flocking"
```

---

### Task 10: Create Ruler component

**Files:**
- Create: `frontend/src/components/Ruler.tsx`

Fixed left-edge ruler with tick marks at 20px intervals. Major ticks every 400px with px labels. Matches the mockup's measurement precision aesthetic.

**Step 1: Write Ruler.tsx**

- Fixed position, left edge, full height
- Generate ticks based on `document.body.scrollHeight`
- Recalculate on resize
- Mono font labels at 9px

**Step 2: Add CSS to template components.css for ruler classes**

**Step 3: Add to Layout.tsx alongside FlowField**

**Step 4: Test at multiple viewport heights**

**Step 5: Commit**

```bash
git add frontend/src/components/Ruler.tsx frontend/src/layout/Layout.tsx
git commit -m "feat: add precision ruler tick marks"
```

---

### Task 11: Create GridOverlay component

**Files:**
- Create: `frontend/src/components/GridOverlay.tsx`

The CSS-only engineering paper grid from the mockup. Fixed position, pointer-events none, z-index between flow field and content. Two layers: 40px minor grid, 200px major grid.

**Step 1: Write GridOverlay.tsx (or pure CSS in template)**

This could be pure CSS on a `::before`/`::after` of the body or layout wrapper, or a zero-content div. Decide based on whether we need runtime control.

Recommendation: Pure CSS in the template's layout.css, applied to the layout wrapper. No component needed.

**Step 2: Add to template CSS**

**Step 3: Verify grid visible behind content, above flow field**

**Step 4: Commit**

```bash
git add frontend/src/templates/ghostmonk/styles/layout.css
git commit -m "feat: add engineering grid overlay"
```

---

## Phase 4: Section Page Styles

The display registry already maps section types to display components. The mockup defines visual treatments for each. This phase reskins the existing components through CSS.

### Task 12: Restyle FeedDisplay (section feed page)

**Files:**
- Modify: `frontend/src/templates/ghostmonk/styles/components.css`

The mockup's "Stack Shift" section feed:
- Scannable index: title + excerpt + date in a ruled list
- No cards — each entry is a horizontal row with border-bottom
- Instrument Serif for titles, body font for excerpts, mono for dates
- Grid layout: `1fr auto` (content + date)

**Step 1: Add `.feed-*` class overrides in ghostmonk components.css**

**Step 2: Verify a real section feed renders with the new style**

**Step 3: Commit**

---

### Task 13: Restyle CardGridDisplay (projects)

**Files:**
- Modify: `frontend/src/templates/ghostmonk/styles/components.css`

The mockup's project detail layout:
- Larger cards with tech stack tags
- Status badge in accent color
- Two-column detail view for individual project pages (content + sidebar metadata)

**Step 1: Add project card overrides**

**Step 2: Verify with real project data**

**Step 3: Commit**

---

### Task 14: Restyle GalleryDisplay (photography)

**Files:**
- Modify: `frontend/src/templates/ghostmonk/styles/components.css`
- Possibly modify: `frontend/src/modules/registry/displays/GalleryDisplay.tsx`

The mockup's photography gallery:
- Masonry-like grid with varying aspect ratios
- EXIF metadata overlay on hover (focal length, aperture)
- Filter bar for categories (ALL, STREET, LANDSCAPE, etc.)
- Photo count + last updated in header

The GalleryDisplay component is currently generic. It may need structural changes to support the filter bar and EXIF overlays, which would be React component changes, not CSS-only.

**Step 1: Add gallery CSS overrides**

**Step 2: If filter bar needed, add to GalleryDisplay.tsx**

**Step 3: Verify with real gallery data**

**Step 4: Commit**

---

### Task 15: Style individual story page

**Files:**
- Modify: `frontend/src/templates/ghostmonk/styles/components.css`

The mockup's article page:
- Max-width 680px centered
- Cover image 16:9
- Reading progress bar in accent
- Instrument Serif for title, mono for metadata
- Blockquote with left accent border
- Tags at bottom in accent color
- Prev/next navigation

Most of this is CSS. The reading progress bar already exists (`ReadingProgressBar.tsx`).

**Step 1: Add story page style overrides**

**Step 2: Verify with a real story**

**Step 3: Commit**

---

## Phase 5: Site Config & Identity Updates

### Task 16: Update site.config.json

**Files:**
- Modify: `frontend/site.config.json`

Update:
- `site.tagline` — something that reflects the identity-faceted design, not "Sharing Stories, Projects and Ideas"
- `hero.showOnHome` — keep true, but the hero component itself is new

**Step 1: Update config values**

**Step 2: Commit**

---

### Task 17: Update GhostmonkLogo component

**Files:**
- Modify: `frontend/src/components/GhostmonkLogo.tsx`

The mockup uses a skull icon (`&#9760;`) + "GHOSTMONK" in mono. The current logo component likely renders differently. Update to match the mockup's treatment.

**Step 1: Review current GhostmonkLogo**

**Step 2: Update to skull + mono text matching mockup**

**Step 3: Commit**

---

## Phase 6: Polish & Validation

### Task 18: Scroll-triggered animations

**Files:**
- Create: `frontend/src/hooks/useFadeIn.ts`

The mockup has `.fade-in` elements that appear on scroll. Implement with `IntersectionObserver`.

**Step 1: Create useFadeIn hook**

Returns a ref. When the element enters the viewport, adds a class that triggers opacity/transform animation.

**Step 2: Add fade-in CSS to template**

**Step 3: Apply to homepage sections and section headers**

**Step 4: Respect `prefers-reduced-motion` — skip animations**

**Step 5: Commit**

---

### Task 19: Theme toggle verification

**Step 1: Toggle dark/light/system on every page type**

Check:
- Flow field particle colors switch
- Grid overlay opacity adjusts
- All text readable on both backgrounds
- Cards, nav, footer all correct
- No flashes of wrong theme on load (FOUC)

**Step 2: Fix any mismatched colors**

**Step 3: Commit**

---

### Task 20: Responsive verification

**Step 1: Test at 375px, 768px, 1024px, 1440px**

Check:
- Flow field particle count reduces on mobile
- Ruler hides on mobile (< 768px) — too narrow
- Grid scales appropriately
- Navigation hamburger works
- Photography strip scrolls horizontally
- Cards stack single-column on mobile
- Typography scale holds

**Step 2: Fix breakpoint issues**

**Step 3: Commit**

---

### Task 21: Performance check

**Step 1: Run Lighthouse on dev build**

Target: Performance > 90 with flow field running.

**Step 2: If flow field tanks performance:**
- Reduce particle count further on low-end devices
- Use `requestIdleCallback` for non-critical updates
- Consider `OffscreenCanvas` in a worker

**Step 3: Verify no layout shift (CLS) from flow field or grid**

**Step 4: Commit any fixes**

---

### Task 22: Accessibility review

**Step 1: Verify WCAG compliance**
- Flow field canvas has `aria-hidden="true"` and is purely decorative
- All interactive elements keyboard-accessible
- Color contrast meets AA for text on all surfaces (dark and light)
- `prefers-reduced-motion` disables all animations including flow field

**Step 2: Run axe DevTools on key pages**

**Step 3: Fix violations**

**Step 4: Commit**

---

## Phase 7: E2E Test Updates

### Task 23: Update Playwright tests

Any visual or structural changes to the homepage, nav, or layout may break existing Playwright selectors. Update:
- Homepage assertions (new sections, removed tagline)
- Navigation selectors if structure changed
- Any snapshot tests

**Step 1: Run existing e2e suite**

```bash
make e2e
```

**Step 2: Fix failing tests**

**Step 3: Add new tests for flow field (renders without JS errors), identity cycling, theme toggle with new template**

**Step 4: Commit**

---

## Execution Order

The dependency graph:

```
Phase 1 (Tasks 1-5): Template CSS
  └─> Phase 2 (Tasks 6-8): Homepage / landing page
      └─> Phase 3 (Tasks 9-11): Flow field, ruler, grid
          └─> Phase 4 (Tasks 12-15): Section page styles
              └─> Phase 5 (Tasks 16-17): Config & identity
                  └─> Phase 6 (Tasks 18-22): Polish & validation
                      └─> Phase 7 (Task 23): E2E tests
```

Phases 2 and 3 can partially overlap — flow field is decorative and doesn't block homepage content work.

Estimated scope: ~23 tasks, each 15-45 minutes with Claude Code. Full implementation: one focused session or two shorter ones.
