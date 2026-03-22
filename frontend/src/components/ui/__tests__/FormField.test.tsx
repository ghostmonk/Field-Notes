import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '../FormField';

describe('FormField', () => {
  it('renders label', () => {
    render(<FormField label="Email"><input /></FormField>);
    expect(screen.getByText('Email')).toBeDefined();
  });

  it('renders error message', () => {
    render(<FormField label="Email" error="Required"><input /></FormField>);
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('renders required indicator', () => {
    render(<FormField label="Email" required><input /></FormField>);
    expect(screen.getByText('*')).toBeDefined();
  });

  it('renders hint when no error', () => {
    render(<FormField label="Email" hint="We won't share"><input /></FormField>);
    expect(screen.getByText("We won't share")).toBeDefined();
  });

  it('hides hint when error present', () => {
    render(<FormField label="Email" hint="hint" error="Required"><input /></FormField>);
    expect(screen.queryByText('hint')).toBeNull();
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('renders children', () => {
    render(<FormField label="Name"><input data-testid="inner" /></FormField>);
    expect(screen.getByTestId('inner')).toBeDefined();
  });
});
