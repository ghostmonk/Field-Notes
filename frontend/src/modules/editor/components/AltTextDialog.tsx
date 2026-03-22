import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, Input, Button } from '@/components/ui';

interface AltTextDialogProps {
  onConfirm: (altText: string) => void;
}

export function AltTextDialog({ onConfirm }: AltTextDialogProps) {
  const [altText, setAltText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    onConfirm('');
  }, [onConfirm]);

  const handleConfirm = useCallback(() => {
    onConfirm(altText.trim());
  }, [onConfirm, altText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={true} onClose={handleClose} data-testid="alt-text-dialog">
      <Dialog.Header title="Image Description" />
      <Dialog.Body>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
          Describe this image for screen readers and accessibility.
        </p>
        <Input
          ref={inputRef}
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Describe the image..."
          onKeyDown={handleKeyDown}
          data-testid="alt-text-input"
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="primary" size="sm" onClick={handleConfirm} data-testid="alt-text-confirm">
          Add
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
