import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ImageFilterPicker } from './ImageFilterPicker';

const mockPreviews = {
  auto_enhance: '/uploads/preview_auto_enhance.webp',
  warm: '/uploads/preview_warm.webp',
  cool: '/uploads/preview_cool.webp',
  high_contrast: '/uploads/preview_high_contrast.webp',
  bw: '/uploads/preview_bw.webp',
  vivid: '/uploads/preview_vivid.webp',
  vintage: '/uploads/preview_vintage.webp',
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ImageFilterPicker', () => {
  it('calls showModal on mount', () => {
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        previews={mockPreviews}
        loading={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('renders filter options when previews are loaded', () => {
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        previews={mockPreviews}
        loading={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByTestId('filter-option-none')).toBeDefined();
    expect(screen.getByTestId('filter-option-warm')).toBeDefined();
    expect(screen.getByTestId('filter-option-bw')).toBeDefined();
    expect(screen.getByTestId('filter-option-vintage')).toBeDefined();
  });

  it('shows loading state', () => {
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        previews={{}}
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByTestId('filter-picker-loading')).toBeDefined();
    expect(screen.queryByTestId('filter-option-none')).toBeNull();
  });

  it('defaults to none filter on apply', () => {
    const onConfirm = vi.fn();
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        previews={mockPreviews}
        loading={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('filter-picker-apply'));
    expect(onConfirm).toHaveBeenCalledWith('none');
  });

  it('calls onConfirm with selected filter', () => {
    const onConfirm = vi.fn();
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        previews={mockPreviews}
        loading={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('filter-option-warm'));
    fireEvent.click(screen.getByTestId('filter-picker-apply'));
    expect(onConfirm).toHaveBeenCalledWith('warm');
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        previews={mockPreviews}
        loading={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId('filter-picker-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables apply button while loading', () => {
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        previews={{}}
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const applyBtn = screen.getByTestId('filter-picker-apply');
    expect(applyBtn).toHaveProperty('disabled', true);
  });
});
