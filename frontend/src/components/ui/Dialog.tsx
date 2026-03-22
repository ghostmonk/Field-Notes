import { useRef, useEffect, ReactNode, forwardRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

interface DialogHeaderProps {
  title: string;
}

interface DialogBodyProps {
  children: ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

function DialogHeader({ title }: DialogHeaderProps) {
  return (
    <div className="dialog__header">
      <h3 className="dialog__title">{title}</h3>
    </div>
  );
}

function DialogBody({ children, className }: DialogBodyProps) {
  const classes = ['dialog__body'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')}>{children}</div>;
}

function DialogFooter({ children, className }: DialogFooterProps) {
  const classes = ['dialog__footer'];
  if (className) classes.push(className);
  return <div className={classes.join(' ')}>{children}</div>;
}

const DialogRoot = forwardRef<HTMLDialogElement, DialogProps>(
  ({ open, onClose, className, children, 'data-testid': dataTestId }, ref) => {
    const internalRef = useRef<HTMLDialogElement | null>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useEffect(() => {
      const dialog = internalRef.current;
      if (!dialog) return;

      if (open) {
        previousFocusRef.current = document.activeElement;
        dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
        (previousFocusRef.current as HTMLElement)?.focus?.();
      }

      return () => {
        // Restore focus when Dialog unmounts while open (e.g., ConfirmDialog)
        if (open) {
          (previousFocusRef.current as HTMLElement)?.focus?.();
        }
      };
    }, [open]);

    const classes = ['dialog'];
    if (className) classes.push(className);

    return (
      <dialog
        ref={(el) => {
          internalRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={classes.join(' ')}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        data-testid={dataTestId}
      >
        {children}
      </dialog>
    );
  }
);

DialogRoot.displayName = 'Dialog';

export const Dialog = Object.assign(DialogRoot, {
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
});
