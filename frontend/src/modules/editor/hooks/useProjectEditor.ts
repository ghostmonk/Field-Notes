import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Project, CreateProjectRequest } from '@/shared/types/api';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { stripEmptyParagraphs } from '@/shared/utils/htmlUtils';

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

  const clearError = useCallback(() => setError(null), []);

  const resetForm = useCallback(() => {
    setProject(EMPTY_PROJECT);
    setError(null);
    const query = sectionId ? `?section_id=${sectionId}` : '';
    router.push(`/editor${query}`, undefined, { shallow: true });
  }, [router, sectionId]);

  const setField = useCallback(<K extends keyof Project>(key: K, value: Project[K]) => {
    setProject((prev: Partial<Project>) => ({ ...prev, [key]: value }));
  }, []);

  // Fetch existing project for editing
  useEffect(() => {
    if (!projectId || !accessToken) return;
    let cancelled = false;

    async function fetchProject() {
      setIsLoading(true);
      try {
        const data = await apiClient.projects.getById(projectId!, accessToken!);
        if (!cancelled) setProject(data);
      } catch {
        if (!cancelled) setError('Failed to load project');
      } finally {
        if (!cancelled) setIsLoading(false);
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
  }, [session, project, sectionId, sectionSlug, router, showToast]);

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

  // Handle session refresh failure
  useEffect(() => {
    if (session?.error === 'RefreshTokenError') {
      showToast('Session expired. Please sign in again.');
      signOut();
    }
  }, [session?.error, showToast]);

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
  };
}
