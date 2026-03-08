import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatRelativeDate } from './formatDate';

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-03-07T14:30:00Z');
    expect(result).toContain('March');
    expect(result).toContain('2026');
  });
});

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than a minute', () => {
    expect(formatRelativeDate('2026-03-07T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(formatRelativeDate('2026-03-07T11:55:00Z')).toBe('5 min ago');
  });

  it('returns hours ago', () => {
    expect(formatRelativeDate('2026-03-07T09:00:00Z')).toBe('3 hr ago');
  });

  it('returns days ago', () => {
    expect(formatRelativeDate('2026-03-05T12:00:00Z')).toBe('2 days ago');
  });

  it('falls back to absolute date after 30 days', () => {
    expect(formatRelativeDate('2026-01-01T00:00:00Z')).toContain('January');
  });
});
