# Rich Text Editor

The content editor is built on TipTap (ProseMirror) with custom extensions for image and video uploads.

## Toolbar

The toolbar provides formatting controls:

- **Text**: Bold, Italic
- **Headings**: H1, H2, H3
- **Lists**: Bullet List, Ordered List
- **Block elements**: Blockquote, Code Block
- **Links**: URL with optional link text
- **Media**: Image upload, Video upload
- **History**: Undo, Redo
- **Mode**: Visual / HTML source toggle

## HTML Source Editor

Click the **HTML** button to switch from the visual editor to a raw HTML textarea. The editor formats the HTML with one tag per line (preserving `<pre>` block content). Edits in HTML mode are debounced before propagating to the parent form, and round-trip back through TipTap's parser when switching to Visual mode.

All formatting toolbar buttons are disabled while in HTML mode.

## Link Insertion

The link tool supports two workflows:

1. **Selected text**: Select text in the editor, click Link, enter a URL. The selected text becomes the link.
2. **No selection**: Click Link, enter both a URL and optional link text. The text is inserted with the link mark attached.

## Edit Button on Story Detail

When a logged-in user has edit permissions (admin or story author), an **Edit** button appears next to the story title on the detail page. Clicking it navigates to the editor with the story loaded.

## Prose Typography

Story content renders with the `prose--card` class which provides:

- Distinct heading sizes (H1 through H6) with serif font
- Paragraph spacing with relaxed line height
- Drop cap on the first paragraph (excluded from truncated card previews)
- Styled blockquotes with decorative opening quote mark
- Dark-themed code blocks using `--color-code-bg` / `--color-code-text` tokens
- Styled inline code with border and background
- Gradient horizontal rules
