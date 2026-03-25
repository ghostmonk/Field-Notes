import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftRecovery } from '../useDraftRecovery';

interface TestDraftData {
  title: string;
  content: string;
  is_published: boolean;
}

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
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

    act(() => {
      result.current.saveDraft({ title: 'Title', content: '<p>Content</p>', is_published: true });
    });

    const draft = result.current.loadDraft();
    expect(draft).not.toBeNull();
    expect(draft!.title).toBe('Title');
    expect(draft!.content).toBe('<p>Content</p>');
    expect(draft!.is_published).toBe(true);
  });

  it('stores data in localStorage with envelope containing savedAt', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

    const now = Date.now();
    act(() => {
      result.current.saveDraft({ title: 'Test', content: 'body', is_published: false });
    });

    const key = 'field-notes-draft-story-edit-story-1';
    const raw = storage[key];
    expect(raw).toBeDefined();
    const envelope = JSON.parse(raw);
    expect(envelope.data).toEqual({ title: 'Test', content: 'body', is_published: false });
    expect(envelope.savedAt).toBeGreaterThanOrEqual(now);
  });

  it('returns null for expired drafts (>7 days)', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

    act(() => {
      result.current.saveDraft({ title: 'Old', content: 'old content', is_published: false });
    });

    // Advance 8 days
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

    const draft = result.current.loadDraft();
    expect(draft).toBeNull();
  });

  it('clears a draft', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

    act(() => {
      result.current.saveDraft({ title: 'Title', content: 'Content', is_published: false });
    });
    expect(result.current.loadDraft()).not.toBeNull();

    act(() => {
      result.current.clearDraft();
    });
    expect(result.current.loadDraft()).toBeNull();
  });

  it('isEmpty prevents saving empty drafts', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
        isEmpty: (d) => !d.title && !d.content,
      })
    );

    act(() => {
      result.current.saveDraft({ title: '', content: '', is_published: false });
    });

    expect(result.current.loadDraft()).toBeNull();
  });

  it('saves when isEmpty returns false', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
        isEmpty: (d) => !d.title && !d.content,
      })
    );

    act(() => {
      result.current.saveDraft({ title: 'Has title', content: '', is_published: false });
    });

    expect(result.current.loadDraft()).not.toBeNull();
    expect(result.current.loadDraft()!.title).toBe('Has title');
  });

  it('generates correct key for entityId (edit mode)', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 's1',
      })
    );

    act(() => {
      result.current.saveDraft({ title: 'A', content: 'a', is_published: false });
    });

    expect(storage['field-notes-draft-story-edit-s1']).toBeDefined();
  });

  it('generates correct key for sectionId (new mode with section)', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        sectionId: 'sec1',
      })
    );

    act(() => {
      result.current.saveDraft({ title: 'B', content: 'b', is_published: false });
    });

    expect(storage['field-notes-draft-story-new-sec1']).toBeDefined();
  });

  it('generates correct key for no entityId or sectionId (new mode)', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'resume',
      })
    );

    act(() => {
      result.current.saveDraft({ title: 'C', content: 'c', is_published: false });
    });

    expect(storage['field-notes-draft-resume-new']).toBeDefined();
  });

  it('uses different keys for different content types', () => {
    const { result: storyResult } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'id1',
      })
    );

    const { result: projectResult } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'project',
        entityId: 'id1',
      })
    );

    act(() => {
      storyResult.current.saveDraft({ title: 'Story', content: '', is_published: false });
      projectResult.current.saveDraft({ title: 'Project', content: '', is_published: false });
    });

    expect(storyResult.current.loadDraft()!.title).toBe('Story');
    expect(projectResult.current.loadDraft()!.title).toBe('Project');
  });

  it('autosave fires on interval', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

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

  it('autosave skips when getState returns null', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

    act(() => {
      result.current.startAutosave(() => null);
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.loadDraft()).toBeNull();
  });

  it('stopAutosave prevents further saves', () => {
    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

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

  it('handles localStorage errors gracefully on save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

    // Should not throw
    act(() => {
      result.current.saveDraft({ title: 'Test', content: 'body', is_published: false });
    });
  });

  it('handles corrupted localStorage data on load', () => {
    storage['field-notes-draft-story-edit-story-1'] = 'not json';

    const { result } = renderHook(() =>
      useDraftRecovery<TestDraftData>({
        contentType: 'story',
        entityId: 'story-1',
      })
    );

    expect(result.current.loadDraft()).toBeNull();
  });
});
