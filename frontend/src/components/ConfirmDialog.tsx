import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, Button } from '@/components/ui';

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
      setPending(prev => {
        if (prev) prev.resolve(false);
        return { ...options, resolve };
      });
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
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Defer focus until after Dialog's showModal() effect runs
    const raf = requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Dialog open={true} onClose={onCancel} data-testid="confirm-dialog">
      <Dialog.Body>
        <h3 className="dialog__title">{title}</h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
          {message}
        </p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          ref={cancelRef}
          variant="secondary"
          size="sm"
          onClick={onCancel}
          data-testid="confirm-cancel"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          data-testid="confirm-ok"
        >
          {confirmLabel}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
