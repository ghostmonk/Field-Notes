import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Section } from '@/shared/types/api';
import { useStoryEditor } from '../hooks/useStoryEditor';
import { useConfirm } from '@/components/ConfirmDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ErrorService } from '@/services/errorService';
import { VersionHistory } from '@/modules/versions/components/VersionHistory';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface StoryEditorFormProps {
  section: Section;
}

export function StoryEditorForm({ section }: StoryEditorFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const {
    story,
    error,
    isSaving,
    isLoading,
    isEditing,
    setTitle,
    setContent,
    handleSubmit,
    handleDelete,
    resetForm,
    clearError,
    showDraftRecovery,
    recoveredDraft,
    acceptDraft,
    dismissDraft,
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
            <button
              type="button"
              onClick={acceptDraft}
              className="btn btn--primary btn--sm"
              data-testid="draft-recovery-accept"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={dismissDraft}
              className="btn btn--secondary btn--sm"
              data-testid="draft-recovery-dismiss"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-4xl mx-auto pb-24 md:pb-16">
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
                  {story.is_published && (
                    <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-status-success)', color: 'white' }}>
                      Published
                    </span>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSubmit(new Event('submit') as unknown as React.FormEvent, false);
                      }}
                      className="btn btn--secondary btn--sm"
                      disabled={isLoading || isSaving}
                      data-testid="editor-save-draft"
                    >
                      {isSaving && !story.is_published ? 'Saving...' : 'Save as Draft'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!story.is_published) {
                          const confirmed = await confirm({
                            title: 'Publish Story',
                            message: 'This will make the story visible to everyone. Continue?',
                            confirmLabel: 'Publish',
                          });
                          if (!confirmed) return;
                        }
                        handleSubmit(new Event('submit') as unknown as React.FormEvent, true);
                      }}
                      className="btn btn--primary btn--sm"
                      disabled={isLoading || isSaving}
                      data-testid="editor-publish-button"
                    >
                      {isSaving && story.is_published ? 'Publishing...' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/${section.slug}`)}
                      className="btn btn--secondary btn--sm"
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

      {story.id && (
        <div className="max-w-4xl mx-auto mt-6">
          <VersionHistory
            contentType="story"
            contentId={story.id}
            onSelectVersion={(v) => {
              if (confirm('Load this version? Current unsaved changes will be lost.')) {
                setTitle(v.title);
                setContent(v.content);
              }
            }}
          />
        </div>
      )}
    </>
  );
}
