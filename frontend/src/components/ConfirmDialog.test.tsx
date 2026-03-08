import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function TestConsumer({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      data-testid="trigger"
      onClick={async () => {
        const result = await confirm({
          title: 'Delete Item',
          message: 'Are you sure?',
          confirmLabel: 'Delete',
          destructive: true,
        });
        onResult(result);
      }}
    >
      Delete
    </button>
  );
}

function renderWithProvider(onResult: (v: boolean) => void) {
  return render(
    <ConfirmProvider>
      <TestConsumer onResult={onResult} />
    </ConfirmProvider>
  );
}

describe('ConfirmDialog', () => {
  it('shows dialog when confirm is called', async () => {
    renderWithProvider(vi.fn());
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('displays title and message', async () => {
    renderWithProvider(vi.fn());
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('resolves true on confirm click', async () => {
    const onResult = vi.fn();
    renderWithProvider(onResult);
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-ok'));
    });
    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('resolves false on cancel click', async () => {
    const onResult = vi.fn();
    renderWithProvider(onResult);
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-cancel'));
    });
    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('resolves false on Escape (dialog cancel event)', async () => {
    const onResult = vi.fn();
    renderWithProvider(onResult);
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    await act(async () => {
      const dialog = screen.getByTestId('confirm-dialog');
      dialog.dispatchEvent(new Event('cancel', { bubbles: true }));
    });
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('uses custom confirm label', async () => {
    renderWithProvider(vi.fn());
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByTestId('confirm-ok')).toHaveTextContent('Delete');
  });

  it('applies danger styling when destructive', async () => {
    renderWithProvider(vi.fn());
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByTestId('confirm-ok').className).toContain('btn--danger');
  });

  it('throws when useConfirm is called outside provider', () => {
    function Orphan() {
      useConfirm();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow('useConfirm must be used within ConfirmProvider');
  });
});
