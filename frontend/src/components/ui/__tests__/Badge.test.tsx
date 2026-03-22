import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders with default class', () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText('Draft').className).toContain('badge');
  });

  it('applies variant class', () => {
    render(<Badge variant="success">Published</Badge>);
    expect(screen.getByText('Published').className).toContain('badge--success');
  });

  it('applies size class', () => {
    render(<Badge size="sm">Tag</Badge>);
    expect(screen.getByText('Tag').className).toContain('badge--sm');
  });

  it('does not add variant class for default', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label').className).toBe('badge');
  });

  it('merges custom className', () => {
    render(<Badge className="ml-2">Label</Badge>);
    const el = screen.getByText('Label');
    expect(el.className).toContain('badge');
    expect(el.className).toContain('ml-2');
  });
});
