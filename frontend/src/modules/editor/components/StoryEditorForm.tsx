import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Section } from '@/shared/types/api';
import { useStoryEditor } from '../hooks/useStoryEditor';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ErrorService } from '@/services/errorService';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface StoryEditorFormProps {
  section: Section;
}

export function StoryEditorForm({ section }: StoryEditorFormProps) {
  const router = useRouter();
  const {
    story,
    error,
    isSaving,
    isLoading,
    isEditing,
    setTitle,
    setContent,
    setPublished,
    handleSubmit,
    handleDelete,
    resetForm,
    clearError,
  } = useStoryEditor(section.id, section.slug);

  if (isLoading && !isSaving) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="section-title">
          {isEditing ? 'Edit Story' : 'New Story'}
        </h1>
        {isEditing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              data-testid="editor-new-button"
            >
              New Story
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

      <form onSubmit={(e: React.FormEvent) => handleSubmit(e, true)} className="space-y-4 max-w-4xl mx-auto pb-24 md:pb-16">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={story.title || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
            placeholder="Story title"
            required
            disabled={isSaving}
            data-testid="editor-title-input"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Content
          </label>
          <div className="mt-1">
            <RichTextEditor
              content={story.content || ''}
              onChange={setContent}
              actionSlot={
                <>
                  <div className="flex items-center">
                    <input
                      id="is_published"
                      name="is_published"
                      type="checkbox"
                      checked={story.is_published || false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                      disabled={isSaving}
                      data-testid="editor-publish-toggle"
                    />
                    <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      Publish
                    </label>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      disabled={isLoading || isSaving}
                      data-testid="editor-save-button"
                    >
                      {isSaving ? 'Saving...' : `Save${story.is_published ? ' & Publish' : ' as Draft'}`}
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
