import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ImageFilterPicker } from './ImageFilterPicker';

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
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('renders all filter options immediately', () => {
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByTestId('filter-option-none')).toBeDefined();
    expect(screen.getByTestId('filter-option-warm')).toBeDefined();
    expect(screen.getByTestId('filter-option-bw')).toBeDefined();
    expect(screen.getByTestId('filter-option-vintage')).toBeDefined();
  });

  it('defaults to none filter on apply', () => {
    const onConfirm = vi.fn();
    render(
      <ImageFilterPicker
        imageUrl="blob:test"
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
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId('filter-picker-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
