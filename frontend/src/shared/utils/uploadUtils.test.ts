import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  validateVideoFile,
  formatFileSize,
  isAllowedImageType,
  isAllowedVideoType,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  resizeImageFile,
} from './uploadUtils';

describe('validateImageFile', () => {
  it('rejects unsupported file types', () => {
    const file = new File(['test'], 'test.bmp', { type: 'image/bmp' });
    const result = validateImageFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('not supported');
  });

  it('rejects files exceeding max size', () => {
    const largeContent = new Uint8Array(MAX_IMAGE_SIZE + 1);
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('accepts valid jpeg', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(file).isValid).toBe(true);
  });

  it('accepts valid png', () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    expect(validateImageFile(file).isValid).toBe(true);
  });

  it('accepts valid webp', () => {
    const file = new File(['test'], 'test.webp', { type: 'image/webp' });
    expect(validateImageFile(file).isValid).toBe(true);
  });

  it('accepts valid gif', () => {
    const file = new File(['test'], 'test.gif', { type: 'image/gif' });
    expect(validateImageFile(file).isValid).toBe(true);
  });
});

describe('validateVideoFile', () => {
  it('rejects unsupported video types', () => {
    const file = new File(['test'], 'test.flv', { type: 'video/x-flv' });
    expect(validateVideoFile(file).isValid).toBe(false);
  });

  it('accepts valid mp4', () => {
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    expect(validateVideoFile(file).isValid).toBe(true);
  });

  it('rejects oversized videos', () => {
    const largeContent = new Uint8Array(MAX_VIDEO_SIZE + 1);
    const file = new File([largeContent], 'large.mp4', { type: 'video/mp4' });
    expect(validateVideoFile(file).isValid).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0MB');
  });
});

describe('isAllowedImageType', () => {
  it('returns true for jpeg', () => {
    expect(isAllowedImageType('image/jpeg')).toBe(true);
  });

  it('returns false for bmp', () => {
    expect(isAllowedImageType('image/bmp')).toBe(false);
  });
});

describe('isAllowedVideoType', () => {
  it('returns true for mp4', () => {
    expect(isAllowedVideoType('video/mp4')).toBe(true);
  });

  it('returns false for flv', () => {
    expect(isAllowedVideoType('video/x-flv')).toBe(false);
  });
});

describe('resizeImageFile', () => {
  it('is exported as a function', () => {
    expect(typeof resizeImageFile).toBe('function');
  });

  it('returns original file for GIFs', async () => {
    const gifFile = new File(['test'], 'animation.gif', { type: 'image/gif' });
    const result = await resizeImageFile(gifFile, 2048);
    expect(result).toBe(gifFile);
  });
});
