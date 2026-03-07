import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftRecovery } from './useDraftRecovery';

describe('useDraftRecovery', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      storage[key] = val;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete storage[key];
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('saves and loads a draft', () => {
    const { result } = renderHook(() => useDraftRecovery('story-1'));

    act(() => {
      result.current.saveDraft('Title', '<p>Content</p>', true);
    });

    const draft = result.current.loadDraft();
    expect(draft).not.toBeNull();
    expect(draft!.title).toBe('Title');
    expect(draft!.content).toBe('<p>Content</p>');
    expect(draft!.is_published).toBe(true);
  });

  it('returns null for expired drafts (>7 days)', () => {
    const { result } = renderHook(() => useDraftRecovery('story-1'));

    act(() => {
      result.current.saveDraft('Old', 'old content', false);
    });

    // Advance 8 days
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

    const draft = result.current.loadDraft();
    expect(draft).toBeNull();
  });

  it('clears a draft', () => {
    const { result } = renderHook(() => useDraftRecovery('story-1'));

    act(() => {
      result.current.saveDraft('Title', 'Content', false);
    });
    expect(result.current.loadDraft()).not.toBeNull();

    act(() => {
      result.current.clearDraft();
    });
    expect(result.current.loadDraft()).toBeNull();
  });

  it('uses different keys for storyId vs sectionId vs new', () => {
    const { result: byStory } = renderHook(() => useDraftRecovery('s1'));
    const { result: bySection } = renderHook(() => useDraftRecovery(undefined, 'sec1'));
    const { result: byNew } = renderHook(() => useDraftRecovery());

    act(() => {
      byStory.current.saveDraft('A', 'a', false);
      bySection.current.saveDraft('B', 'b', false);
      byNew.current.saveDraft('C', 'c', false);
    });

    expect(byStory.current.loadDraft()!.title).toBe('A');
    expect(bySection.current.loadDraft()!.title).toBe('B');
    expect(byNew.current.loadDraft()!.title).toBe('C');
  });

  it('does not save empty drafts', () => {
    const { result } = renderHook(() => useDraftRecovery('story-1'));

    act(() => {
      result.current.saveDraft('', '', false);
    });

    expect(result.current.loadDraft()).toBeNull();
  });

  it('autosave fires on interval', () => {
    const { result } = renderHook(() => useDraftRecovery('story-1'));

    act(() => {
      result.current.startAutosave(() => ({
        title: 'Auto',
        content: 'saved',
        is_published: true,
      }));
    });

    expect(result.current.loadDraft()).toBeNull();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    const draft = result.current.loadDraft();
    expect(draft).not.toBeNull();
    expect(draft!.title).toBe('Auto');
  });

  it('stopAutosave prevents further saves', () => {
    const { result } = renderHook(() => useDraftRecovery('story-1'));

    act(() => {
      result.current.startAutosave(() => ({
        title: 'Auto',
        content: 'saved',
        is_published: false,
      }));
    });

    act(() => {
      result.current.stopAutosave();
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.loadDraft()).toBeNull();
  });
});
