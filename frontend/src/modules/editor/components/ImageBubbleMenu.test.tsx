import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ImageBubbleMenu } from './ImageBubbleMenu';

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="bubble-menu">{children}</div>,
}));

afterEach(cleanup);

describe('ImageBubbleMenu', () => {
  it('returns null when editor is null', () => {
    const { container } = render(<ImageBubbleMenu editor={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders bubble menu when editor provided with active image', () => {
    const mockEditor = {
      isActive: vi.fn().mockReturnValue(true),
      getAttributes: vi.fn().mockReturnValue({ src: '/test.jpg', alt: 'test', width: '100%' }),
      chain: vi.fn().mockReturnValue({
        focus: vi.fn().mockReturnValue({
          updateAttributes: vi.fn().mockReturnValue({ run: vi.fn() }),
        }),
      }),
      on: vi.fn(),
      off: vi.fn(),
    };

    render(<ImageBubbleMenu editor={mockEditor as never} />);
    expect(screen.getByTestId('bubble-menu')).toBeDefined();
    expect(screen.getByTestId('image-bubble-alt')).toBeDefined();
  });
});
