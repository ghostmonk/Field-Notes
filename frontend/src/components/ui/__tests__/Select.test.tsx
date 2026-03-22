import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from '../Select';

describe('Select', () => {
  it('renders with default class', () => {
    render(
      <Select data-testid="sel">
        <option>A</option>
      </Select>
    );
    expect(screen.getByTestId('sel').className).toContain('select');
  });

  it('applies error class', () => {
    render(
      <Select error data-testid="sel">
        <option>A</option>
      </Select>
    );
    expect(screen.getByTestId('sel').className).toContain('select--error');
  });

  it('merges custom className', () => {
    render(
      <Select className="w-full" data-testid="sel">
        <option>A</option>
      </Select>
    );
    const el = screen.getByTestId('sel');
    expect(el.className).toContain('select');
    expect(el.className).toContain('w-full');
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLSelectElement | null>;
    render(
      <Select ref={ref}>
        <option>A</option>
      </Select>
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('renders children options', () => {
    render(
      <Select data-testid="sel">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>
    );
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
  });
});
