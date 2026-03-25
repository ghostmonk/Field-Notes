import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Project, CreateProjectRequest } from '@/shared/types/api';
import { REFRESH_TOKEN_ERROR } from '@/shared/lib/auth';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { stripEmptyParagraphs } from '@/shared/utils/htmlUtils';
import { useDraftRecovery } from './useDraftRecovery';

interface ProjectDraftData {
  title: string;
  summary: string;
  content: string;
  technologies: string[];
  is_published: boolean;
}

const EMPTY_PROJECT: Partial<Project> = {
  title: '',
  summary: '',
  content: '',
  technologies: [],
  github_url: null,
  live_url: null,
  image_url: null,
  is_published: true,
  is_featured: false,
  sort_order: 0,
};

export interface UseProjectEditorReturn {
  project: Partial<Project>;
  error: string | null;
  isSaving: boolean;
  isLoading: boolean;
  isEditing: boolean;
  setField: <K extends keyof Project>(key: K, value: Project[K]) => void;
  handleSubmit: (e: React.FormEvent, shouldPublish?: boolean) => Promise<void>;
  handleDelete: () => Promise<void>;
  resetForm: () => void;
  clearError: () => void;
  showDraftRecovery: boolean;
  recoveredDraft: ProjectDraftData | null;
  acceptDraft: () => void;
  dismissDraft: () => void;
}

export function useProjectEditor(sectionId?: string, sectionSlug?: string): UseProjectEditorReturn {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { id } = router.query;
  const projectId = typeof id === 'string' ? id : undefined;

  const confirm = useConfirm();
  const { showToast } = useToast();
  const [project, setProject] = useState<Partial<Project>>(EMPTY_PROJECT);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const accessToken = session?.accessToken;

  const isEmptyProjectDraft = useCallback(
    (d: ProjectDraftData) => !d.title && !d.summary && !d.content,
    []
  );

  const { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave } =
    useDraftRecovery<ProjectDraftData>({
      contentType: 'project',
      entityId: projectId,
      sectionId,
      isEmpty: isEmptyProjectDraft,
    });

  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<ProjectDraftData | null>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const isDirtyRef = useRef(false);
  const hasCheckedDraftRef = useRef(false);
  const fetchDoneRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const resetForm = useCallback(() => {
    setProject(EMPTY_PROJECT);
    setError(null);
    const query = sectionId ? `?section_id=${sectionId}` : '';
    router.push(`/editor${query}`, undefined, { shallow: true });
  }, [router, sectionId]);

  const setField = useCallback(<K extends keyof Project>(key: K, value: Project[K]) => {
    isDirtyRef.current = true;
    setProject((prev: Partial<Project>) => ({ ...prev, [key]: value }));
  }, []);

  // Fetch existing project for editing
  useEffect(() => {
    if (!projectId) {
      fetchDoneRef.current = true;
      return;
    }
    if (!accessToken) return;
    let cancelled = false;

    async function fetchProject() {
      setIsLoading(true);
      try {
        const data = await apiClient.projects.getById(projectId!, accessToken!);
        if (!cancelled) setProject(data);
      } catch {
        if (!cancelled) setError('Failed to load project');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          fetchDoneRef.current = true;
        }
      }
    }

    fetchProject();
    return () => { cancelled = true; };
  }, [projectId, accessToken]);

  const handleSubmit = useCallback(async (e: React.FormEvent, shouldPublish?: boolean) => {
    e.preventDefault();

    if (!session?.accessToken) {
      setError('You must be logged in to save a project');
      return;
    }

    if (!project.title?.trim()) {
      setError('Project title is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload = {
        title: project.title,
        summary: project.summary || '',
        content: stripEmptyParagraphs(project.content || ''),
        technologies: project.technologies || [],
        github_url: project.github_url || undefined,
        live_url: project.live_url || undefined,
        image_url: project.image_url || undefined,
        is_published: shouldPublish !== undefined ? shouldPublish : project.is_published,
        is_featured: project.is_featured,
        sort_order: project.sort_order,
        section_id: project.section_id || sectionId,
      };

      if (project.id) {
        await apiClient.projects.update(project.id, payload, session.accessToken);
      } else {
        await apiClient.projects.create(payload as CreateProjectRequest, session.accessToken);
      }

      clearDraft();
      stopAutosave();
      showToast('Project saved');
      router.push(sectionSlug ? `/${sectionSlug}` : '/');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.status === 401 ? ErrorService.handleAuthError(err) : err.getUserMessage());
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save project');
      }
      setIsSaving(false);
    }
  }, [session, project, sectionId, sectionSlug, router, showToast, clearDraft, stopAutosave]);

  const handleDelete = useCallback(async () => {
    if (!project.id || !session?.accessToken) {
      setError('Cannot delete project: missing ID or not logged in');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Project',
      message: `Delete "${project.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await apiClient.projects.delete(project.id, session.accessToken);
      showToast('Project deleted');
      router.push(sectionSlug ? `/${sectionSlug}` : '/');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.getUserMessage());
      } else {
        setError('Failed to delete project');
      }
    }
  }, [project.id, project.title, session, sectionSlug, router, confirm, showToast]);

  // Check for recovered draft on initial load
  useEffect(() => {
    if (isLoading || hasCheckedDraftRef.current || !fetchDoneRef.current) return;
    hasCheckedDraftRef.current = true;
    const draft = loadDraft();
    if (draft && (draft.title || draft.content || draft.summary)) {
      const current = projectRef.current;
      if (
        draft.title !== (current.title || '') ||
        draft.content !== (current.content || '') ||
        draft.summary !== (current.summary || '')
      ) {
        setRecoveredDraft(draft);
        setShowDraftRecovery(true);
      }
    }
  }, [isLoading, loadDraft]);

  // Start autosave timer
  useEffect(() => {
    startAutosave(() => {
      if (!isDirtyRef.current) return null;
      const current = projectRef.current;
      return {
        title: current.title || '',
        summary: current.summary || '',
        content: current.content || '',
        technologies: current.technologies || [],
        is_published: current.is_published || false,
      };
    });
    return () => stopAutosave();
  }, [startAutosave, stopAutosave]);

  // Save draft on beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        const current = projectRef.current;
        saveDraft({
          title: current.title || '',
          summary: current.summary || '',
          content: current.content || '',
          technologies: current.technologies || [],
          is_published: current.is_published || false,
        });
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraft]);

  // Save draft on session error
  useEffect(() => {
    if (session?.error !== REFRESH_TOKEN_ERROR) return;
    const current = projectRef.current;
    if (current.title || current.content || current.summary) {
      saveDraft({
        title: current.title || '',
        summary: current.summary || '',
        content: current.content || '',
        technologies: current.technologies || [],
        is_published: current.is_published || false,
      });
    }
  }, [session?.error, saveDraft]);

  const acceptDraft = useCallback(() => {
    if (recoveredDraft) {
      setProject((prev) => ({ ...prev, ...recoveredDraft }));
      isDirtyRef.current = true;
    }
    setShowDraftRecovery(false);
  }, [recoveredDraft]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  }, [clearDraft]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  return {
    project,
    error,
    isSaving,
    isLoading: isLoading || status === 'loading',
    isEditing: !!project.id,
    setField,
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
