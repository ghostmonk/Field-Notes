import { useState, useEffect } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';

interface ImageBubbleMenuProps {
  editor: Editor | null;
  onChangeFilter?: (currentSrc: string) => void;
}

const SIZE_PRESETS = [
  { label: '25%', value: '25%' },
  { label: '50%', value: '50%' },
  { label: '75%', value: '75%' },
  { label: '100%', value: '100%' },
];

export function ImageBubbleMenu({ editor, onChangeFilter }: ImageBubbleMenuProps) {
  const [altText, setAltText] = useState('');

  useEffect(() => {
    if (!editor) return;
    const updateAlt = () => {
      if (editor.isActive('image')) {
        const attrs = editor.getAttributes('image');
        setAltText(attrs.alt || '');
      }
    };
    updateAlt();
    editor.on('selectionUpdate', updateAlt);
    return () => { editor.off('selectionUpdate', updateAlt); };
  }, [editor]);

  if (!editor) return null;

  const updateAttribute = (attr: string, value: string | null) => {
    editor.chain().focus().updateAttributes('image', { [attr]: value }).run();
  };

  const handleAltBlur = () => {
    updateAttribute('alt', altText);
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e }: { editor: Editor }) => e.isActive('image')}
    >
      <div
        className="flex flex-col gap-2 p-3 rounded-lg shadow-lg border text-sm"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderColor: 'var(--color-border-primary)',
          color: 'var(--color-text-primary)',
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Alt text
          </span>
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onBlur={handleAltBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAltBlur(); } }}
            placeholder="Describe this image..."
            className="rounded border px-2 py-1 text-sm"
            style={{
              borderColor: 'var(--color-border-primary)',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)',
            }}
            data-testid="image-bubble-alt"
          />
        </label>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium mr-1" style={{ color: 'var(--color-text-secondary)' }}>
            Width:
          </span>
          {SIZE_PRESETS.map(({ label, value }) => {
            const current = editor.getAttributes('image').width;
            const isActive = current === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => updateAttribute('width', isActive ? null : value)}
                className={`px-2 py-0.5 rounded text-xs ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                data-testid={`image-bubble-width-${label}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {onChangeFilter && (
          <button
            type="button"
            onClick={() => {
              const attrs = editor.getAttributes('image');
              const src = attrs['data-original-src'] || attrs.src;
              if (src) onChangeFilter(src);
            }}
            className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700"
            data-testid="image-bubble-change-filter"
          >
            Change Filter
          </button>
        )}
      </div>
    </BubbleMenu>
  );
}
