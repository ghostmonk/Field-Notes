# UX Tier 4A: CSS & Frontend Polish Implementation Plan

**Goal:** Implement 6 frontend-only refinements from UX Tier 4A — scroll error states, toolbar touch targets, typographic scale, prose styling, card differentiation, and microinteractions.

**Architecture:** All changes are CSS/component-level. No backend changes, no new API endpoints, no data model changes. Template token system is the source of truth for design values.

**Tech Stack:** React, TypeScript, CSS custom properties, TipTap, Tailwind (utility-only)

---

### Task 1: Distinguish scroll loading vs failure (#29)

**Files:**
- Modify: `frontend/src/modules/registry/displays/FeedDisplay.tsx`
- Modify: `frontend/src/templates/default/styles/components.css`

**Step 1: Add error and retry state to FeedDisplay**

The infinite scroll component currently shows only a spinner on load. Add an error state that renders when `onLoadMore` fails, with a retry button.

```tsx
// In FeedDisplay, add error tracking:
const [loadError, setLoadError] = useState(false);

const handleLoadMore = async () => {
  try {
    setLoadError(false);
    await onLoadMore();
  } catch {
    setLoadError(true);
  }
};

// In the InfiniteScroll loader prop, conditionally show error:
loader={
  loadError ? (
    <div className="feed-load-error">
      <p>Failed to load more content.</p>
      <button onClick={handleLoadMore} className="btn btn--secondary btn--sm">
        Retry
      </button>
    </div>
  ) : (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <ClipLoader size={35} color="var(--color-brand-primary)" />
    </div>
  )
}
```

**Step 2: Add CSS for feed-load-error**

```css
.feed-load-error {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-secondary);
}
.feed-load-error p {
  margin-bottom: var(--spacing-sm);
}
```

**Step 3: Run tests, commit**

Run: `cd frontend && npx vitest run`
```bash
git add frontend/src/modules/registry/displays/FeedDisplay.tsx frontend/src/templates/default/styles/components.css
git commit -m "feat: add error state with retry to infinite scroll feed"
```

---

### Task 2: Editor toolbar touch targets (#38)

**Files:**
- Modify: `frontend/src/modules/editor/components/RichTextEditor.tsx`
- Modify: `frontend/src/templates/default/styles/components.css`

**Step 1: Add CSS class and media query for toolbar buttons**

Replace inline padding on ToolbarButton with a CSS class. Add mobile media query for 44px minimum touch targets.

In `RichTextEditor.tsx`, change ToolbarButton className from inline Tailwind padding to a semantic class:
```tsx
className={`editor-toolbar__btn rounded ${isActive ? 'editor-toolbar__btn--active' : 'editor-toolbar__btn--inactive'}`}
```

In `components.css`:
```css
.editor-toolbar__btn {
  padding: 0.25rem 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.editor-toolbar__btn--active {
  background-color: var(--color-surface-tertiary);
}
.editor-toolbar__btn--inactive {
  background-color: var(--color-surface-secondary);
}

@media (max-width: 767px) {
  .editor-toolbar__btn {
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem;
  }
}
```

**Step 2: Run tests, commit**

Run: `cd frontend && npx vitest run`
```bash
git add frontend/src/modules/editor/components/RichTextEditor.tsx frontend/src/templates/default/styles/components.css
git commit -m "feat: increase editor toolbar touch targets to 44px on mobile"
```

---

### Task 3: Modular typographic scale (#46)

**Files:**
- Modify: `frontend/src/templates/default/styles/tokens.css`

**Step 1: Rework font-size tokens to a perfect fourth ratio (1.333)**

Replace the current arbitrary clamp values with a consistent scale. Base = 1rem, each step multiplied by 1.333.

```css
--font-size-xs: clamp(0.75rem, 0.7rem + 0.2vw, 0.8rem);     /* ~12px */
--font-size-sm: clamp(0.875rem, 0.82rem + 0.25vw, 0.937rem); /* ~14px */
--font-size-base: clamp(1rem, 0.93rem + 0.35vw, 1.125rem);   /* 16px */
--font-size-lg: clamp(1.125rem, 1.03rem + 0.45vw, 1.333rem); /* ~18-21px */
--font-size-xl: clamp(1.333rem, 1.2rem + 0.6vw, 1.777rem);   /* ~21-28px */
--font-size-2xl: clamp(1.777rem, 1.55rem + 0.9vw, 2.369rem); /* ~28-38px */
--font-size-3xl: clamp(2.369rem, 2rem + 1.3vw, 3.157rem);    /* ~38-50px */
--font-size-4xl: clamp(3.157rem, 2.6rem + 1.8vw, 4.209rem);  /* ~50-67px */
```

**Step 2: Verify visually with dev server, commit**

Run: `make dev-local` — check headings on home, detail pages, editor.
```bash
git add frontend/src/templates/default/styles/tokens.css
git commit -m "refactor: adopt perfect fourth (1.333) modular typographic scale"
```

---

### Task 4: Richer prose styling (#13)

**Files:**
- Modify: `frontend/src/templates/default/styles/components.css`

**Step 1: Enhance prose typography**

Add drop cap on first paragraph, styled blockquotes, improved code blocks, and horizontal rules.

```css
/* Drop cap on first paragraph of story content */
.prose > p:first-of-type::first-letter {
  float: left;
  font-family: var(--font-family-serif);
  font-size: 3.5em;
  line-height: 0.8;
  padding-right: 0.1em;
  margin-top: 0.05em;
  color: var(--color-brand-primary);
}

/* Enhanced blockquotes */
.prose blockquote {
  border-left: 4px solid var(--color-brand-primary);
  padding: var(--spacing-md) var(--spacing-lg);
  margin: var(--spacing-lg) 0;
  font-style: italic;
  background-color: var(--color-surface-secondary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
.prose blockquote p {
  margin: 0;
}

/* Improved code blocks */
.prose pre {
  background-color: var(--color-surface-tertiary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  overflow-x: auto;
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
.prose code {
  font-size: 0.9em;
  padding: 0.15em 0.35em;
  background-color: var(--color-surface-tertiary);
  border-radius: var(--radius-sm);
}
.prose pre code {
  padding: 0;
  background: none;
  border-radius: 0;
  font-size: inherit;
}

/* Horizontal rules */
.prose hr {
  border: none;
  height: 1px;
  background-color: var(--color-border-primary);
  margin: var(--spacing-xl) 0;
}
```

**Step 2: Run tests, commit**

```bash
git add frontend/src/templates/default/styles/components.css
git commit -m "feat: enrich prose styling — drop caps, blockquotes, code blocks"
```

---

### Task 5: Card visual differentiation (#45)

**Files:**
- Modify: `frontend/src/modules/stories/components/StoryCard.tsx`
- Modify: `frontend/src/templates/default/styles/components.css`

**Step 1: Enhance card visual hierarchy**

Story cards already extract leading images via `splitLeadingImage()`. Improve the no-image case with a gradient accent strip and content-type indicator. Add hover lift animation.

```css
/* Accent strip for cards without images */
.card:not(:has(.card__media)) {
  border-top: 3px solid var(--color-brand-primary);
}

/* Hover lift */
.card {
  transition: transform var(--transition-fast), box-shadow var(--transition-normal);
}
.card:hover {
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .card:hover {
    transform: none;
  }
}
```

**Step 2: Run tests, commit**

```bash
git add frontend/src/modules/stories/components/StoryCard.tsx frontend/src/templates/default/styles/components.css
git commit -m "feat: add visual differentiation to cards — accent strip and hover lift"
```

---

### Task 6: Microinteractions (#48)

**Files:**
- Modify: `frontend/src/templates/default/styles/components.css`

**Step 1: Add subtle transitions for state changes**

```css
/* Button press feedback */
.btn:active {
  transform: scale(0.97);
}

/* Nav link underline animation */
.top-nav__link::after {
  content: '';
  display: block;
  height: 2px;
  background-color: var(--color-brand-primary);
  transform: scaleX(0);
  transition: transform var(--transition-fast);
  transform-origin: center;
}
.top-nav__link:hover::after,
.top-nav__link--active::after {
  transform: scaleX(1);
}

/* Card content fade-in on load */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fadeInUp var(--transition-normal) ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
  .btn:active {
    transform: none;
  }
}
```

**Step 2: Run tests, commit**

```bash
git add frontend/src/templates/default/styles/components.css
git commit -m "feat: add microinteractions — button press, nav underlines, card fade-in"
```

---

## Execution Notes

- All tasks are independent and can be executed in any order
- Tasks 3-6 are CSS-only — no test changes expected
- Task 1 adds component logic — verify existing tests still pass
- Task 2 modifies component markup — verify existing tests still pass
- Run `make format` before final commit
- Run e2e tests after all tasks: stop Docker frontend, run `make test-frontend`
- Visual verification with `make dev-local` after all tasks
