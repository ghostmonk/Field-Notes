# Template Contract

Every template under `templates/<name>/` must provide a single `index.css` entry point
that defines the CSS custom properties and component classes listed below.

## Required Structure

```
templates/<name>/
  index.css          # Single entry point, imported in _app.tsx
  styles/
    tokens.css       # CSS custom properties (colors, fonts, spacing, radii, transitions)
    typography.css   # Font assignments and heading styles
    layout.css       # Layout dimension variables
    components.css   # Component classes consumed by React components
```

## Required CSS Custom Properties

### Colors (light mode in `:root`, dark overrides in `.dark`)
- `--color-brand-primary`, `--color-brand-primary-hover`, `--color-brand-secondary`
- `--color-surface-primary`, `--color-surface-secondary`, `--color-surface-tertiary`, `--color-surface-inverse`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-inverse`
- `--color-text-brand`, `--color-text-link`, `--color-text-link-hover`
- `--color-border-primary`, `--color-border-secondary`, `--color-border-focus`
- `--color-status-success`, `--color-status-warning`, `--color-status-error`, `--color-status-info`
- `--color-shadow-light`, `--color-shadow-medium`, `--color-shadow-dark`
- `--color-nav-backdrop` (semi-transparent background for bottom nav)

### Fonts
- `--font-family-sans`, `--font-family-serif`, `--font-family-mono`
- `--font-size-xs` through `--font-size-4xl`
- `--font-weight-light`, `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`
- `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`

### Spacing
- `--space-xs` through `--space-5xl`

### Radii
- `--radius-sm` through `--radius-full`

### Transitions
- `--transition-fast`, `--transition-normal`, `--transition-slow`, `--transition-colors`

### Layout
- `--layout-nav-height`, `--layout-footer-height`
- `--layout-bottom-nav-offset`, `--layout-container-max-width`, `--layout-content-padding`
- `--layout-page-content-max-width` (max width for single-page content like privacy/terms)
- `--layout-bottom-offset` (computed, includes safe-area-inset)

## Required Component Classes

These classes are referenced directly in React components:

### Layout: `.container`, `.nav`, `.nav__container`, `.nav__links`, `.nav__link`, `.nav__link--active`
### Navigation: `.bottom-nav`, `.bottom-nav__item`, `.bottom-nav__item--active`, `.bottom-nav__icon`, `.bottom-nav__label`
### Cards: `.card`, `.card--draft`, `.card--link`, `.card--hoverable`
### Buttons: `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--danger`, `.btn--sm`, `.btn--lg`
### Badges: `.badge`, `.badge--draft`, `.badge--featured`
### Grid: `.grid`, `.grid--responsive`, `.grid--3-cols`, `.grid--1-col`
### Story: `.story-header`, `.story-title`, `.story-content`, `.story-excerpt`
### Prose: `.prose`, `.prose--card`
### Utility: `.sr-only`, `.transition-colors`, `.pb-safe`

## Required Layout Config

Each template must include a `layout.config.json` that describes its structural layout:

```json
{
  "structure": "top-content-bottom",
  "navigation": { "desktop": "top", "mobile": "bottom" },
  "footer": { "position": "fixed-bottom", "showAboveBottomNav": true },
  "content": { "maxWidth": "var(--layout-page-content-max-width)", "centered": true }
}
```

Valid `structure` values: `top-content-bottom`, `sidebar-content`, `top-content`.

## Switching Templates

Template switching is a **build-time** operation. Next.js Pages Router requires global CSS
imports to be static — dynamic `import()` for CSS is not supported. Two things must change
in lockstep:

1. Set `template.active` in `site.config.json` to the template directory name (e.g. `"default"`)
2. Update the CSS import in `_app.tsx` to match: `import '../templates/<name>/index.css'`
3. Update `site.config.json` `fonts` if the template uses different Google Fonts
4. Update the FOUC background color in `_document.tsx` (`style={{backgroundColor: '...'}}`
   on `<Html>` and `<body>`) to match the new template's `--color-surface-primary` dark value.
   CSS variables are not available at SSR paint time, so this must be a hardcoded hex value.
5. Rebuild and deploy

The `template.active` value in config is the source of truth for which template is active.
The CSS import in `_app.tsx` must always match it manually.
