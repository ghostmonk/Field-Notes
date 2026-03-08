import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useImageZoom } from './useImageZoom';

vi.mock('medium-zoom', () => ({
  default: vi.fn(() => ({
    attach: vi.fn(),
    detach: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

describe('useImageZoom', () => {
  it('should export useImageZoom hook', () => {
    expect(typeof useImageZoom).toBe('function');
  });

  it('should handle null ref gracefully', () => {
    const ref = { current: null };
    const { result } = renderHook(() => useImageZoom(ref));
    expect(result).toBeDefined();
  });
});
