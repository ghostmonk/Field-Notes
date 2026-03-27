<!-- This file is managed by Saguaro. Edit only if you know what you're doing. -->
---
id: ui-primitives-from-component-library
title: UI primitives must come from @/components/ui
severity: warning
globs:
  - frontend/src/modules/**/*.tsx
  - frontend/src/components/**/*.tsx
  - frontend/src/pages/**/*.tsx
  - "!frontend/src/components/ui/**"
tags:
  - architecture
  - ui
  - consistency
---

All standard UI elements — buttons, inputs, textareas, selects, checkboxes, dialogs, form fields, badges, cards, grids, and tabs — must use the corresponding component from `@/components/ui`. Do not create ad-hoc styled `<button>`, `<input>`, `<dialog>`, or `<select>` elements in feature code.

The ui library exports: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Dialog`, `FormField`, `Badge`, `Card`, `Grid`, `Tabs`.

Flag:
- `<button className="...">` outside of `src/components/ui/`
- `<input type="text" className="...">` in modules or pages
- `<dialog>` elements not using the `Dialog` component

Exception: semantic HTML that is not a UI control (e.g., `<section>`, `<article>`, `<nav>`, `<span>`) is fine.

### Violations

```
<button className="bg-blue-500 px-4 py-2 rounded" onClick={handleSave}>Save</button>
```

```
<input type="text" className="border rounded p-2" value={title} onChange={...} />
```

### Compliant

```
<Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
```

```
<Input value={title} onChange={...} />
```
