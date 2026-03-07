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
