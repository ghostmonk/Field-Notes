# Editor Command Center — Phase 1: Shadcn Setup + Shell

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install shadcn/ui and build the command center layout shell with tree sidebar, tabbed detail panel, and desktop-only gate.

**Architecture:** New `/admin` page that bypasses the site Layout (TopNav/Footer) and uses its own full-screen admin layout. shadcn components installed under `@/components/admin-ui/` to avoid conflicts with existing `@/components/ui/` barrel. Per-page layout pattern in `_app.tsx` lets the admin page opt out of the site chrome.

**Tech Stack:** shadcn/ui, Radix UI primitives, Tailwind CSS v4, Next.js 16 Pages Router, React 19

---

### Task 1: Install shadcn/ui and Dependencies

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/components.json`
- Modify: `frontend/src/styles/globals.css` (add shadcn CSS variables)
- Modify: `frontend/src/lib/utils.ts` (shadcn cn helper)

**Step 1: Install shadcn dependencies**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-command-center/frontend
npm install class-variance-authority clsx tailwind-merge lucide-react
```

**Step 2: Create the cn utility**

Create `frontend/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3: Create components.json for shadcn CLI**

Create `frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components/admin-ui",
    "utils": "@/lib/utils",
    "hooks": "@/hooks",
    "ui": "@/components/admin-ui"
  }
}
```

**Step 4: Add shadcn CSS variables to globals.css**

Add to `frontend/src/styles/globals.css` after the existing body styles:

```css
:root {
  --radius: 0.5rem;
}

.admin-theme {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.965 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --sidebar-background: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.965 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.admin-theme.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --sidebar-background: oklch(0.175 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.985 0 0);
  --sidebar-primary-foreground: oklch(0.205 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}
```

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components.json frontend/src/lib/utils.ts frontend/src/styles/globals.css
git commit -m "chore: install shadcn/ui dependencies and configure for admin-ui"
```

---

### Task 2: Add Core shadcn Components

**Files:**
- Create: `frontend/src/components/admin-ui/button.tsx`
- Create: `frontend/src/components/admin-ui/tabs.tsx`
- Create: `frontend/src/components/admin-ui/scroll-area.tsx`
- Create: `frontend/src/components/admin-ui/separator.tsx`
- Create: `frontend/src/components/admin-ui/tooltip.tsx`
- Create: `frontend/src/components/admin-ui/input.tsx`

**Step 1: Add shadcn components via CLI**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-command-center/frontend
npx shadcn@latest add button tabs scroll-area separator tooltip input --yes
```

Verify files were created in `src/components/admin-ui/` (not `src/components/ui/`).

**Step 2: Verify imports resolve**

Create a temporary test — open any admin-ui component file and confirm it imports from `@/lib/utils` correctly.

**Step 3: Commit**

```bash
git add frontend/src/components/admin-ui/
git commit -m "feat: add core shadcn components for admin command center"
```

---

### Task 3: Per-Page Layout Pattern in _app.tsx

The command center must bypass the site Layout (TopNav, Footer). Next.js Pages Router supports this via a `getLayout` pattern on page components.

**Files:**
- Modify: `frontend/src/pages/_app.tsx`
- Create: `frontend/src/shared/types/page.ts`

**Step 1: Define the NextPageWithLayout type**

Create `frontend/src/shared/types/page.ts`:

```typescript
import { NextPage } from "next";
import { ReactElement, ReactNode } from "react";

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};
```

**Step 2: Update _app.tsx to support per-page layouts**

In `frontend/src/pages/_app.tsx`, modify the `MyApp` function to check for `Component.getLayout`. If present, use it instead of the default Layout wrapper.

Current code wraps everything in `<Layout>`:
```tsx
<Layout>
    <BackendWarmupBanner ... />
    <div ref={mainRef}>
        <Component {...pageProps} />
    </div>
</Layout>
```

Change to:
```tsx
import { NextPageWithLayout } from "@/shared/types/page";

// Update AppProps type
function MyApp({ Component, pageProps }: AppProps & { Component: NextPageWithLayout }) {
    // ... existing code ...

    const getLayout = Component.getLayout ?? ((page) => (
        <Layout>
            <BackendWarmupBanner
                isWarming={isWarming}
                warmupFailed={warmupFailed}
                onRetry={handleWarmupRetry}
            />
            <div ref={mainRef}>
                {page}
            </div>
        </Layout>
    ));

    return (
        <SessionProvider session={pageProps.session} refetchInterval={4 * 60}>
            <ToastProvider>
                <SessionGuard>
                    <ConfirmProvider>
                        <Head>
                            <meta
                                name="viewport"
                                content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes"
                            />
                            <meta name="author" content={getSiteConfig().site.author}/>
                            <link rel="canonical" href="https://ghostmonk.com/"/>
                        </Head>
                        <NetworkStatus />
                        {getLayout(<Component {...pageProps} />)}
                    </ConfirmProvider>
                </SessionGuard>
            </ToastProvider>
        </SessionProvider>
    );
}
```

**Step 3: Verify existing pages still render with Layout**

Run: `cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-command-center && make dev-local`

Load any page (home, a section, editor) — confirm TopNav/Footer still appear. The default fallback layout handles all existing pages.

**Step 4: Commit**

```bash
git add frontend/src/shared/types/page.ts frontend/src/pages/_app.tsx
git commit -m "feat: add per-page layout support to _app.tsx"
```

---

### Task 4: Admin Command Center Layout Component

**Files:**
- Create: `frontend/src/modules/admin/components/AdminLayout.tsx`
- Create: `frontend/src/modules/admin/components/AdminSidebar.tsx`
- Create: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`
- Create: `frontend/src/modules/admin/components/AdminDesktopGate.tsx`

**Step 1: Create the desktop-only gate**

Create `frontend/src/modules/admin/components/AdminDesktopGate.tsx`:

```tsx
import { useEffect, useState } from "react";

const DESKTOP_MIN_WIDTH = 1024;

export function AdminDesktopGate({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= DESKTOP_MIN_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isDesktop) {
    return (
      <div className="flex h-dvh items-center justify-center p-8 text-center" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Command Center</h1>
          <p className="text-muted-foreground">
            The command center requires a desktop browser. Use the site navigation to manage content on mobile.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

**Step 2: Create the sidebar placeholder**

Create `frontend/src/modules/admin/components/AdminSidebar.tsx`:

```tsx
import { ScrollArea } from "@/components/admin-ui/scroll-area";
import { Input } from "@/components/admin-ui/input";
import { Button } from "@/components/admin-ui/button";
import { Separator } from "@/components/admin-ui/separator";
import { Plus, Search } from "lucide-react";

interface AdminSidebarProps {
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
}

export function AdminSidebar({ selectedSectionId, onSelectSection }: AdminSidebarProps) {
  return (
    <div
      className="flex h-full w-72 flex-col border-r"
      style={{ borderColor: 'var(--sidebar-border)', backgroundColor: 'var(--sidebar-background)' }}
    >
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--sidebar-foreground)' }}>Sections</h2>
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          <Input
            placeholder="Filter sections..."
            className="pl-9"
            data-testid="admin-section-filter"
          />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }} data-testid="admin-tree-placeholder">
            Section tree will render here
          </p>
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          data-testid="admin-add-root-section"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Create the detail panel placeholder**

Create `frontend/src/modules/admin/components/AdminDetailPanel.tsx`:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin-ui/tabs";
import { ScrollArea } from "@/components/admin-ui/scroll-area";

interface AdminDetailPanelProps {
  selectedSectionId: string | null;
}

export function AdminDetailPanel({ selectedSectionId }: AdminDetailPanelProps) {
  if (!selectedSectionId) {
    return (
      <div className="flex flex-1 items-center justify-center" data-testid="admin-dashboard">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--foreground)' }}>Command Center</h1>
          <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
            Select a section to manage its content, or view site-wide stats here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col" data-testid="admin-detail-panel">
      <Tabs defaultValue="content" className="flex flex-1 flex-col">
        <div className="border-b px-6 pt-4" style={{ borderColor: 'var(--border)' }}>
          <TabsList>
            <TabsTrigger value="content" data-testid="admin-tab-content">Content</TabsTrigger>
            <TabsTrigger value="assets" data-testid="admin-tab-assets">Assets</TabsTrigger>
            <TabsTrigger value="settings" data-testid="admin-tab-settings">Settings</TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="flex-1">
          <TabsContent value="content" className="p-6 mt-0">
            <p style={{ color: 'var(--muted-foreground)' }} data-testid="admin-content-placeholder">
              Content list will render here
            </p>
          </TabsContent>
          <TabsContent value="assets" className="p-6 mt-0">
            <p style={{ color: 'var(--muted-foreground)' }} data-testid="admin-assets-placeholder">
              Assets grid will render here
            </p>
          </TabsContent>
          <TabsContent value="settings" className="p-6 mt-0">
            <p style={{ color: 'var(--muted-foreground)' }} data-testid="admin-settings-placeholder">
              Section settings will render here
            </p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
```

**Step 4: Create the main AdminLayout**

Create `frontend/src/modules/admin/components/AdminLayout.tsx`:

```tsx
import { AdminDesktopGate } from "./AdminDesktopGate";
import { AdminSidebar } from "./AdminSidebar";
import { AdminDetailPanel } from "./AdminDetailPanel";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export function AdminLayout() {
  const router = useRouter();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  useEffect(() => {
    const sectionId = router.query.section as string | undefined;
    setSelectedSectionId(sectionId ?? null);
  }, [router.query.section]);

  const handleSelectSection = (id: string | null) => {
    setSelectedSectionId(id);
    const query = id ? { section: id } : {};
    router.replace({ pathname: "/admin", query }, undefined, { shallow: true });
  };

  return (
    <AdminDesktopGate>
      <div
        className="admin-theme flex h-dvh"
        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
        data-testid="admin-command-center"
      >
        <AdminSidebar
          selectedSectionId={selectedSectionId}
          onSelectSection={handleSelectSection}
        />
        <AdminDetailPanel selectedSectionId={selectedSectionId} />
      </div>
    </AdminDesktopGate>
  );
}
```

**Step 5: Commit**

```bash
git add frontend/src/modules/admin/
git commit -m "feat: add admin command center layout components"
```

---

### Task 5: Admin Page with Custom Layout

**Files:**
- Create: `frontend/src/pages/admin/index.tsx`

**Step 1: Create the admin index page**

The existing `/admin/sections` stays. This new `/admin` (index) is the command center entry point. It uses `getLayout` to bypass the site chrome.

Create `frontend/src/pages/admin/index.tsx`:

```tsx
import { ReactElement } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { AdminLayout } from "@/modules/admin/components/AdminLayout";
import { NextPageWithLayout } from "@/shared/types/page";
import Head from "next/head";

const AdminPage: NextPageWithLayout = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="admin-theme flex h-dvh items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Command Center</title>
      </Head>
      <AdminLayout />
    </>
  );
};

AdminPage.getLayout = (page: ReactElement) => page;

export default AdminPage;
```

**Step 2: Run the dev server and verify**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-command-center && make dev-local
```

Verify:
1. `http://localhost:3000/admin` — Shows the command center (full screen, no TopNav/Footer, sidebar + detail panel)
2. `http://localhost:3000/admin` on narrow viewport — Shows desktop-only message
3. `http://localhost:3000/admin/sections` — Existing admin sections page still works with normal Layout
4. `http://localhost:3000/` — Home page still has TopNav/Footer

**Step 3: Commit**

```bash
git add frontend/src/pages/admin/index.tsx
git commit -m "feat: add admin command center page with custom layout"
```

---

### Task 6: Run Formatting and Tests

**Step 1: Run formatter**

```bash
cd /Users/ghostmonk/Documents/code/field-notes/.worktrees/editor-command-center && make format
```

Fix any lint issues.

**Step 2: Run frontend unit tests**

```bash
make test-frontend-unit
```

Fix any failures. Existing tests should pass — we haven't modified existing components.

**Step 3: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: formatting and type fixes for admin command center"
```

---

### Task 7: Dark Mode Support

The command center needs to respect the site's dark mode toggle. The `.admin-theme` class provides light/dark variables, but needs to respond to the same `.dark` class mechanism.

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminLayout.tsx`

**Step 1: Add dark class awareness**

Modify `AdminLayout.tsx` — the `admin-theme` div needs to also carry the `dark` class when the site is in dark mode. Check how the existing theme toggle works.

Read `frontend/src/components/ThemeToggle.tsx` to see how dark mode class is applied (likely on `document.documentElement` or a root div).

If dark mode uses a `.dark` class on `<html>` or `<body>`, update the CSS in globals.css so `.admin-theme.dark` matches when `.dark` is on an ancestor. The CSS already handles `.admin-theme.dark` — verify it chains correctly.

Update the admin-theme div:

```tsx
<div
  className="admin-theme flex h-dvh"
  // ...
>
```

If the dark class is on `<html>`, change the CSS selector from `.admin-theme.dark` to `.dark .admin-theme`:

```css
.dark .admin-theme {
  /* dark mode variables */
}
```

**Step 2: Verify both modes**

Toggle dark mode while on `/admin`. Both light and dark should work.

**Step 3: Commit**

```bash
git add frontend/src/styles/globals.css frontend/src/modules/admin/
git commit -m "fix: dark mode support for admin command center"
```
