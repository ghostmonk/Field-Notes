import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Section } from '@/shared/types/api';
import { useProjectEditor } from '../hooks/useProjectEditor';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ErrorService } from '@/services/errorService';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface ProjectEditorFormProps {
  section: Section;
}

export function ProjectEditorForm({ section }: ProjectEditorFormProps) {
  const router = useRouter();
  const {
    project,
    error,
    isSaving,
    isLoading,
    isEditing,
    setField,
    handleSubmit,
    handleDelete,
    resetForm,
    clearError,
  } = useProjectEditor(section.id, section.slug);

  const [techText, setTechText] = useState((project.technologies || []).join(', '));

  // Sync local text when project data loads (e.g. editing existing project)
  useEffect(() => {
    setTechText((project.technologies || []).join(', '));
  }, [project.technologies]);

  if (isLoading && !isSaving) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="section-title">
          {isEditing ? 'Edit Project' : 'New Project'}
        </h1>
        {isEditing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              data-testid="editor-new-button"
            >
              New Project
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              data-testid="editor-delete-button"
            >
              Delete
            </button>
          </div>
        )}
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
            value={project.title || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('title', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="Project title"
            required
            disabled={isSaving}
            data-testid="editor-title-input"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Summary</label>
          <textarea
            id="summary"
            value={project.summary || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setField('summary', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="Brief project description"
            rows={3}
            disabled={isSaving}
            data-testid="editor-summary-input"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
          <div className="mt-1">
            <RichTextEditor
              content={project.content || ''}
              onChange={(val: string) => setField('content', val)}
              actionSlot={
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <input
                        id="is_published"
                        type="checkbox"
                        checked={project.is_published || false}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('is_published', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                        disabled={isSaving}
                        data-testid="editor-publish-toggle"
                      />
                      <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Publish</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="is_featured"
                        type="checkbox"
                        checked={project.is_featured || false}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('is_featured', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                        disabled={isSaving}
                        data-testid="editor-featured-toggle"
                      />
                      <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Featured</label>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      disabled={isLoading || isSaving}
                      data-testid="editor-save-button"
                    >
                      {isSaving ? 'Saving...' : `Save${project.is_published ? ' & Publish' : ' as Draft'}`}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="technologies" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technologies (comma-separated)</label>
            <input
              type="text"
              id="technologies"
              value={techText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTechText(e.target.value)}
              onBlur={() => setField('technologies', techText.split(',').map((s: string) => s.trim()).filter(Boolean))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              placeholder="React, TypeScript, Node.js"
              disabled={isSaving}
              data-testid="editor-technologies-input"
            />
          </div>
          <div>
            <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort Order</label>
            <input
              type="number"
              id="sort_order"
              value={project.sort_order ?? 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('sort_order', parseInt(e.target.value, 10) || 0)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              disabled={isSaving}
              data-testid="editor-sort-order-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="github_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">GitHub URL</label>
            <input
              type="url"
              id="github_url"
              value={project.github_url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('github_url', e.target.value || null)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              placeholder="https://github.com/..."
              disabled={isSaving}
              data-testid="editor-github-url-input"
            />
          </div>
          <div>
            <label htmlFor="live_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Live URL</label>
            <input
              type="url"
              id="live_url"
              value={project.live_url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('live_url', e.target.value || null)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              placeholder="https://..."
              disabled={isSaving}
              data-testid="editor-live-url-input"
            />
          </div>
          <div>
            <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image URL</label>
            <input
              type="url"
              id="image_url"
              value={project.image_url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('image_url', e.target.value || null)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              placeholder="https://..."
              disabled={isSaving}
              data-testid="editor-image-url-input"
            />
          </div>
        </div>
      </form>
    </>
  );
}
