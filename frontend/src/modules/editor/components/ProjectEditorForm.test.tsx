import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProjectEditorForm } from './ProjectEditorForm';
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

vi.mock('../hooks/useProjectEditor', () => ({
  useProjectEditor: () => ({
    project: { title: '', content: '', summary: '', technologies: [], is_published: false, is_featured: false, sort_order: 0, github_url: '', live_url: '', image_url: '' },
    error: null,
    isSaving: false,
    isLoading: false,
    isEditing: false,
    setField: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    resetForm: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock('../../versions/components/VersionHistory', () => ({
  VersionHistory: () => null,
}));

const mockSection = {
  id: 's1',
  title: 'Projects',
  slug: 'projects',
  content_type: 'project',
  display_type: 'card-grid',
  nav_visibility: 'main',
} as Section;

afterEach(cleanup);

describe('ProjectEditorForm', () => {
  it('renders title input', () => {
    render(<ProjectEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-title-input')).toBeDefined();
  });

  it('renders summary input', () => {
    render(<ProjectEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-summary-input')).toBeDefined();
  });

  it('renders save draft button', () => {
    render(<ProjectEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-save-draft')).toBeDefined();
  });

  it('renders publish button', () => {
    render(<ProjectEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-publish-button')).toBeDefined();
  });

  it('renders technologies input', () => {
    render(<ProjectEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-technologies-input')).toBeDefined();
  });
});
