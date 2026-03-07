import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AltTextDialog } from './AltTextDialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AltTextDialog', () => {
  it('calls showModal on mount', () => {
    render(<AltTextDialog onConfirm={vi.fn()} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('focuses the input on mount', () => {
    render(<AltTextDialog onConfirm={vi.fn()} />);
    const input = screen.getByTestId('alt-text-input');
    expect(input).toHaveFocus();
  });

  it('confirms with typed value on Add click', () => {
    const onConfirm = vi.fn();
    render(<AltTextDialog onConfirm={onConfirm} />);

    const input = screen.getByTestId('alt-text-input');
    fireEvent.change(input, { target: { value: 'A sunset photo' } });
    fireEvent.click(screen.getByTestId('alt-text-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('A sunset photo');
  });

  it('confirms with empty string when input is blank', () => {
    const onConfirm = vi.fn();
    render(<AltTextDialog onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId('alt-text-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('confirms on Enter key', () => {
    const onConfirm = vi.fn();
    render(<AltTextDialog onConfirm={onConfirm} />);

    const input = screen.getByTestId('alt-text-input');
    fireEvent.change(input, { target: { value: 'Mountain view' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onConfirm).toHaveBeenCalledWith('Mountain view');
  });

  it('resolves with empty string on Escape (dialog cancel)', () => {
    const onConfirm = vi.fn();
    render(<AltTextDialog onConfirm={onConfirm} />);

    const dialog = screen.getByTestId('alt-text-dialog');
    dialog.dispatchEvent(new Event('cancel', { bubbles: true }));

    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('does not render a Skip button', () => {
    render(<AltTextDialog onConfirm={vi.fn()} />);
    expect(screen.queryByText('Skip')).toBeNull();
  });
});
