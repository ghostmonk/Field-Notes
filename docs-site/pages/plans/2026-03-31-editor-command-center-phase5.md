# Editor Command Center — Phase 5: Context Menu Actions + Section Deletion

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the four context menu actions in SectionTree (Add Content, Add Child Section, Edit Settings, Delete) and implement section deletion with cascade safety. Also wire the sidebar "Add Section" button for root-level section creation.

**Architecture:** Context menu handlers are callback props passed from AdminSidebar into SectionTree. "Add Content" navigates to the editor. "Add Child Section" opens AddSectionDialog with a parent_id. "Edit Settings" selects the section and switches to the Settings tab. "Delete" opens a confirmation dialog, then calls the existing `useSectionMutations.deleteSection`. The sidebar "Add Section" button opens AddSectionDialog with no parent_id (root-level). Tab selection state is lifted to AdminDetailPanel so context menu can programmatically switch tabs.

**Tech Stack:** Existing shadcn/ui components (AlertDialog, ContextMenu), existing AddSectionDialog, existing useSectionMutations, Next.js router

---

### Task 1: Lift active tab state to AdminDetailPanel

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminDetailPanel.tsx`

**Step 1: Convert Tabs from uncontrolled to controlled**

Replace `defaultValue="content"` with controlled `value` + `onValueChange` state. Add an `activeTab` prop so external callers (context menu) can set the tab. Reset to "content" when section changes using the existing `key={section.id}` pattern — or use a `useEffect` that resets tab when `section.id` changes.

```tsx
// Add prop
interface AdminDetailPanelProps {
  section: Section | null;
  treeData: SectionTreeData;
  onSelectSection: (id: string) => void;
  onRefetchTree: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

// Inside component:
const [tab, setTab] = useState("content");

// Reset tab when section changes
useEffect(() => {
  setTab("content");
}, [section?.id]);

// If external tab request comes in, honor it
useEffect(() => {
  if (activeTab) setTab(activeTab);
}, [activeTab]);

// Tabs becomes controlled:
<Tabs value={tab} onValueChange={setTab} ...>
```

**Step 2: Commit**

```bash
git add frontend/src/modules/admin/components/AdminDetailPanel.tsx
git commit -m "feat: lift tab state to controlled mode for programmatic tab switching"
```

---

### Task 2: Add context menu callback props to SectionTree

**Files:**
- Modify: `frontend/src/modules/admin/components/SectionTree.tsx`

**Step 1: Add callback props to the interface**

```tsx
interface SectionTreeProps {
  // ... existing props
  onAddContent?: (sectionId: string) => void;
  onAddChildSection?: (parentId: string) => void;
  onEditSettings?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string, sectionTitle: string) => void;
}
```

**Step 2: Wire context menu items to callbacks**

Each `ContextMenuItem` gets an `onClick` handler that calls the corresponding prop with the item's section ID. The section data is available from `treeData[item.getId()]`.

```tsx
<ContextMenuItem
  onClick={() => onAddContent?.(item.getId())}
  data-testid={`ctx-add-content-${itemData.slug}`}
>
```

Same pattern for all four items. "Delete" passes both `sectionId` and `sectionTitle` for the confirmation dialog message.

**Step 3: Commit**

```bash
git add frontend/src/modules/admin/components/SectionTree.tsx
git commit -m "feat: wire context menu items to callback props"
```

---

### Task 3: Wire context menu handlers in AdminSidebar

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminSidebar.tsx`

**Step 1: Add handler props to AdminSidebar interface**

AdminSidebar needs to forward context menu actions up to AdminLayout (which owns routing and tab state). Add callback props:

```tsx
interface AdminSidebarProps {
  // ... existing props
  onAddContent: (sectionId: string) => void;
  onAddChildSection: (parentId: string) => void;
  onEditSettings: (sectionId: string) => void;
  onDeleteSection: (sectionId: string, sectionTitle: string) => void;
  onAddRootSection: () => void;
}
```

**Step 2: Wire the "Add Section" button in the sidebar header**

The sidebar has an "Add Section" button that currently does nothing. Wire it to `onAddRootSection`.

**Step 3: Pass callbacks through to SectionTree**

Forward the context menu callbacks to the `SectionTree` component.

**Step 4: Commit**

```bash
git add frontend/src/modules/admin/components/AdminSidebar.tsx
git commit -m "feat: wire sidebar context menu handlers and add section button"
```

---

### Task 4: Implement handlers in AdminLayout

**Files:**
- Modify: `frontend/src/modules/admin/components/AdminLayout.tsx`

This is the orchestration layer. AdminLayout owns routing (section selection), the section tree data, and now tab state.

**Step 1: Add state for tab control and dialog management**

```tsx
const [activeTab, setActiveTab] = useState<string | undefined>();
const [addSectionParentId, setAddSectionParentId] = useState<string | null | undefined>(undefined);
// undefined = dialog closed, null = root section, string = child of that section
const [deleteSectionTarget, setDeleteSectionTarget] = useState<{ id: string; title: string } | null>(null);
```

**Step 2: Implement context menu handlers**

- `handleAddContent(sectionId)` — navigate to `/editor?section_id={sectionId}` via `router.push`
- `handleAddChildSection(parentId)` — set `addSectionParentId` to open the dialog
- `handleEditSettings(sectionId)` — select the section and set `activeTab` to "settings"
- `handleDeleteSection(sectionId, title)` — set `deleteSectionTarget` to open the delete dialog
- `handleAddRootSection()` — set `addSectionParentId` to `null` to open dialog for root section

**Step 3: Render AddSectionDialog and delete confirmation**

Import `AddSectionDialog` (already exists from Phase 3). Render it conditionally when `addSectionParentId !== undefined`. On success, refetch tree and close dialog.

For delete, use an `AlertDialog` with confirmation. On confirm, call `useSectionMutations.deleteSection`, then refetch tree and deselect the section if it was the one deleted.

**Step 4: Pass tab control props to AdminDetailPanel**

```tsx
<AdminDetailPanel
  section={selectedSection}
  treeData={treeData}
  onSelectSection={handleSelectSection}
  onRefetchTree={refetch}
  activeTab={activeTab}
  onTabChange={() => setActiveTab(undefined)}
/>
```

**Step 5: Run type check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

**Step 6: Commit**

```bash
git add frontend/src/modules/admin/components/AdminLayout.tsx
git commit -m "feat: implement context menu handlers in admin layout"
```

---

### Task 5: Section delete confirmation dialog

**Files:**
- Create: `frontend/src/modules/admin/components/DeleteSectionDialog.tsx`

**Step 1: Create the dialog component**

Uses shadcn AlertDialog (already installed). Shows section title, warns about child sections if any exist (check `treeData` for children of the target section). Calls `onConfirm` on confirmation.

```tsx
interface DeleteSectionDialogProps {
  sectionTitle: string;
  hasChildren: boolean;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

Warning text varies:
- No children: "This will permanently delete the section '{title}'."
- Has children: "This will permanently delete the section '{title}' and all its child sections. Content in deleted sections will become orphaned."

**Step 2: Wire into AdminLayout**

Replace the inline AlertDialog approach from Task 4 with this component. Pass `hasChildren` by checking if any section in `treeData` has `parent_id` matching the target.

**Step 3: Commit**

```bash
git add frontend/src/modules/admin/components/DeleteSectionDialog.tsx frontend/src/modules/admin/components/AdminLayout.tsx
git commit -m "feat: add section delete confirmation dialog with child warning"
```

---

### Task 6: Verify AddSectionDialog supports parent_id

**Files:**
- Modify (if needed): `frontend/src/modules/admin/components/AddSectionDialog.tsx`

**Step 1: Read AddSectionDialog and verify it accepts parentId**

The dialog was created in Phase 3. Verify it passes `parent_id` in the `CreateSectionRequest` when provided. If not, add it.

For root-level creation (`parentId === null`), `parent_id` should be omitted from the request.

**Step 2: Verify the dialog title reflects context**

- Root: "Add Section"
- Child: "Add Child Section"

**Step 3: Commit if changes needed**

```bash
git add frontend/src/modules/admin/components/AddSectionDialog.tsx
git commit -m "fix: ensure AddSectionDialog supports parent_id for child sections"
```

---

### Task 7: Manual QA and fixes

**Step 1: Start dev environment**

```bash
make dev-local
```

**Step 2: Test context menu actions**

Navigate to `/admin`. Right-click a section in the tree. Verify:
- "Add Content" navigates to `/editor?section_id={id}`
- "Add Child Section" opens AddSectionDialog, creates child section, tree refreshes
- "Edit Settings" selects the section and switches to the Settings tab
- "Delete" opens confirmation dialog
  - Cancel closes dialog without action
  - Confirm deletes section, deselects if it was selected, tree refreshes

**Step 3: Test sidebar "Add Section" button**

Click the "Add Section" button. Verify:
- Opens AddSectionDialog with no parent (root-level)
- Creates section at root level
- Tree refreshes showing new section

**Step 4: Test section deletion edge cases**

- Delete a section with child sections — verify warning message appears
- Delete a section with content — verify it succeeds (content becomes orphaned)
- Delete the currently selected section — verify it deselects cleanly
- Delete a non-selected section — verify selection doesn't change

**Step 5: Test tab switching**

- Select a section (lands on Content tab)
- Right-click a different section → "Edit Settings" — verify it selects that section AND switches to Settings tab
- Select a section, switch to Assets tab, then select a different section — verify tab resets to Content

**Step 6: Run formatting and tests**

```bash
make format
make test-frontend-unit
make test
```

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address phase 5 QA issues"
```

---

### Task 8: Create PR

**Step 1: Push branch**

```bash
git push -u origin ghostmonk/125_editor-command-center-phase5
```

**Step 2: Create draft PR**

```bash
gh pr create --draft \
  --title "feat: editor command center context menu actions + section deletion (Phase 5)" \
  --body "$(cat <<'EOF'
## Summary
- Wire all four section tree context menu actions: Add Content, Add Child Section, Edit Settings, Delete
- Section deletion with confirmation dialog and child section warning
- Sidebar "Add Section" button creates root-level sections
- Controlled tab state allows programmatic tab switching from context menu
- Tab resets to Content when section selection changes

## Test plan
- [ ] Right-click context menu: Add Content navigates to editor
- [ ] Right-click context menu: Add Child Section opens dialog, creates child
- [ ] Right-click context menu: Edit Settings selects section and switches to Settings tab
- [ ] Right-click context menu: Delete opens confirmation, deletes on confirm
- [ ] Delete dialog warns about child sections when applicable
- [ ] Deleting selected section deselects cleanly
- [ ] Sidebar "Add Section" creates root-level section
- [ ] Tab resets to Content on section change
- [ ] Selecting section via context menu Edit Settings switches to Settings tab
EOF
)"
```
