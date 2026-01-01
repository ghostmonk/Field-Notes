# Dependency Upgrade Plan

Upgrade all frontend and backend dependencies to latest stable versions.

## Goal

Routine maintenance to stay current with dependencies. Aggressive approach: upgrade everything, fix what breaks.

## Testing Strategy

Solid E2E test coverage with Playwright provides safety net for validating changes.

---

## Batches

### Batch 0: Backend Updates

Update `backend/requirements.in`:

| Package | Current | Target |
|---------|---------|--------|
| fastapi | 0.115.12 | 0.128.0 |
| pydantic | 2.11.4 | 2.12.5 |
| uvicorn | 0.34.2 | 0.40.0 |
| google-cloud-storage | 2.16.0 | 3.7.0 |
| pillow | 11.2.1 | 12.0.0 |

**Steps:**
1. Update versions in `requirements.in`
2. Run `pip-compile requirements.in`
3. Run `pip install -r requirements.txt`
4. Start backend, verify it runs
5. Run backend tests if available

**Breaking changes:**
- google-cloud-storage v3: Check for API changes in bucket/blob operations
- pillow v12: Minor API changes, mostly additive

---

### Batch 1: Frontend Safe Updates

Update `frontend/package.json` (minor/patch versions within semver):

| Package | Current | Target |
|---------|---------|--------|
| react | 19.1.0 | 19.2.3 |
| react-dom | 19.1.0 | 19.2.3 |
| typescript | 5.8.3 | 5.9.3 |
| next-auth | 4.24.11 | 4.24.13 |
| autoprefixer | 10.4.21 | 10.4.23 |
| postcss | 8.5.3 | 8.5.6 |
| cookie | 1.0.2 | 1.1.1 |
| react-infinite-scroll-component | 6.1.0 | 6.1.1 |
| @types/react | 19.1.4 | 19.2.7 |
| @types/react-dom | 19.1.5 | 19.2.3 |
| @tailwindcss/forms | 0.5.10 | 0.5.11 |
| @tailwindcss/typography | 0.5.16 | 0.5.19 |

**Steps:**
1. Update versions in `package.json`
2. Run `npm install`
3. Run `npm run build`
4. Run `npm run test:e2e`

**Breaking changes:** None expected.

---

### Batch 2: TipTap Ecosystem

Major version upgrade from v2 to v3:

| Package | Current | Target |
|---------|---------|--------|
| @tiptap/react | 2.12.0 | 3.14.0 |
| @tiptap/starter-kit | 2.12.0 | 3.14.0 |
| @tiptap/extension-image | 2.12.0 | 3.14.0 |
| @tiptap/extension-link | 2.12.0 | 3.14.0 |
| @mantine/tiptap | 7.17.7 | 8.3.10 |

**Steps:**
1. Update all TipTap packages together (they must match)
2. Run `npm install`
3. Run `npm run build` - fix any TypeScript errors
4. Run `npm run test:e2e`
5. Manually test rich text editor functionality

**Breaking changes:**
- TipTap v3 has API changes for extensions
- Mantine v8 has component API changes
- Review migration guides:
  - https://tiptap.dev/docs/guides/upgrade-guide
  - https://mantine.dev/changelog/7-0-0/

---

### Batch 3: ESLint Ecosystem

Major config format change (eslintrc → flat config):

| Package | Current | Target |
|---------|---------|--------|
| eslint | 8.57.1 | 9.39.2 |
| @typescript-eslint/parser | 6.21.0 | 8.51.0 |
| @typescript-eslint/eslint-plugin | 6.21.0 | 8.51.0 |
| eslint-config-next | 15.3.2 | 16.1.1 |
| postcss-import | 15.1.0 | 16.1.1 |
| postcss-nested | 6.2.0 | 7.0.2 |

**Steps:**
1. Update packages in `package.json`
2. Run `npm install`
3. Convert `.eslintrc.*` to `eslint.config.js` (flat config format)
4. Run `npm run lint` - fix any new errors
5. Run `npm run build`

**Breaking changes:**
- ESLint v9 requires flat config format
- typescript-eslint v8 has new rule defaults
- Review: https://eslint.org/docs/latest/use/migrate-to-9.0.0

---

### Batch 4: Tailwind v4

Major rewrite of Tailwind CSS:

| Package | Current | Target |
|---------|---------|--------|
| tailwindcss | 3.4.17 | 4.1.18 |

**Steps:**
1. Update `tailwindcss` in `package.json`
2. Run `npm install`
3. Migrate `tailwind.config.js` to new format
4. Update `postcss.config.js` if needed
5. Run `npm run build` - fix any CSS issues
6. Run `npm run test:e2e`
7. Visual review of UI

**Breaking changes:**
- Config file format changes
- Some utility class names changed
- `@apply` behavior changes
- Review: https://tailwindcss.com/docs/upgrade-guide

---

### Batch 5: Next.js 16

Framework upgrade:

| Package | Current | Target |
|---------|---------|--------|
| next | 15.3.2 | 16.1.1 |

**Steps:**
1. Update `next` in `package.json`
2. Run `npm install`
3. Run `npm run build` - fix any errors
4. Run `npm run test:e2e`
5. Test dev server: `npm run dev`

**Breaking changes:**
- Check for router changes
- Middleware API changes
- Review Next.js 16 release notes

---

## Process Per Batch

1. Update dependency versions
2. Install dependencies
3. Build check (catch compilation errors)
4. Run tests (E2E for frontend, unit for backend)
5. Fix breaking changes as needed
6. Commit with message: `chore: upgrade [batch name] dependencies`

## Rollback Strategy

Each batch is a separate commit. If a batch causes issues in production:
1. `git revert <commit-hash>`
2. Redeploy

---

## Success Criteria

- All dependencies at latest stable versions
- `npm run build` passes
- `npm run test:e2e` passes
- Backend starts and responds to requests
- No visual regressions in UI
