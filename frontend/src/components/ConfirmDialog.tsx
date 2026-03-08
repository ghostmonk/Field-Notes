import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const handleResult = useCallback((value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  }, [pending]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <ConfirmDialogInner
          title={pending.title}
          message={pending.message}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          destructive={pending.destructive}
          onConfirm={() => handleResult(true)}
          onCancel={() => handleResult(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx.confirm;
}

interface ConfirmDialogInnerProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialogInner({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogInnerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg p-0 backdrop:bg-black/50"
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-primary)',
        maxWidth: '24rem',
        width: '100%',
      }}
      onCancel={onCancel}
      data-testid="confirm-dialog"
    >
      <div className="p-6">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn btn--secondary btn--sm"
            data-testid="confirm-cancel"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn btn--sm ${destructive ? 'btn--danger' : 'btn--primary'}`}
            data-testid="confirm-ok"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
