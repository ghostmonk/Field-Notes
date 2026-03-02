import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Section, Page, PageType, UpdatePageRequest } from '@/shared/types/api';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { ErrorDisplay } from '@/components/ErrorDisplay';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface PageEditorFormProps {
  section: Section;
}

const VALID_PAGE_TYPES: PageType[] = ['about', 'contact'];

export function PageEditorForm({ section }: PageEditorFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const pageType = VALID_PAGE_TYPES.includes(section.slug as PageType)
    ? (section.slug as PageType)
    : null;

  const [page, setPage] = useState<Partial<Page>>({ title: '', content: '', is_published: true });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!page.id;

  const clearError = useCallback(() => setError(null), []);

  // Fetch existing page
  useEffect(() => {
    if (!pageType) return;
    let cancelled = false;

    setIsLoading(true);
    apiClient.pages.get(pageType)
      .then(data => { if (!cancelled) setPage(data); })
      .catch(() => { /* page doesn't exist yet — that's fine */ })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [pageType]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.accessToken) {
      setError('You must be logged in to save a page');
      return;
    }

    if (!pageType) {
      setError(`Section slug "${section.slug}" is not a valid page type. Valid types: ${VALID_PAGE_TYPES.join(', ')}`);
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
        is_published: page.is_published,
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

  if (!pageType) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Section &quot;{section.title}&quot; (slug: {section.slug}) is not a recognized page type. Valid page types: {VALID_PAGE_TYPES.join(', ')}.
      </div>
    );
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

      <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl mx-auto pb-24 md:pb-16">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
          <input
            type="text"
            id="title"
            value={page.title || ''}
            onChange={(e) => setPage(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="Page title"
            required
            disabled={isSaving}
            data-testid="editor-title-input"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
          <div className="mt-1">
            <RichTextEditor
              content={page.content || ''}
              onChange={(val) => setPage(prev => ({ ...prev, content: val }))}
              actionSlot={
                <>
                  <div className="flex items-center">
                    <input
                      id="is_published"
                      type="checkbox"
                      checked={page.is_published || false}
                      onChange={(e) => setPage(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                      disabled={isSaving}
                      data-testid="editor-publish-toggle"
                    />
                    <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Publish</label>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      disabled={isLoading || isSaving}
                      data-testid="editor-save-button"
                    >
                      {isSaving ? 'Saving...' : `Save${page.is_published ? ' & Publish' : ' as Draft'}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/${section.slug}`)}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={isSaving}
                      data-testid="editor-cancel-button"
                    >
                      Cancel
                    </button>
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
