import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Section, Page, UpdatePageRequest } from '@/shared/types/api';
import { REFRESH_TOKEN_ERROR } from '@/shared/lib/auth';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { useConfirm } from '@/components/ConfirmDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Button, Input, Badge, FormField, TagInput } from '@/components/ui';
import { useDraftRecovery } from '../hooks/useDraftRecovery';

interface PageDraftData {
  title: string;
  content: string;
  is_published: boolean;
}

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface PageEditorFormProps {
  section: Section;
}

export function PageEditorForm({ section }: PageEditorFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const pageType = section.slug;

  const [page, setPage] = useState<Partial<Page>>({ title: '', content: '', is_published: true });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!page.id;

  const confirm = useConfirm();
  const clearError = useCallback(() => setError(null), []);

  const pageId = page.id;
  const isEmptyPageDraft = useCallback(
    (d: PageDraftData) => !d.title && !d.content,
    []
  );

  const { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave } =
    useDraftRecovery<PageDraftData>({
      contentType: 'page',
      entityId: pageId,
      sectionId: section.id,
      isEmpty: isEmptyPageDraft,
    });

  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<PageDraftData | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;
  const isDirtyRef = useRef(false);
  const hasCheckedDraftRef = useRef(false);
  const fetchDoneRef = useRef(false);

  // Fetch existing page
  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    apiClient.pages.get(pageType)
      .then(data => { if (!cancelled) setPage(data); })
      .catch(() => { /* page doesn't exist yet — that's fine */ })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          fetchDoneRef.current = true;
        }
      });

    return () => { cancelled = true; };
  }, [pageType]);

  const handleSubmit = useCallback(async (e: React.FormEvent, shouldPublish?: boolean) => {
    e.preventDefault();

    if (!session?.accessToken) {
      setError('You must be logged in to save a page');
      return;
    }

    if (!page.title?.trim()) {
      setError('Page title is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload: UpdatePageRequest = {
        title: page.title,
        content: page.content,
        is_published: shouldPublish !== undefined ? shouldPublish : page.is_published,
        tags: page.tags || [],
      };

      await apiClient.pages.update(pageType, payload, session.accessToken);
      clearDraft();
      stopAutosave();
      router.push(`/${section.slug}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.status === 401 ? ErrorService.handleAuthError(err) : err.getUserMessage());
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save page');
      }
      setIsSaving(false);
    }
  }, [session, page, pageType, section.slug, router, clearDraft, stopAutosave]);

  // Check for recovered draft on initial load
  useEffect(() => {
    if (isLoading || hasCheckedDraftRef.current || !fetchDoneRef.current) return;
    hasCheckedDraftRef.current = true;
    const draft = loadDraft();
    if (draft && (draft.title || draft.content)) {
      const current = pageRef.current;
      if (draft.title !== (current.title || '') || draft.content !== (current.content || '')) {
        setRecoveredDraft(draft);
        setShowDraftRecovery(true);
      }
    }
  }, [isLoading, loadDraft]);

  // Start autosave timer
  useEffect(() => {
    startAutosave(() => {
      if (!isDirtyRef.current) return null;
      const current = pageRef.current;
      return {
        title: current.title || '',
        content: current.content || '',
        is_published: current.is_published || false,
      };
    });
    return () => stopAutosave();
  }, [startAutosave, stopAutosave]);

  // Save draft on beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        const current = pageRef.current;
        saveDraft({
          title: current.title || '',
          content: current.content || '',
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
    const current = pageRef.current;
    if (current.title || current.content) {
      saveDraft({
        title: current.title || '',
        content: current.content || '',
        is_published: current.is_published || false,
      });
    }
  }, [session?.error, saveDraft]);

  const acceptDraft = useCallback(() => {
    if (recoveredDraft) {
      setPage((prev) => ({ ...prev, ...recoveredDraft }));
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

  if (isLoading && !isSaving) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="section-title">
          {isEditing ? `Edit ${section.title} Page` : `New ${section.title} Page`}
        </h1>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorDisplay
            error={ErrorService.createDisplayError(error)}
            onDismiss={clearError}
            showDetails={true}
          />
        </div>
      )}

      {showDraftRecovery && recoveredDraft && (
        <div
          className="mb-4 p-4 rounded-md border"
          style={{
            backgroundColor: 'var(--color-status-info-bg, #eff6ff)',
            borderColor: 'var(--color-status-info, #3b82f6)',
          }}
          data-testid="draft-recovery-banner"
        >
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Unsaved draft found
            {recoveredDraft.title ? `: "${recoveredDraft.title}"` : ''}.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={acceptDraft}
              data-testid="draft-recovery-accept"
            >
              Restore Draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={dismissDraft}
              data-testid="draft-recovery-dismiss"
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-4xl mx-auto pb-24 md:pb-16">
        <FormField label="Title" htmlFor="title">
          <Input
            type="text"
            id="title"
            value={page.title || ''}
            onChange={(e) => { isDirtyRef.current = true; setPage(prev => ({ ...prev, title: e.target.value })); }}
            placeholder="Page title"
            required
            disabled={isSaving}
            data-testid="editor-title-input"
          />
        </FormField>

        <FormField label="Tags" htmlFor="tags">
          <TagInput
            tags={page.tags || []}
            onChange={(tags) => { isDirtyRef.current = true; setPage(prev => ({ ...prev, tags })); }}
            token={session?.accessToken}
            data-testid="editor-tags-input"
          />
        </FormField>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
          <div className="mt-1">
            <RichTextEditor
              content={page.content || ''}
              onChange={(val) => { isDirtyRef.current = true; setPage(prev => ({ ...prev, content: val })); }}
              sectionId={section.id}
              actionSlot={
                <>
                  {page.is_published && (
                    <Badge variant="success">Published</Badge>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        handleSubmit(new Event('submit') as unknown as React.FormEvent, false);
                      }}
                      disabled={isLoading || isSaving}
                      data-testid="editor-save-draft"
                    >
                      {isSaving && !page.is_published ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        if (!page.is_published) {
                          const confirmed = await confirm({
                            title: 'Publish Page',
                            message: 'This will make the page visible to everyone. Continue?',
                            confirmLabel: 'Publish',
                          });
                          if (!confirmed) return;
                        }
                        handleSubmit(new Event('submit') as unknown as React.FormEvent, true);
                      }}
                      disabled={isLoading || isSaving}
                      data-testid="editor-publish-button"
                    >
                      {isSaving && page.is_published ? 'Publishing...' : 'Publish'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/${section.slug}`)}
                      disabled={isSaving}
                      data-testid="editor-cancel-button"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              }
            />
          </div>
        </div>
      </form>
    </>
  );
}
