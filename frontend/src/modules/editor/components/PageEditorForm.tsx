import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Section, Page, UpdatePageRequest } from '@/shared/types/api';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { useConfirm } from '@/components/ConfirmDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Button, Input, Badge, FormField } from '@/components/ui';

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

  // Fetch existing page
  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    apiClient.pages.get(pageType)
      .then(data => { if (!cancelled) setPage(data); })
      .catch(() => { /* page doesn't exist yet — that's fine */ })
      .finally(() => { if (!cancelled) setIsLoading(false); });

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
      };

      await apiClient.pages.update(pageType, payload, session.accessToken);
      router.push(`/${section.slug}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.status === 401 ? ErrorService.handleAuthError(err) : err.getUserMessage());
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save page');
      }
      setIsSaving(false);
    }
  }, [session, page, pageType, section.slug, router]);

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

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-4xl mx-auto pb-24 md:pb-16">
        <FormField label="Title" htmlFor="title">
          <Input
            type="text"
            id="title"
            value={page.title || ''}
            onChange={(e) => setPage(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Page title"
            required
            disabled={isSaving}
            data-testid="editor-title-input"
          />
        </FormField>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
          <div className="mt-1">
            <RichTextEditor
              content={page.content || ''}
              onChange={(val) => setPage(prev => ({ ...prev, content: val }))}
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
