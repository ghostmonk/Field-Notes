import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Section } from '@/shared/types/api';
import { useProjectEditor } from '../hooks/useProjectEditor';
import { useConfirm } from '@/components/ConfirmDialog';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ErrorService } from '@/services/errorService';
import { VersionHistory } from '@/modules/versions/components/VersionHistory';
import { Button, Input, Checkbox, Badge, FormField, Textarea } from '@/components/ui';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface ProjectEditorFormProps {
  section: Section;
}

export function ProjectEditorForm({ section }: ProjectEditorFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
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
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={resetForm}
              data-testid="editor-new-button"
            >
              New Project
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

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 max-w-4xl mx-auto pb-24 md:pb-16">
        <FormField label="Title">
          <Input
            type="text"
            id="title"
            value={project.title || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('title', e.target.value)}
            placeholder="Project title"
            required
            disabled={isSaving}
            data-testid="editor-title-input"
          />
        </FormField>

        <FormField label="Summary">
          <Textarea
            id="summary"
            value={project.summary || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setField('summary', e.target.value)}
            placeholder="Brief project description"
            rows={3}
            disabled={isSaving}
            data-testid="editor-summary-input"
          />
        </FormField>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
          <div className="mt-1">
            <RichTextEditor
              content={project.content || ''}
              onChange={(val: string) => setField('content', val)}
              actionSlot={
                <>
                  <div className="flex items-center gap-4">
                    {project.is_published && (
                      <Badge variant="success">Published</Badge>
                    )}
                    <div className="flex items-center">
                      <Checkbox
                        id="is_featured"
                        checked={project.is_featured || false}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('is_featured', e.target.checked)}
                        disabled={isSaving}
                        data-testid="editor-featured-toggle"
                      />
                      <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Featured</label>
                    </div>
                  </div>
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
                      {isSaving && !project.is_published ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        if (!project.is_published) {
                          const confirmed = await confirm({
                            title: 'Publish Project',
                            message: 'This will make the project visible to everyone. Continue?',
                            confirmLabel: 'Publish',
                          });
                          if (!confirmed) return;
                        }
                        handleSubmit(new Event('submit') as unknown as React.FormEvent, true);
                      }}
                      disabled={isLoading || isSaving}
                      data-testid="editor-publish-button"
                    >
                      {isSaving && project.is_published ? 'Publishing...' : 'Publish'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Technologies (comma-separated)">
            <Input
              type="text"
              id="technologies"
              value={techText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTechText(e.target.value)}
              onBlur={() => setField('technologies', techText.split(',').map((s: string) => s.trim()).filter(Boolean))}
              placeholder="React, TypeScript, Node.js"
              disabled={isSaving}
              data-testid="editor-technologies-input"
            />
          </FormField>
          <FormField label="Sort Order">
            <Input
              type="number"
              id="sort_order"
              value={project.sort_order ?? 0}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('sort_order', parseInt(e.target.value, 10) || 0)}
              disabled={isSaving}
              data-testid="editor-sort-order-input"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="GitHub URL">
            <Input
              type="url"
              id="github_url"
              value={project.github_url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('github_url', e.target.value || null)}
              placeholder="https://github.com/..."
              disabled={isSaving}
              data-testid="editor-github-url-input"
            />
          </FormField>
          <FormField label="Live URL">
            <Input
              type="url"
              id="live_url"
              value={project.live_url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('live_url', e.target.value || null)}
              placeholder="https://..."
              disabled={isSaving}
              data-testid="editor-live-url-input"
            />
          </FormField>
          <FormField label="Image URL">
            <Input
              type="url"
              id="image_url"
              value={project.image_url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('image_url', e.target.value || null)}
              placeholder="https://..."
              disabled={isSaving}
              data-testid="editor-image-url-input"
            />
          </FormField>
        </div>
      </form>

      {project.id && (
        <div className="max-w-4xl mx-auto mt-6">
          <VersionHistory
            contentType="project"
            contentId={project.id}
            onSelectVersion={(v) => {
              setField('title', v.title);
              setField('content', v.content);
            }}
          />
        </div>
      )}
    </>
  );
}
