# UX Tier 1: Fix What's Broken — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 P0 usability and accessibility issues identified in the UX review.

**Architecture:** All changes are frontend-only. Tasks modify layout components, editor hooks, and CSS. No backend changes. No new dependencies except for the alt-text modal which uses native HTML dialog.

**Tech Stack:** Next.js (Pages Router), React, TipTap, Tailwind CSS, CSS custom properties, Playwright e2e tests.

**Reference:** See `docs-site/pages/plans/2026-03-07-ux-review-design.md` for full issue descriptions.

---

### Task 1: Add Home Link / Site Identity to TopNav

**Files:**
- Modify: `frontend/src/layout/TopNav.tsx`
- Modify: `frontend/e2e/page-objects/components/top-nav.component.ts`
- Modify: `frontend/e2e/specs/smoke/smoke.spec.ts`

**Step 1: Update TopNav page object with home link locator**

Add to `top-nav.component.ts`:

```typescript
// In class properties (after line 13)
readonly homeLink: Locator;

// In constructor (after line 36)
this.homeLink = page.getByTestId('nav-home-link');
```

Add navigation method:

```typescript
async goToHome() {
  await Promise.all([
    this.page.waitForURL('/'),
    this.homeLink.click(),
  ]);
}
```

**Step 2: Add e2e test for home link**

Add to `smoke.spec.ts`:

```typescript
test('home link with site title is visible in navigation', async ({ mockApiPage }) => {
  const homePage = new HomePage(mockApiPage);
  await homePage.goto();
  await homePage.waitForLoad();
  await expect(homePage.nav.homeLink).toBeVisible();
  await expect(homePage.nav.homeLink).toHaveText('Ghostmonk');
});
```

**Step 3: Run test to verify it fails**

Run: `cd frontend && npx playwright test specs/smoke/smoke.spec.ts --grep "home link"`
Expected: FAIL — `nav-home-link` not found.

**Step 4: Add home link to TopNav**

In `TopNav.tsx`, add import and site identity link:

```typescript
// Add import at top
import { getSiteConfig } from '@/config';

// Inside the component, before the return:
const config = getSiteConfig();

// Replace the opening <div className="flex space-x-4"> (line 34) with:
<div className="flex items-center space-x-4">
    {/* Site Identity - Home Link */}
    <Link
        href="/"
        className="nav__link nav__link--home"
        data-testid="nav-home-link"
    >
        {config.site.title}
    </Link>

    {/* Desktop Navigation - Section Links */}
    <div className="nav__links">
```

**Step 5: Add CSS for home link**

In `frontend/src/templates/default/styles/components.css`, add after the `.nav__link--active` dark mode block (around line 315):

```css
.nav__link--home {
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  letter-spacing: -0.025em;
}
```

**Step 6: Run test to verify it passes**

Run: `cd frontend && npx playwright test specs/smoke/smoke.spec.ts --grep "home link"`
Expected: PASS

**Step 7: Commit**

```
feat: add home link with site identity to TopNav
```

---

### Task 2: Add Home Item to BottomNav

**Files:**
- Modify: `frontend/src/layout/BottomNav.tsx`
- Modify: `frontend/e2e/page-objects/components/bottom-nav.component.ts`
- Create: `frontend/e2e/specs/navigation/bottom-nav.spec.ts`

**Step 1: Update BottomNav page object**

Add to `bottom-nav.component.ts`:

```typescript
// In class properties
readonly homeLink: Locator;

// In constructor
this.homeLink = page.getByTestId('bottom-nav-home');
```

Add method:

```typescript
async goToHome() {
  await Promise.all([
    this.page.waitForURL('/'),
    this.homeLink.click(),
  ]);
}
```

**Step 2: Write e2e test**

Create `frontend/e2e/specs/navigation/bottom-nav.spec.ts`:

```typescript
import { test, expect } from '../../fixtures';
import { HomePage } from '../../page-objects/home.page';

test.describe('Bottom Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // Mobile viewport

  test('bottom nav shows home link', async ({ mockApiPage }) => {
    const homePage = new HomePage(mockApiPage);
    await homePage.goto();
    await homePage.waitForLoad();
    await expect(homePage.bottomNav.homeLink).toBeVisible();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd frontend && npx playwright test specs/navigation/bottom-nav.spec.ts`
Expected: FAIL — `bottom-nav-home` not found.

**Step 4: Add home item to BottomNav**

In `BottomNav.tsx`, add the home item before the sections loop:

```typescript
// Add imports
import { getSiteConfig } from '@/config';
import { HiHome } from 'react-icons/hi';

// Inside BottomNav component, before the return:
const config = getSiteConfig();
const isHomeActive = !activeSlug || activeSlug === '';

// In the nav element, before {sections.map(...)}, add:
<Link
    href="/"
    className={`bottom-nav__item ${isHomeActive ? 'bottom-nav__item--active' : ''}`}
    aria-current={isHomeActive ? 'page' : undefined}
    data-testid="bottom-nav-home"
>
    <HiHome className="bottom-nav__icon" aria-hidden="true" />
    <span className="bottom-nav__label">{config.site.title}</span>
</Link>
```

Also update `useActiveSection` usage — the home page won't match any section slug. Modify the `isHomeActive` check:

```typescript
const router = useRouter();
const isHomePage = router.pathname === '/';
```

Use `isHomePage` instead of slug matching for the home item's active state. Pass `isHomePage` to suppress active state on section items when on the home page:

```typescript
{sections.map((section) => (
    <NavItem
        key={section.slug}
        section={section}
        isActive={!isHomePage && activeSlug === section.slug}
    />
))}
```

**Step 5: Run test to verify it passes**

Run: `cd frontend && npx playwright test specs/navigation/bottom-nav.spec.ts`
Expected: PASS

**Step 6: Commit**

```
feat: add home item to bottom navigation
```

---

### Task 3: Hide Hamburger Menu When Empty for Non-Admins

**Files:**
- Modify: `frontend/src/layout/TopNav.tsx`
- Modify: `frontend/e2e/specs/smoke/smoke.spec.ts`

**Step 1: Write e2e test**

Add to `smoke.spec.ts`:

```typescript
test('unauthenticated user does not see mobile menu toggle', async ({ mockApiPage }) => {
  const homePage = new HomePage(mockApiPage);
  await homePage.goto();
  await homePage.waitForLoad();
  await expect(homePage.nav.mobileMenuToggle).not.toBeVisible();
});

test('authenticated admin user sees mobile menu toggle', async ({ mockAuthenticatedApiPage }) => {
  const homePage = new HomePage(mockAuthenticatedApiPage);
  await homePage.goto();
  await homePage.waitForLoad();
  await expect(homePage.nav.mobileMenuToggle).toBeVisible();
});
```

**Step 2: Run tests to verify failure**

Run: `cd frontend && npx playwright test specs/smoke/smoke.spec.ts --grep "mobile menu toggle"`
Expected: First test FAILS (toggle is always visible). Second test should PASS.

**Step 3: Conditionally render hamburger button**

In `TopNav.tsx`, wrap the mobile menu button and mobile menu in an admin check:

```typescript
{/* Mobile Menu Button - only show for admin */}
{session?.user?.role === 'admin' && (
    <button
        className="nav__mobile-toggle"
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
        data-testid="mobile-menu-toggle"
    >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
    </button>
)}
```

Also wrap the mobile menu dropdown (lines 110-137) in the same `session?.user?.role === 'admin' &&` check.

**Step 4: Run tests to verify pass**

Run: `cd frontend && npx playwright test specs/smoke/smoke.spec.ts --grep "mobile menu toggle"`
Expected: PASS

**Step 5: Commit**

```
fix: hide mobile hamburger menu for non-admin users
```

---

### Task 4: Add Autosave and Draft Recovery to Editor

**Files:**
- Create: `frontend/src/modules/editor/hooks/useDraftRecovery.ts`
- Modify: `frontend/src/modules/editor/hooks/useStoryEditor.ts`
- Modify: `frontend/src/modules/editor/components/StoryEditorForm.tsx`

**Step 1: Create useDraftRecovery hook**

Create `frontend/src/modules/editor/hooks/useDraftRecovery.ts`:

```typescript
import { useEffect, useCallback, useRef } from 'react';

interface DraftData {
  title: string;
  content: string;
  is_published: boolean;
  savedAt: number;
}

const DRAFT_KEY_PREFIX = 'field-notes-draft';
const AUTOSAVE_INTERVAL = 30_000; // 30 seconds
const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDraftKey(storyId?: string, sectionId?: string): string {
  if (storyId) return `${DRAFT_KEY_PREFIX}-edit-${storyId}`;
  if (sectionId) return `${DRAFT_KEY_PREFIX}-new-${sectionId}`;
  return `${DRAFT_KEY_PREFIX}-new`;
}

export function useDraftRecovery(
  storyId?: string,
  sectionId?: string,
) {
  const key = getDraftKey(storyId, sectionId);
  const autosaveTimer = useRef<ReturnType<typeof setInterval>>();

  const saveDraft = useCallback((title: string, content: string, is_published: boolean) => {
    if (!title && !content) return;
    const draft: DraftData = { title, content, is_published, savedAt: Date.now() };
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // localStorage full or unavailable — ignore
    }
  }, [key]);

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const draft: DraftData = JSON.parse(raw);
      if (Date.now() - draft.savedAt > DRAFT_MAX_AGE) {
        localStorage.removeItem(key);
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  const startAutosave = useCallback((getState: () => { title: string; content: string; is_published: boolean }) => {
    if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    autosaveTimer.current = setInterval(() => {
      const state = getState();
      saveDraft(state.title, state.content, state.is_published);
    }, AUTOSAVE_INTERVAL);
  }, [saveDraft]);

  const stopAutosave = useCallback(() => {
    if (autosaveTimer.current) {
      clearInterval(autosaveTimer.current);
      autosaveTimer.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => stopAutosave();
  }, [stopAutosave]);

  return { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave };
}
```

**Step 2: Add beforeunload handler and draft recovery to useStoryEditor**

In `useStoryEditor.ts`, integrate the draft recovery hook:

```typescript
// Add import
import { useDraftRecovery } from './useDraftRecovery';

// Inside useStoryEditor, after state declarations (around line 53):
const { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave } = useDraftRecovery(storyId, sectionId);
const [showDraftRecovery, setShowDraftRecovery] = useState(false);
const [recoveredDraft, setRecoveredDraft] = useState<{ title: string; content: string; is_published: boolean } | null>(null);
```

Add draft recovery check after story fetch completes:

```typescript
// After the existing fetchedStory sync effect (around line 142), add:
useEffect(() => {
  if (fetchLoading) return;
  const draft = loadDraft();
  if (draft && (draft.title || draft.content)) {
    // Only offer recovery if draft differs from current state
    const currentTitle = fetchedStory?.title || '';
    const currentContent = fetchedStory?.content || '';
    if (draft.title !== currentTitle || draft.content !== currentContent) {
      setRecoveredDraft(draft);
      setShowDraftRecovery(true);
    }
  }
}, [fetchLoading]); // intentionally minimal deps — run once after load
```

Add autosave startup:

```typescript
// After draft recovery check:
const storyRef = useRef(story);
storyRef.current = story;

useEffect(() => {
  startAutosave(() => ({
    title: storyRef.current.title || '',
    content: storyRef.current.content || '',
    is_published: storyRef.current.is_published || false,
  }));
  return () => stopAutosave();
}, [startAutosave, stopAutosave]);
```

Add `beforeunload` handler:

```typescript
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (story.title || story.content) {
      saveDraft(story.title || '', story.content || '', story.is_published || false);
      e.preventDefault();
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [story.title, story.content, story.is_published, saveDraft]);
```

Clear draft on successful save — in `handleSubmit`, after `router.push(...)` (line 111):

```typescript
clearDraft();
stopAutosave();
```

Add draft recovery actions to the return:

```typescript
// Add to return object:
showDraftRecovery,
recoveredDraft,
acceptDraft: () => {
  if (recoveredDraft) {
    setStory(prev => ({ ...prev, ...recoveredDraft }));
  }
  setShowDraftRecovery(false);
},
dismissDraft: () => {
  clearDraft();
  setShowDraftRecovery(false);
  setRecoveredDraft(null);
},
```

Update `UseStoryEditorReturn` interface to include new fields:

```typescript
showDraftRecovery: boolean;
recoveredDraft: { title: string; content: string; is_published: boolean } | null;
acceptDraft: () => void;
dismissDraft: () => void;
```

**Step 3: Add draft recovery banner to StoryEditorForm**

In `StoryEditorForm.tsx`, destructure new values and add banner:

```typescript
const {
  // ...existing...
  showDraftRecovery,
  recoveredDraft,
  acceptDraft,
  dismissDraft,
} = useStoryEditor(section.id, section.slug);
```

Add recovery banner before the form (after the error display):

```typescript
{showDraftRecovery && recoveredDraft && (
  <div
    className="mb-4 p-4 rounded-md border"
    style={{
      backgroundColor: 'var(--color-status-info-bg, #eff6ff)',
      borderColor: 'var(--color-status-info, #3b82f6)',
    }}
    data-testid="draft-recovery-banner"
  >
    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
      Unsaved draft found{recoveredDraft.title ? `: "${recoveredDraft.title}"` : ''}.
    </p>
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={acceptDraft}
        className="btn btn--primary btn--sm"
        data-testid="draft-recovery-accept"
      >
        Restore Draft
      </button>
      <button
        type="button"
        onClick={dismissDraft}
        className="btn btn--secondary btn--sm"
        data-testid="draft-recovery-dismiss"
      >
        Discard
      </button>
    </div>
  </div>
)}
```

**Step 4: Run the app and manually test**

Run: `make dev-local`
1. Open editor, type a title and some content
2. Close the tab — should see browser warning
3. Reopen editor — should see draft recovery banner
4. Click "Restore Draft" — form should populate
5. Save — draft should be cleared

**Step 5: Commit**

```
feat: add autosave and draft recovery to story editor
```

---

### Task 5: Add Alt Text Prompt on Image Upload

**Files:**
- Create: `frontend/src/modules/editor/components/AltTextDialog.tsx`
- Modify: `frontend/src/hooks/uploads/useImageUpload.ts`
- Modify: `frontend/src/modules/editor/components/RichTextEditor.tsx`

**Step 1: Create AltTextDialog component**

Create `frontend/src/modules/editor/components/AltTextDialog.tsx`:

```tsx
import { useRef, useEffect } from 'react';

interface AltTextDialogProps {
  fileName: string;
  onConfirm: (altText: string) => void;
  onCancel: () => void;
}

export function AltTextDialog({ fileName, onConfirm, onCancel }: AltTextDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const altText = inputRef.current?.value?.trim() || fileName;
    dialogRef.current?.close();
    onConfirm(altText);
  };

  const handleCancel = () => {
    dialogRef.current?.close();
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg p-0 backdrop:bg-black/50"
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-primary)',
        maxWidth: '28rem',
        width: '100%',
      }}
      onCancel={handleCancel}
      data-testid="alt-text-dialog"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <h3 className="text-lg font-medium mb-1">Image Description</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Describe this image for screen readers and accessibility.
        </p>
        <input
          ref={inputRef}
          type="text"
          defaultValue={fileName}
          placeholder="Describe the image..."
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--color-border-primary)',
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-text-primary)',
          }}
          data-testid="alt-text-input"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn--secondary btn--sm"
            data-testid="alt-text-cancel"
          >
            Skip
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            data-testid="alt-text-confirm"
          >
            Add
          </button>
        </div>
      </form>
    </dialog>
  );
}
```

**Step 2: Modify useImageUpload to accept alt text callback**

In `useImageUpload.ts`, change the hook signature to accept a callback for requesting alt text:

```typescript
export interface UseImageUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  acceptTypes: string;
  pendingAltText: { fileName: string; resolve: (altText: string) => void } | null;
  cancelPendingUpload: () => void;
}

export function useImageUpload(editor: Editor | null): UseImageUploadReturn {
  const [pendingAltText, setPendingAltText] = useState<{
    fileName: string;
    resolve: (altText: string) => void;
  } | null>(null);

  // Add import for useState at top
```

Modify `handleFileChange` to prompt for alt text before inserting:

```typescript
const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editor) return;

    const file = e.target.files[0];
    const loadingText = `![Uploading ${file.name}...]()`;

    editor.commands.insertContent(loadingText);

    const result = await baseUpload.upload(file);

    const content = editor.getHTML();
    const updatedContent = result
      ? content.replace(loadingText, '')
      : content.replace(/!\[Uploading .*?\]\(\)/g, '');
    editor.commands.setContent(updatedContent);

    if (result?.urls?.length) {
      // Request alt text from user
      const altText = await new Promise<string>((resolve) => {
        setPendingAltText({ fileName: file.name, resolve });
      });
      setPendingAltText(null);

      const { urls, srcsets, dimensions } = result;

      if (srcsets?.length && dimensions?.length) {
        const imgHTML = `<img src="${urls[0]}" srcset="${srcsets[0]}" sizes="(max-width: 500px) 500px, (max-width: 750px) 750px, 1200px" width="${dimensions[0].width}" height="${dimensions[0].height}" alt="${altText}" />`;
        editor.commands.insertContent(imgHTML);
      } else if (srcsets?.length) {
        const imgHTML = `<img src="${urls[0]}" srcset="${srcsets[0]}" sizes="(max-width: 500px) 500px, (max-width: 750px) 750px, 1200px" alt="${altText}" />`;
        editor.commands.insertContent(imgHTML);
      } else {
        editor.commands.insertContent(`<img src="${urls[0]}" alt="${altText}" />`);
      }
    }
  }, [editor, baseUpload]);

  const cancelPendingUpload = useCallback(() => {
    if (pendingAltText) {
      pendingAltText.resolve(pendingAltText.fileName);
      setPendingAltText(null);
    }
  }, [pendingAltText]);

  return {
    ...baseUpload,
    handleFileChange,
    acceptTypes: ALLOWED_IMAGE_TYPES.join(','),
    pendingAltText,
    cancelPendingUpload,
  };
```

Add `useState` to the imports at top of file:

```typescript
import { useCallback, useState } from 'react';
```

**Step 3: Render AltTextDialog in RichTextEditor**

In `RichTextEditor.tsx`, import and render the dialog:

```typescript
// Add import
import { AltTextDialog } from './AltTextDialog';

// Destructure pendingAltText from the image upload hook (around line 66):
const { handleFileChange: handleImageChange, uploading: imageUploading, error: imageError, inputRef: imageInputRef, clearError: clearImageError, triggerFileSelect: triggerImageSelect, pendingAltText, cancelPendingUpload } = useImageUpload(editor);

// Add before the closing fragment (before the last line of JSX):
{pendingAltText && (
    <AltTextDialog
        fileName={pendingAltText.fileName}
        onConfirm={pendingAltText.resolve}
        onCancel={cancelPendingUpload}
    />
)}
```

**Step 4: Manually test**

Run: `make dev-local`
1. Open editor, click image upload
2. Select an image
3. Alt text dialog should appear after upload completes
4. Enter description, click Add
5. Image should be inserted with the entered alt text
6. Verify in HTML source view

**Step 5: Commit**

```
feat: add alt text dialog for image uploads in editor
```

---

### Task 6: Focus Management on Route Changes + Skip-to-Content Link

**Files:**
- Modify: `frontend/src/layout/Layout.tsx`
- Modify: `frontend/src/pages/_app.tsx`
- Modify: `frontend/src/styles/globals.css`
- Modify: `frontend/e2e/specs/smoke/smoke.spec.ts`

**Step 1: Write e2e test for skip link**

Add to `smoke.spec.ts`:

```typescript
test('skip to content link is accessible via keyboard', async ({ mockApiPage }) => {
  const homePage = new HomePage(mockApiPage);
  await homePage.goto();
  await homePage.waitForLoad();

  // Tab into the page — skip link should become visible
  await mockApiPage.keyboard.press('Tab');
  const skipLink = mockApiPage.getByTestId('skip-to-content');
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeFocused();
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test specs/smoke/smoke.spec.ts --grep "skip to content"`
Expected: FAIL — `skip-to-content` not found.

**Step 3: Add skip-to-content link and main ID to Layout**

In `Layout.tsx`:

```typescript
const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-dvh transition-colors duration-300" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>
            <a
                href="#main-content"
                className="skip-to-content"
                data-testid="skip-to-content"
            >
                Skip to content
            </a>
            <TopNav />
            <main
                id="main-content"
                className="container mx-auto px-6 pt-6"
                style={{ paddingBottom: 'var(--layout-bottom-offset)' }}
                tabIndex={-1}
            >
                {children}
            </main>
            <Footer />
            <BottomNav />
        </div>
    );
};
```

**Step 4: Add skip link styles to globals.css**

In `frontend/src/styles/globals.css`:

```css
.skip-to-content {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 100;
  padding: 0.75rem 1.5rem;
  background: var(--color-brand-primary);
  color: white;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 0.375rem 0;
}

.skip-to-content:focus {
  left: 0;
}

#main-content:focus {
  outline: none;
}
```

**Step 5: Add focus management on route change to _app.tsx**

In `_app.tsx`, add a route change focus handler inside `MyApp`:

```typescript
// Add import
import { useRouter } from 'next/router';

// Inside MyApp component, after the existing useEffect:
const router = useRouter();

useEffect(() => {
    const handleRouteChange = () => {
      const main = document.getElementById('main-content');
      if (main) {
        main.focus({ preventScroll: true });
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
}, [router]);
```

**Step 6: Run test to verify it passes**

Run: `cd frontend && npx playwright test specs/smoke/smoke.spec.ts --grep "skip to content"`
Expected: PASS

**Step 7: Commit**

```
feat: add skip-to-content link and focus management on route changes
```

---

### Task 7: Skip Link Past Infinite Scroll + Landmark Roles

**Files:**
- Modify: `frontend/src/modules/registry/displays/FeedDisplay.tsx`
- Modify: `frontend/src/layout/Layout.tsx`

**Step 1: Add landmark role to FeedDisplay**

In `FeedDisplay.tsx`, wrap the feed in a `section` with appropriate label:

```typescript
export function FeedDisplay<T>({ items, renderItem, onLoadMore, hasMore }: FeedDisplayProps<T>) {
    return (
        <section aria-label="Content feed" className="mt-4">
            <a
                href="#after-feed"
                className="skip-to-content"
            >
                Skip past feed
            </a>
            <InfiniteScroll
                dataLength={items.length}
                next={onLoadMore}
                hasMore={hasMore}
                loader={
                    <div className="flex justify-center items-center py-4" role="status" aria-label="Loading more content">
                        <ClipLoader color="var(--color-brand-primary)" loading={true} size={35} />
                    </div>
                }
                endMessage={
                    <div className="text-center py-4 text-text-secondary">
                        You&apos;ve reached the end
                    </div>
                }
            >
                <div className="flex flex-col space-y-6">
                    {items.map((item, index) => (
                        <React.Fragment key={index}>
                            {renderItem(item)}
                        </React.Fragment>
                    ))}
                </div>
            </InfiniteScroll>
            <div id="after-feed" tabIndex={-1} />
        </section>
    );
}
```

**Step 2: Add landmark roles to Layout**

In `Layout.tsx`, the `<main>` element already provides the main landmark. Ensure TopNav uses `<header>`:

Check TopNav — it uses `<nav>` which is correct. The footer uses `<footer>` which is correct. BottomNav uses `<nav>` with `role="navigation"` and `aria-label` — correct.

No additional landmark changes needed beyond what was done in Task 6.

**Step 3: Manually test with keyboard**

1. Load the home page
2. Tab to skip-to-content, press Enter — focus should move to main content
3. Tab through the feed — when reaching the "Skip past feed" link, press Enter
4. Focus should move past all feed items to the `#after-feed` anchor

**Step 4: Commit**

```
feat: add feed skip link and landmark roles for keyboard navigation
```

---

### Task 8: Fix Footer Pointer-Events Blocking Clicks

**Files:**
- Modify: `frontend/src/layout/Footer.tsx`
- Modify: `frontend/src/templates/default/styles/layout.css`

**Step 1: Refactor footer positioning**

The current approach uses `fixed` + `pointer-events-none` on the footer parent, then `pointer-events-auto` on children. This is fragile.

Replace with: keep the footer fixed but remove `pointer-events-none`. Instead, ensure the main content has enough bottom padding (already handled by `--layout-bottom-offset`) so content never overlaps the footer.

In `Footer.tsx`, remove `pointer-events-none` from the footer and `pointer-events-auto` from children:

```tsx
const Footer: React.FC = () => {
    const copyright = config.site.copyright.replace('{year}', String(new Date().getFullYear()));

    return (
        <footer
            className="fixed left-0 right-0 bottom-0 py-2 px-4 text-xs z-[55]"
            style={{
                backgroundColor: 'var(--color-surface-primary)',
                borderTop: '1px solid var(--color-border-primary)',
                color: 'var(--color-text-secondary)'
            }}
        >
            <div className="container mx-auto flex justify-between items-center">
                <span>{copyright}</span>
                <div className="flex gap-4">
                    {config.footer.links.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:underline">
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
};
```

**Step 2: Verify bottom padding accounts for footer**

Read `layout.css` — `--layout-bottom-offset` already calculates:
```
nav-height + bottom-nav-offset + footer-height + safe-area-inset-bottom
```

This should prevent content from being hidden behind the fixed footer. If it doesn't, increase `--layout-footer-height` to add buffer.

**Step 3: Manually test**

1. Load any page with enough content to scroll
2. Scroll to the bottom
3. Footer links (Privacy, Terms) should be clickable
4. Content should not overlap the footer

**Step 4: Commit**

```
fix: remove pointer-events-none from footer for reliable link clicks
```

---

## Summary

| Task | Description | Files Modified |
|------|-------------|---------------|
| 1 | Home link in TopNav | TopNav.tsx, components.css, e2e |
| 2 | Home item in BottomNav | BottomNav.tsx, e2e |
| 3 | Hide empty hamburger menu | TopNav.tsx, e2e |
| 4 | Autosave + draft recovery | useDraftRecovery.ts (new), useStoryEditor.ts, StoryEditorForm.tsx |
| 5 | Alt text on image upload | AltTextDialog.tsx (new), useImageUpload.ts, RichTextEditor.tsx |
| 6 | Focus management + skip link | Layout.tsx, _app.tsx, globals.css, e2e |
| 7 | Feed skip link + landmarks | FeedDisplay.tsx |
| 8 | Footer pointer-events fix | Footer.tsx |

All 8 commits should be on a single feature branch. Create PR when complete.
