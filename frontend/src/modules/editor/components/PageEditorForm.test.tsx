import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { PageEditorForm } from './PageEditorForm';
import { Section } from '@/shared/types/api';

vi.mock('next/dynamic', () => ({
  default: () => {
    const Component = ({ actionSlot }: { actionSlot?: React.ReactNode }) => (
      <div data-testid="rich-text-editor">Editor{actionSlot}</div>
    );
    Component.displayName = 'DynamicEditor';
    return Component;
  },
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), query: {} }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Admin', email: 'admin@test.com', role: 'admin' }, accessToken: 'token' },
    status: 'authenticated',
  }),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));

vi.mock('@/components/ErrorDisplay', () => ({
  ErrorDisplay: () => null,
  InlineError: () => null,
}));

vi.mock('@/shared/lib/api-client', () => ({
  default: {
    pages: {
      get: vi.fn().mockRejectedValue(new Error('not found')),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: {
    createDisplayError: vi.fn(),
    handleAuthError: vi.fn(),
  },
}));

const mockSection = {
  id: 's1',
  title: 'About',
  slug: 'about',
  content_type: 'page',
  display_type: 'static-page',
  nav_visibility: 'main',
} as Section;

afterEach(cleanup);

describe('PageEditorForm', () => {
  it('renders title input', async () => {
    render(<PageEditorForm section={mockSection} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-title-input')).toBeDefined();
    });
  });

  it('renders save draft button', async () => {
    render(<PageEditorForm section={mockSection} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-save-draft')).toBeDefined();
    });
  });

  it('renders publish button', async () => {
    render(<PageEditorForm section={mockSection} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-publish-button')).toBeDefined();
    });
  });
});
