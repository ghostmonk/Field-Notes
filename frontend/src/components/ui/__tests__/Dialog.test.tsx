import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog } from '../Dialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

describe('Dialog', () => {
  it('renders with dialog class', () => {
    render(
      <Dialog open onClose={() => {}}>
        <Dialog.Body>Content</Dialog.Body>
      </Dialog>
    );
    expect(screen.getByRole('dialog').className).toContain('dialog');
  });

  it('renders title via Header', () => {
    render(
      <Dialog open onClose={() => {}}>
        <Dialog.Header title="Confirm" />
        <Dialog.Body>Content</Dialog.Body>
      </Dialog>
    );
    expect(screen.getByText('Confirm')).toBeDefined();
  });

  it('renders footer with children', () => {
    render(
      <Dialog open onClose={() => {}}>
        <Dialog.Body>Content</Dialog.Body>
        <Dialog.Footer>
          <button>OK</button>
        </Dialog.Footer>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeDefined();
  });

  it('calls showModal when open', () => {
    render(
      <Dialog open onClose={() => {}}>
        <Dialog.Body>Content</Dialog.Body>
      </Dialog>
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('calls onClose on cancel event', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose}>
        <Dialog.Body>Content</Dialog.Body>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog');
    const cancelEvent = new Event('cancel', { bubbles: true });
    dialog.dispatchEvent(cancelEvent);
    expect(onClose).toHaveBeenCalled();
  });
});
