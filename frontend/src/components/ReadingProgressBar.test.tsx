import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ReadingProgressBar } from './ReadingProgressBar';

describe('ReadingProgressBar', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders with progress fill element', () => {
    render(<ReadingProgressBar />);
    const fill = screen.getByTestId('progress-bar-fill');
    expect(fill).toBeDefined();
    expect(fill.style.width).toMatch(/^\d+%$/);
  });

  it('has correct aria attributes', () => {
    render(<ReadingProgressBar />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });
});
