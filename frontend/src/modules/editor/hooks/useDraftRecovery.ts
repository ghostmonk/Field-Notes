import { useEffect, useCallback, useRef } from 'react';

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

const DRAFT_KEY_PREFIX = 'field-notes-draft';
const AUTOSAVE_INTERVAL = 30_000; // 30 seconds
const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDraftKey(
  contentType: string,
  entityId?: string,
  sectionId?: string
): string {
  if (entityId) return `${DRAFT_KEY_PREFIX}-${contentType}-edit-${entityId}`;
  if (sectionId)
    return `${DRAFT_KEY_PREFIX}-${contentType}-new-${sectionId}`;
  return `${DRAFT_KEY_PREFIX}-${contentType}-new`;
}

interface UseDraftRecoveryOptions<T> {
  contentType: string;
  entityId?: string;
  sectionId?: string;
  isEmpty?: (data: T) => boolean;
}

export function useDraftRecovery<T>({
  contentType,
  entityId,
  sectionId,
  isEmpty,
}: UseDraftRecoveryOptions<T>) {
  const key = getDraftKey(contentType, entityId, sectionId);
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveDraft = useCallback(
    (data: T) => {
      if (isEmpty?.(data)) return;
      const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
      try {
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // localStorage full or unavailable
      }
    },
    [key, isEmpty]
  );

  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const envelope: DraftEnvelope<T> = JSON.parse(raw);
      if (Date.now() - envelope.savedAt > DRAFT_MAX_AGE) {
        localStorage.removeItem(key);
        return null;
      }
      return envelope.data;
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
    (getState: () => T | null) => {
      if (autosaveTimer.current !== null) clearInterval(autosaveTimer.current);
      autosaveTimer.current = setInterval(() => {
        const state = getState();
        if (state) saveDraft(state);
      }, AUTOSAVE_INTERVAL);
    },
    [saveDraft]
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
