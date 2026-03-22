import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn.className).toContain('btn');
    expect(btn.className).not.toContain('btn--');
  });

  it('applies variant class', () => {
    render(<Button variant="primary">Submit</Button>);
    expect(screen.getByRole('button').className).toContain('btn--primary');
  });

  it('applies size class', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').className).toContain('btn--sm');
  });

  it('merges custom className', () => {
    render(<Button className="mt-4">Spaced</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('mt-4');
  });

  it('renders as anchor when as="a"', () => {
    render(
      <Button as="a" href="/test">
        Link
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link.tagName).toBe('A');
    expect(link.className).toContain('btn');
  });

  it('shows loading state', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('passes through native button props', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Native</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
