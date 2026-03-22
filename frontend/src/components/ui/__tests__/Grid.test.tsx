import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from '../Grid';

describe('Grid', () => {
  it('renders with grid class', () => {
    render(<Grid data-testid="grid">Items</Grid>);
    expect(screen.getByTestId('grid').className).toContain('grid');
  });

  it('applies responsive variant', () => {
    render(
      <Grid variant="responsive" data-testid="grid">
        Items
      </Grid>
    );
    expect(screen.getByTestId('grid').className).toContain('grid--responsive');
  });

  it('applies column variants', () => {
    render(
      <Grid variant="3-col" data-testid="grid">
        Items
      </Grid>
    );
    expect(screen.getByTestId('grid').className).toContain('grid--3-col');
  });

  it('merges custom className', () => {
    render(
      <Grid className="gap-4" data-testid="grid">
        Items
      </Grid>
    );
    const el = screen.getByTestId('grid');
    expect(el.className).toContain('grid');
    expect(el.className).toContain('gap-4');
  });
});
