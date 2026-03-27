<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: app-tsx-minimal
title: docs-site _app.tsx must remain a minimal passthrough
severity: warning
globs:
  - docs-site/pages/_app.tsx
tags:
  - nextra
  - architecture
  - docs-site
---

The `docs-site/pages/_app.tsx` file is intentionally minimal — it simply renders `<Component {...pageProps} />` with no wrapping providers, context, or global state. Nextra's theme system handles layout and theming via `theme.config.tsx`.

Flag any changes to `_app.tsx` that:
- Add React context providers or Redux stores
- Add global CSS imports beyond what Next.js already handles
- Wrap the component tree in additional layout components
- Add data-fetching logic

If site-wide configuration changes are needed (logo, footer, navigation), they belong in `docs-site/theme.config.tsx`, not in `_app.tsx`.

### Violations

```
Wrapping <Component> in <ThemeProvider> or <SomeContext.Provider> in _app.tsx
```

```
Adding import '../styles/custom.css' to _app.tsx
```

### Compliant

```
export default function App({ Component, pageProps }: AppProps) { return <Component {...pageProps} /> }
```
