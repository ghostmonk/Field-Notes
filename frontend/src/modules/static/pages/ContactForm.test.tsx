import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from './ContactForm';

const mockSubmit = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

vi.mock('@/shared/lib/api-client', () => ({
  default: {
    contact: {
      submit: (...args: unknown[]) => mockSubmit(...args),
    },
  },
}));

import { useSession } from 'next-auth/react';

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockSubmit.mockResolvedValue({ status: 'ok' });
  vi.mocked(useSession).mockReturnValue({
    data: null,
    status: 'unauthenticated',
    update: vi.fn(),
  });
});

describe('ContactForm', () => {
  it('renders all fields when unauthenticated', () => {
    render(<ContactForm />);

    expect(screen.getByTestId('contact-name')).toBeInTheDocument();
    expect(screen.getByTestId('contact-email')).toBeInTheDocument();
    expect(screen.getByTestId('contact-message')).toBeInTheDocument();
  });

  it('hides name and email fields when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'user@example.com', name: 'Test User', image: null }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<ContactForm />);

    expect(screen.queryByTestId('contact-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contact-email')).not.toBeInTheDocument();
    expect(screen.getByTestId('contact-message')).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    render(<ContactForm />);

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Message is required')).toBeInTheDocument();
    });
  });

  it('shows success message after submission', async () => {
    render(<ContactForm />);

    fireEvent.change(screen.getByTestId('contact-name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByTestId('contact-email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByTestId('contact-message'), { target: { value: 'Hello there' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByTestId('contact-success')).toBeInTheDocument();
    });
  });

  it('shows error message on submission failure', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('Server error'));

    render(<ContactForm />);

    fireEvent.change(screen.getByTestId('contact-name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByTestId('contact-email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByTestId('contact-message'), { target: { value: 'Hello there' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByTestId('contact-error')).toBeInTheDocument();
    });
  });

  it('includes honeypot field in DOM but hidden', () => {
    render(<ContactForm />);

    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement;
    expect(honeypot).toBeInTheDocument();
    expect(honeypot.tabIndex).toBe(-1);
  });
});
