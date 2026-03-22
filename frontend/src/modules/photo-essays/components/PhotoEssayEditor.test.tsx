import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PhotoEssayEditor } from './PhotoEssayEditor';

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), query: {} }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  default: {
    photoEssays: {
      getById: vi.fn().mockRejectedValue(new Error('not found')),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/shared/utils/uploadUtils', () => ({
  resizeImageFile: vi.fn().mockResolvedValue(new File([], 'test.jpg')),
}));

afterEach(cleanup);

describe('PhotoEssayEditor', () => {
  it('renders with data-testid photo-essay-editor', () => {
    render(<PhotoEssayEditor sectionId="s1" token="test-token" />);
    expect(screen.getByTestId('photo-essay-editor')).toBeDefined();
  });

  it('renders title input', () => {
    render(<PhotoEssayEditor sectionId="s1" token="test-token" />);
    expect(screen.getByTestId('photo-essay-title-input')).toBeDefined();
  });

  it('renders save button', () => {
    render(<PhotoEssayEditor sectionId="s1" token="test-token" />);
    expect(screen.getByTestId('photo-essay-save-btn')).toBeDefined();
  });
});
