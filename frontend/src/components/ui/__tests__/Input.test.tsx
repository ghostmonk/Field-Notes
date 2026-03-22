import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('renders with default class', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('input');
  });

  it('applies inline variant', () => {
    render(<Input variant="inline" data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('input--inline');
  });

  it('applies error class', () => {
    render(<Input error data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('input--error');
  });

  it('merges custom className', () => {
    render(<Input className="w-1/2" data-testid="input" />);
    const el = screen.getByTestId('input');
    expect(el.className).toContain('input');
    expect(el.className).toContain('w-1/2');
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;
    render(<Input ref={ref} data-testid="input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('passes through native props', () => {
    render(<Input type="email" placeholder="Email" data-testid="input" />);
    const el = screen.getByTestId('input') as HTMLInputElement;
    expect(el.type).toBe('email');
    expect(el.placeholder).toBe('Email');
  });
});
