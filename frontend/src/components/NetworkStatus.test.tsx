import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { NetworkStatus } from './NetworkStatus';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NetworkStatus', () => {
  it('renders nothing when online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { container } = render(<NetworkStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('shows banner when initially offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<NetworkStatus />);
    expect(screen.getByTestId('network-status-offline')).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('shows banner when going offline after mount', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<NetworkStatus />);
    expect(screen.queryByTestId('network-status-offline')).toBeNull();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('network-status-offline')).toBeInTheDocument();
  });

  it('hides banner when coming back online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<NetworkStatus />);
    expect(screen.getByTestId('network-status-offline')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByTestId('network-status-offline')).toBeNull();
  });

  it('has role="alert" for screen readers', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<NetworkStatus />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
