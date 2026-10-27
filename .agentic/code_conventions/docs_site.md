# Docs Site Conventions

The docs site (`docs-site/`) is a Nextra static site deployed to GitHub Pages.

## Static Export Only

Built with `output: 'export'` in `next.config.mjs`. No server-side features:
- No `getServerSideProps`, no API routes (`pages/api/`), no `next/headers` or `next/cookies`
- `getStaticProps` and `getStaticPaths` are fine
- `images.unoptimized` must remain `true`

## basePath

`basePath: '/Field-Notes'` matches the GitHub Pages URL (`ghostmonk.github.io/Field-Notes/`). Changing or removing it breaks all navigation, assets, and links when deployed.

## Page Registration

Every new `.mdx` or `.md` page must have a corresponding entry in the `_meta.ts` file in the same directory. Without it, Nextra excludes the page from sidebar navigation.

## Naming Conventions

- **Plans**: `YYYY-MM-DD-slug.md` (single dash after date). Exception: legacy `issue-NN-*` files.
- **Releases**: `YYYY-MM-DD--slug.md` (double dash after date).
- **ADRs**: `NNNN-kebab-case-title.mdx` with zero-padded sequential number. `_meta.ts` label must include `ADR-NNNN:` prefix.

## Site Identity

All site-wide identity — logo, repo link, `docsRepositoryBase`, footer — lives in `theme.config.tsx`. Don't hardcode the GitHub repo URL in individual pages or duplicate the site title in page frontmatter.

## _app.tsx

`docs-site/pages/_app.tsx` is a minimal passthrough (`<Component {...pageProps} />`). Nextra handles layout via `theme.config.tsx`. Don't add providers, global CSS imports, or layout wrappers to `_app.tsx`.
