import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders with checkbox class', () => {
    render(<Checkbox data-testid="cb" />);
    expect(screen.getByTestId('cb').className).toContain('checkbox');
  });

  it('renders as checkbox type', () => {
    render(<Checkbox data-testid="cb" />);
    expect((screen.getByTestId('cb') as HTMLInputElement).type).toBe(
      'checkbox'
    );
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;
    render(<Checkbox ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });

  it('merges custom className', () => {
    render(<Checkbox className="ml-2" data-testid="cb" />);
    const el = screen.getByTestId('cb');
    expect(el.className).toContain('checkbox');
    expect(el.className).toContain('ml-2');
  });
});
