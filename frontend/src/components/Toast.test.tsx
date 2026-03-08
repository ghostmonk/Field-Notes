import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function TestConsumer() {
  const { showToast } = useToast();
  return (
    <div>
      <button data-testid="show-success" onClick={() => showToast('Saved')}>Success</button>
      <button data-testid="show-error" onClick={() => showToast('Failed', 'error')}>Error</button>
      <button data-testid="show-info" onClick={() => showToast('Note', 'info')}>Info</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>
  );
}

describe('Toast', () => {
  it('shows a success toast when triggered', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('show-success'));
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows an error toast when triggered', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('show-error'));
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('dismisses toast on close button click', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('show-success'));
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss notification'));
    expect(screen.queryByTestId('toast-success')).toBeNull();
  });

  it('auto-dismisses success toast after timeout', () => {
    vi.useFakeTimers();
    renderWithProvider();
    fireEvent.click(screen.getByTestId('show-success'));
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByTestId('toast-success')).toBeNull();
    vi.useRealTimers();
  });

  it('does not auto-dismiss error toasts', () => {
    vi.useFakeTimers();
    renderWithProvider();
    fireEvent.click(screen.getByTestId('show-error'));
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows multiple toasts simultaneously', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('show-success'));
    fireEvent.click(screen.getByTestId('show-error'));
    expect(screen.getByTestId('toast-success')).toBeInTheDocument();
    expect(screen.getByTestId('toast-error')).toBeInTheDocument();
  });

  it('throws when useToast is called outside provider', () => {
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow('useToast must be used within ToastProvider');
  });
});
