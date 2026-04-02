import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetBrowser } from '../AssetBrowser';
import { AssetGroup } from '@/shared/types/api';

const mockLoadMore = vi.fn();

const mockHookReturn = {
  items: [] as AssetGroup[],
  loading: false,
  error: null as string | null,
  hasMore: false,
  totalCount: 0,
  loadMore: mockLoadMore,
};

vi.mock('../../hooks/useSectionAssetBrowser', () => ({
  useSectionAssetBrowser: () => mockHookReturn,
}));

function makeAsset(overrides?: Partial<AssetGroup>): AssetGroup {
  return {
    asset_id: '20260329_143022_a7f3b2c1',
    type: 'image',
    variants: [
      { variant: 'originals', path: 'images/originals/20260329_143022_a7f3b2c1.webp', size_bytes: 245000 },
      { variant: 'thumbnails', path: 'images/thumbnails/20260329_143022_a7f3b2c1.webp', size_bytes: 32000 },
    ],
    total_size_bytes: 277000,
    created_date: '2026-03-29T14:30:22+00:00',
    referenced_by: [{ content_type: 'story', title: 'Test Story', id: 'abc123' }],
    ...overrides,
  };
}

describe('AssetBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn.items = [];
    mockHookReturn.loading = false;
    mockHookReturn.error = null;
    mockHookReturn.hasMore = false;
    mockHookReturn.totalCount = 0;
  });

  it('shows empty state when no assets', () => {
    render(<AssetBrowser sectionId="section1" />);
    expect(screen.getByTestId('assets-empty')).toBeDefined();
  });

  it('shows error state', () => {
    mockHookReturn.error = 'Something went wrong';
    render(<AssetBrowser sectionId="section1" />);
    expect(screen.getByTestId('assets-error').textContent).toBe('Something went wrong');
  });

  it('renders asset rows', () => {
    mockHookReturn.items = [makeAsset()];
    mockHookReturn.totalCount = 1;
    render(<AssetBrowser sectionId="section1" />);
    expect(screen.getByTestId('asset-browser')).toBeDefined();
    expect(screen.getAllByTestId('asset-row')).toHaveLength(1);
    expect(screen.getByText('20260329_143022_a7f3b2c1')).toBeDefined();
    expect(screen.getByText('Test Story')).toBeDefined();
  });

  it('expands row to show variants on click', async () => {
    mockHookReturn.items = [makeAsset()];
    mockHookReturn.totalCount = 1;
    render(<AssetBrowser sectionId="section1" />);

    const row = screen.getByTestId('asset-row');
    await userEvent.click(row);

    const variantRows = screen.getAllByTestId('variant-row');
    expect(variantRows).toHaveLength(2);
  });

  it('shows load more button when hasMore', () => {
    mockHookReturn.items = [makeAsset()];
    mockHookReturn.totalCount = 5;
    mockHookReturn.hasMore = true;
    render(<AssetBrowser sectionId="section1" />);

    const btn = screen.getByTestId('load-more-assets');
    expect(btn).toBeDefined();
  });

  it('calls loadMore when button clicked', async () => {
    mockHookReturn.items = [makeAsset()];
    mockHookReturn.totalCount = 5;
    mockHookReturn.hasMore = true;
    render(<AssetBrowser sectionId="section1" />);

    await userEvent.click(screen.getByTestId('load-more-assets'));
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator', () => {
    mockHookReturn.loading = true;
    mockHookReturn.items = [makeAsset()];
    mockHookReturn.totalCount = 1;
    render(<AssetBrowser sectionId="section1" />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('shows total count', () => {
    mockHookReturn.items = [makeAsset()];
    mockHookReturn.totalCount = 3;
    render(<AssetBrowser sectionId="section1" />);
    expect(screen.getByText('3 assets')).toBeDefined();
  });

  it('displays video type badge', () => {
    mockHookReturn.items = [makeAsset({ type: 'video', asset_id: '20260329_143022_bbbbbbbb' })];
    mockHookReturn.totalCount = 1;
    render(<AssetBrowser sectionId="section1" />);
    expect(screen.getByText('video')).toBeDefined();
  });
});
