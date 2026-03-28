import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Section } from '@/shared/types/api';
import { useStoryEditor } from '../hooks/useStoryEditor';
import { useConfirm } from '@/components/ConfirmDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ErrorService } from '@/services/errorService';
import { VersionHistory } from '@/modules/versions/components/VersionHistory';
import { Button, Input, Badge, FormField, TagInput } from '@/components/ui';

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
    setTags,
    handleSubmit,
    handleDelete,
    resetForm,
    clearError,
    showDraftRecovery,
    recoveredDraft,
    acceptDraft,
    dismissDraft,
  } = useStoryEditor(section.id, section.slug);
  const { data: session } = useSession();

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
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={resetForm}
              data-testid="editor-new-button"
            >
              New Story
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isSaving}
              data-testid="editor-delete-button"
            >
              Delete
            </Button>
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
            value={story.title || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="Story title"
            required
            disabled={isSaving}
            data-testid="editor-title-input"
          />
        </FormField>

        <FormField label="Tags" htmlFor="tags">
          <TagInput
            tags={story.tags || []}
            onChange={setTags}
            token={session?.accessToken}
            data-testid="editor-tags-input"
          />
        </FormField>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Content
          </label>
          <div className="mt-1">
            <RichTextEditor
              content={story.content || ''}
              onChange={setContent}
              sectionId={section.id}
              actionSlot={
                <>
                  {story.is_published && (
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
                      {isSaving && !story.is_published ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
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
                      disabled={isLoading || isSaving}
                      data-testid="editor-publish-button"
                    >
                      {isSaving && story.is_published ? 'Publishing...' : 'Publish'}
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

      {story.id && (
        <div className="max-w-4xl mx-auto mt-6">
          <VersionHistory
            contentType="story"
            contentId={story.id}
            onSelectVersion={(v) => {
              setTitle(v.title);
              setContent(v.content);
            }}
          />
        </div>
      )}
    </>
  );
}
