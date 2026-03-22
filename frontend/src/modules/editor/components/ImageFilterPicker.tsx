import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui';

const FILTERS: { key: string; label: string; css: string }[] = [
  { key: 'none', label: 'None', css: 'none' },
  { key: 'auto_enhance', label: 'Auto Enhance', css: 'contrast(1.15) saturate(1.1) brightness(1.02)' },
  { key: 'warm', label: 'Warm', css: 'sepia(0.15) saturate(1.15) brightness(1.02)' },
  { key: 'cool', label: 'Cool', css: 'saturate(0.9) brightness(1.02) hue-rotate(10deg)' },
  { key: 'high_contrast', label: 'High Contrast', css: 'contrast(1.4) brightness(1.02)' },
  { key: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.2)' },
  { key: 'vivid', label: 'Vivid', css: 'saturate(1.5) contrast(1.15) brightness(1.05)' },
  { key: 'vintage', label: 'Vintage', css: 'sepia(0.3) saturate(0.7) contrast(0.95) brightness(0.95)' },
];

interface ImageFilterPickerProps {
  imageUrl: string;
  onConfirm: (filter: string) => void;
  onCancel: () => void;
}

export function ImageFilterPicker({
  imageUrl,
  onConfirm,
  onCancel,
}: ImageFilterPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedFilter, setSelectedFilter] = useState('none');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const selectedCss = FILTERS.find(f => f.key === selectedFilter)?.css ?? 'none';

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg p-0 backdrop:bg-black/50"
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-primary)',
        maxWidth: '40rem',
        width: '100%',
      }}
      onCancel={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }}
      data-testid="filter-picker-dialog"
    >
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Choose a Filter</h3>

        <div
          className="flex justify-center items-center mb-4"
          style={{ height: '300px' }}
        >
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '0.5rem',
              filter: selectedCss,
            }}
          />
        </div>

        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {FILTERS.map(({ key, label, css }) => (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedFilter(key)}
              className="flex flex-col items-center flex-shrink-0"
              style={{
                border: selectedFilter === key
                  ? '2px solid var(--color-accent-primary)'
                  : '2px solid transparent',
                borderRadius: '0.5rem',
                padding: '0.25rem',
                background: 'none',
                cursor: 'pointer',
              }}
              data-testid={`filter-option-${key}`}
            >
              <img
                src={imageUrl}
                alt={label}
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '0.375rem',
                  filter: css,
                }}
              />
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            size="sm"
            data-testid="filter-picker-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(selectedFilter)}
            variant="primary"
            size="sm"
            data-testid="filter-picker-apply"
          >
            Apply
          </Button>
        </div>
      </div>
    </dialog>
  );
}
