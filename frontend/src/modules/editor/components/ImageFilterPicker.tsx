import { useRef, useEffect, useState } from 'react';

const FILTER_LABELS: Record<string, string> = {
  none: 'None',
  auto_enhance: 'Auto Enhance',
  warm: 'Warm',
  cool: 'Cool',
  high_contrast: 'High Contrast',
  bw: 'B&W',
  vivid: 'Vivid',
  vintage: 'Vintage',
};

interface ImageFilterPickerProps {
  imageUrl: string;
  previews: Record<string, string>;
  loading: boolean;
  onConfirm: (filter: string) => void;
  onCancel: () => void;
}

export function ImageFilterPicker({
  imageUrl,
  previews,
  loading,
  onConfirm,
  onCancel,
}: ImageFilterPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedFilter, setSelectedFilter] = useState('none');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

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
      onCancel={onCancel}
      data-testid="filter-picker-dialog"
    >
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Choose a Filter</h3>

        <div className="flex justify-center mb-4">
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              maxHeight: '300px',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '0.5rem',
            }}
          />
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center py-8"
            data-testid="filter-picker-loading"
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Generating previews...
            </span>
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            <button
              onClick={() => setSelectedFilter('none')}
              className="flex flex-col items-center flex-shrink-0"
              style={{
                border: selectedFilter === 'none'
                  ? '2px solid var(--color-accent-primary)'
                  : '2px solid transparent',
                borderRadius: '0.5rem',
                padding: '0.25rem',
                background: 'none',
                cursor: 'pointer',
              }}
              data-testid="filter-option-none"
            >
              <img
                src={imageUrl}
                alt="No filter"
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '0.375rem',
                }}
              />
              <span className="text-xs mt-1">None</span>
            </button>

            {Object.entries(FILTER_LABELS).map(([key, label]) => {
              if (key === 'none') return null;
              const previewUrl = previews[key];
              if (!previewUrl) return null;

              return (
                <button
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
                    src={previewUrl}
                    alt={label}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '0.375rem',
                    }}
                  />
                  <span className="text-xs mt-1">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary btn--sm"
            data-testid="filter-picker-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              dialogRef.current?.close();
              onConfirm(selectedFilter);
            }}
            className="btn btn--primary btn--sm"
            data-testid="filter-picker-apply"
            disabled={loading}
          >
            Apply
          </button>
        </div>
      </div>
    </dialog>
  );
}
