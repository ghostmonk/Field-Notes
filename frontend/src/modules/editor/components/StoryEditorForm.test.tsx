import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StoryEditorForm } from './StoryEditorForm';
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

vi.mock('../hooks/useStoryEditor', () => ({
  useStoryEditor: () => ({
    story: { title: '', content: '', is_published: false },
    error: null,
    isSaving: false,
    isLoading: false,
    isEditing: false,
    setTitle: vi.fn(),
    setContent: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    resetForm: vi.fn(),
    clearError: vi.fn(),
    showDraftRecovery: false,
    recoveredDraft: null,
    acceptDraft: vi.fn(),
    dismissDraft: vi.fn(),
  }),
}));

vi.mock('../hooks/useDraftRecovery', () => ({
  useDraftRecovery: () => ({ hasDraft: false, draft: null, acceptDraft: vi.fn(), dismissDraft: vi.fn() }),
}));

vi.mock('../../versions/components/VersionHistory', () => ({
  VersionHistory: () => null,
}));

const mockSection = {
  id: 's1',
  title: 'Blog',
  slug: 'blog',
  content_type: 'story',
  display_type: 'feed',
  nav_visibility: 'main',
} as Section;

afterEach(cleanup);

describe('StoryEditorForm', () => {
  it('renders title input', () => {
    render(<StoryEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-title-input')).toBeDefined();
  });

  it('renders save draft button', () => {
    render(<StoryEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-save-draft')).toBeDefined();
  });

  it('renders publish button', () => {
    render(<StoryEditorForm section={mockSection} />);
    expect(screen.getByTestId('editor-publish-button')).toBeDefined();
  });
});
