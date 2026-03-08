/**
 * Hook for managing story editor form state and actions.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Story } from '@/shared/types/api';
import { isTokenExpired } from '@/shared/lib/auth';
import { useFetchStory, useStoryMutations } from '@/modules/stories/hooks';
import { logger } from '@/shared/utils/logger';
import { stripEmptyParagraphs } from '@/shared/utils/htmlUtils';
import { useDraftRecovery } from './useDraftRecovery';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

const EMPTY_STORY: Partial<Story> = {
  title: '',
  content: '',
  is_published: true,
};

const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface UseStoryEditorReturn {
  story: Partial<Story>;
  error: string | null;
  isSaving: boolean;
  isLoading: boolean;
  isEditing: boolean;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setPublished: (published: boolean) => void;
  handleSubmit: (e: React.FormEvent, shouldPublish?: boolean) => Promise<void>;
  handleDelete: () => Promise<void>;
  resetForm: () => void;
  clearError: () => void;
  showDraftRecovery: boolean;
  recoveredDraft: { title: string; content: string; is_published: boolean } | null;
  acceptDraft: () => void;
  dismissDraft: () => void;
}

/**
 * Manages story editor state including:
 * - Form state (title, content, is_published)
 * - Loading and saving states
 * - Auto-save on session expiry
 * - Fetching existing stories for editing
 */
export function useStoryEditor(sectionId?: string, sectionSlug?: string): UseStoryEditorReturn {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { id } = router.query;
  const storyId = typeof id === 'string' ? id : undefined;

  const { story: fetchedStory, loading: fetchLoading, error: fetchError } = useFetchStory(storyId);
  const { saveStory, deleteStory, loading: saveLoading, error: saveError } = useStoryMutations();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [story, setStory] = useState<Partial<Story>>(EMPTY_STORY);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave } =
    useDraftRecovery(storyId, sectionId);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<{
    title: string;
    content: string;
    is_published: boolean;
  } | null>(null);

  const storyRef = useRef(story);
  storyRef.current = story;
  const isDirtyRef = useRef(false);
  const hasCheckedDraftRef = useRef(false);

  // Clear local error when mutation succeeds
  const clearError = useCallback(() => setError(null), []);

  // Reset form to empty state
  const resetForm = useCallback(() => {
    setStory(EMPTY_STORY);
    setError(null);
    const query = sectionId ? `?section_id=${sectionId}` : '';
    router.push(`/editor${query}`, undefined, { shallow: true });
  }, [router, sectionId]);

  // Field updaters
  const setTitle = useCallback((title: string) => {
    isDirtyRef.current = true;
    setStory((prev: Partial<Story>) => ({ ...prev, title }));
  }, []);

  const setContent = useCallback((content: string) => {
    isDirtyRef.current = true;
    setStory((prev: Partial<Story>) => ({ ...prev, content }));
  }, []);

  const setPublished = useCallback((is_published: boolean) => {
    isDirtyRef.current = true;
    setStory((prev: Partial<Story>) => ({ ...prev, is_published }));
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent, shouldPublish = true) => {
    e.preventDefault();

    if (!session?.accessToken) {
      setError(session ? 'No access token found. Please log in again.' : 'You must be logged in to save a story');
      return;
    }

    if (!story.title?.trim()) {
      setError('Story title is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const storyToSave = {
        ...story,
        content: stripEmptyParagraphs(story.content || ''),
        is_published: shouldPublish,
        ...(sectionId && !story.section_id ? { section_id: sectionId } : {}),
      };

      logger.info('Saving story', { id: story.id, title: story.title });
      const result = await saveStory(storyToSave, false);

      if (!result) {
        throw new Error('Failed to save story');
      }

      logger.info('Story saved', { id: result.id, title: result.title });
      clearDraft();
      stopAutosave();
      showToast(storyToSave.is_published ? 'Story published' : 'Draft saved');
      router.push(sectionSlug ? `/${sectionSlug}` : '/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error: ${message}`);
      setIsSaving(false);
    }
  }, [session, story, sectionId, sectionSlug, saveStory, router, clearDraft, stopAutosave, showToast]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!story.id || !session) {
      setError('Cannot delete story: missing ID or not logged in');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Story',
      message: `Are you sure you want to delete "${story.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    const success = await deleteStory(story.id);
    if (success) {
      showToast('Story deleted');
      router.push(sectionSlug ? `/${sectionSlug}` : '/');
    }
  }, [story.id, story.title, session, sectionSlug, deleteStory, router, confirm, showToast]);

  // Sync fetched story to form state
  useEffect(() => {
    if (fetchedStory) {
      setStory(fetchedStory);
      setError(null);
    }
  }, [fetchedStory]);

  // Sync fetch error to local error state
  useEffect(() => {
    if (fetchError && storyId) {
      setError(fetchError);
    }
  }, [fetchError, storyId]);

  // Reset form when navigating to /editor without story ID
  useEffect(() => {
    const queryKeys = Object.keys(router.query).filter(k => k !== 'section_id');
    if (!storyId && (queryKeys.length > 0 || story.id)) {
      resetForm();
    }
  }, [storyId, router.query, story.id, resetForm]);

  // Check for recovered draft on initial load
  useEffect(() => {
    if (fetchLoading || hasCheckedDraftRef.current) return;
    hasCheckedDraftRef.current = true;
    const draft = loadDraft();
    if (draft && (draft.title || draft.content)) {
      const currentTitle = fetchedStory?.title || '';
      const currentContent = fetchedStory?.content || '';
      if (draft.title !== currentTitle || draft.content !== currentContent) {
        setRecoveredDraft(draft);
        setShowDraftRecovery(true);
      }
    }
  }, [fetchLoading, loadDraft, fetchedStory]);

  // Start autosave timer — only writes when form has been modified
  useEffect(() => {
    startAutosave(() => {
      if (!isDirtyRef.current) return null;
      return {
        title: storyRef.current.title || '',
        content: storyRef.current.content || '',
        is_published: storyRef.current.is_published || false,
      };
    });
    return () => stopAutosave();
  }, [startAutosave, stopAutosave]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        const current = storyRef.current;
        saveDraft(
          current.title || '',
          current.content || '',
          current.is_published || false,
        );
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraft]);

  // Populate form from query params (for new stories with prefilled data)
  useEffect(() => {
    if (!storyId) {
      const { title, content, is_published } = router.query;
      if (title || content) {
        setStory({
          title: (title as string) || '',
          content: (content as string) || '',
          is_published: is_published === 'true',
        });
      }
    }
  }, [router.query, storyId]);

  // Auto-save on token expiry — reads from refs to avoid interval churn
  useEffect(() => {
    const interval = setInterval(() => {
      const token = session?.accessToken;
      const current = storyRef.current;
      if (token && isTokenExpired(token) && (current.title || current.content)) {
        handleSubmit(new Event('submit') as unknown as React.FormEvent, false).then(() => {
          alert('Session expired. Your story has been saved as a draft. Logging out.');
          signOut();
        });
      }
    }, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [session?.accessToken, handleSubmit]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const acceptDraft = useCallback(() => {
    if (recoveredDraft) {
      setStory((prev) => ({ ...prev, ...recoveredDraft }));
      isDirtyRef.current = true;
    }
    setShowDraftRecovery(false);
  }, [recoveredDraft]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  }, [clearDraft]);

  const isLoading = fetchLoading || saveLoading || status === 'loading';
  const combinedError = error || saveError;

  return {
    story,
    error: combinedError,
    isSaving,
    isLoading,
    isEditing: !!story.id,
    setTitle,
    setContent,
    setPublished,
    handleSubmit,
    handleDelete,
    resetForm,
    clearError,
    showDraftRecovery,
    recoveredDraft,
    acceptDraft,
    dismissDraft,
  };
}
