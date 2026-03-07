import { useEffect, useCallback, useRef } from 'react';

interface DraftData {
  title: string;
  content: string;
  is_published: boolean;
  savedAt: number;
}

const DRAFT_KEY_PREFIX = 'field-notes-draft';
const AUTOSAVE_INTERVAL = 30_000; // 30 seconds
const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDraftKey(storyId?: string, sectionId?: string): string {
  if (storyId) return `${DRAFT_KEY_PREFIX}-edit-${storyId}`;
  if (sectionId) return `${DRAFT_KEY_PREFIX}-new-${sectionId}`;
  return `${DRAFT_KEY_PREFIX}-new`;
}

export function useDraftRecovery(storyId?: string, sectionId?: string) {
  const key = getDraftKey(storyId, sectionId);
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveDraft = useCallback(
    (title: string, content: string, is_published: boolean) => {
      if (!title && !content) return;
      const draft: DraftData = {
        title,
        content,
        is_published,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(key, JSON.stringify(draft));
      } catch {
        // localStorage full or unavailable
      }
    },
    [key],
  );

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const draft: DraftData = JSON.parse(raw);
      if (Date.now() - draft.savedAt > DRAFT_MAX_AGE) {
        localStorage.removeItem(key);
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  const startAutosave = useCallback(
    (
      getState: () => {
        title: string;
        content: string;
        is_published: boolean;
      },
    ) => {
      if (autosaveTimer.current !== null) clearInterval(autosaveTimer.current);
      autosaveTimer.current = setInterval(() => {
        const state = getState();
        saveDraft(state.title, state.content, state.is_published);
      }, AUTOSAVE_INTERVAL);
    },
    [saveDraft],
  );

  const stopAutosave = useCallback(() => {
    if (autosaveTimer.current) {
      clearInterval(autosaveTimer.current);
      autosaveTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutosave();
  }, [stopAutosave]);

  return { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave };
}
