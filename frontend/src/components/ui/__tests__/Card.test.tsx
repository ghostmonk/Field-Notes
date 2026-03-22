import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('renders with default card class', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card').className).toContain('card');
  });

  it('applies variant class', () => {
    render(
      <Card variant="draft" data-testid="card">
        Content
      </Card>
    );
    expect(screen.getByTestId('card').className).toContain('card--draft');
  });

  it('applies hoverable class', () => {
    render(
      <Card hoverable data-testid="card">
        Content
      </Card>
    );
    expect(screen.getByTestId('card').className).toContain('card--hoverable');
  });

  it('renders as anchor when as="a"', () => {
    render(
      <Card as="a" href="/test" data-testid="card">
        Link Card
      </Card>
    );
    const el = screen.getByTestId('card');
    expect(el.tagName).toBe('A');
    expect(el.className).toContain('card--link');
  });

  it('renders subcomponents', () => {
    render(
      <Card>
        <Card.Body data-testid="body">Body</Card.Body>
        <Card.Footer data-testid="footer">Footer</Card.Footer>
      </Card>
    );
    expect(screen.getByTestId('body')).toBeDefined();
    expect(screen.getByTestId('footer')).toBeDefined();
  });

  it('does not add variant class for default', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card').className).toBe('card');
  });
});
