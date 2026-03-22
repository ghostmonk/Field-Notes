import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ContactForm } from './ContactForm';
import { ContactInfo } from '@/shared/types/api';

afterEach(cleanup);

const baseContact: ContactInfo = {
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  location: 'Toronto',
  linkedin: 'https://linkedin.com/in/johndoe',
  github: 'https://github.com/johndoe',
  website: 'https://johndoe.com',
  title: 'Staff Engineer',
};

describe('ContactForm', () => {
  it('renders input fields with contact values', () => {
    const onChange = vi.fn();
    render(<ContactForm contact={baseContact} onChange={onChange} />);

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Toronto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://linkedin.com/in/johndoe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://github.com/johndoe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://johndoe.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Staff Engineer')).toBeInTheDocument();
  });

  it('calls onChange when input values change', () => {
    const onChange = vi.fn();
    render(<ContactForm contact={baseContact} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('John Doe'), {
      target: { value: 'Jane Doe' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...baseContact,
      full_name: 'Jane Doe',
    });
  });
});
