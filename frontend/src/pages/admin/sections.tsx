import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useFetchSections, useSectionMutations } from '@/modules/sections';
import { invalidateNavCache } from '@/hooks/useNavSections';
import { Section, CreateSectionRequest, DisplayType, SectionContentType, NavVisibility } from '@/shared/types/api';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ErrorService } from '@/services/errorService';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import IconPicker from '@/components/IconPicker';
import { SectionIcon, iconMap } from '@/shared/lib/navIcons';
import { Button, Input, Select } from '@/components/ui';
import {
  CONTENT_TYPE_DISPLAYS,
  CONTENT_TYPE_OPTIONS,
  NAV_VISIBILITY_OPTIONS,
} from '@/shared/constants/sectionTypes';

export default function AdminSectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { sections, loading, error: fetchError, refetch, clearError: clearFetchError } = useFetchSections();
  const { createSection, updateSection, deleteSection, loading: mutating, error: mutateError, clearError: clearMutateError } = useSectionMutations();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const confirm = useConfirm();
  const { showToast } = useToast();
  const error = fetchError || mutateError;
  const clearError = useCallback(() => { clearFetchError(); clearMutateError(); }, [clearFetchError, clearMutateError]);

  // Auth guard — redirect in useEffect, not during render
  useEffect(() => {
    if (status !== 'loading' && (!session || session.user?.role !== 'admin')) {
      router.replace('/');
    }
  }, [status, session, router]);

  if (status === 'loading' || !session || session.user?.role !== 'admin') {
    return null;
  }

  const handleCreate = async (data: CreateSectionRequest) => {
    const result = await createSection(data);
    if (result) {
      setShowCreateForm(false);
      invalidateNavCache();
      refetch();
    }
  };

  const handleUpdate = async (id: string, data: Partial<CreateSectionRequest>) => {
    const result = await updateSection(id, data);
    if (result) {
      setEditingId(null);
      invalidateNavCache();
      refetch();
    }
  };

  const handleDelete = async (section: Section) => {
    const confirmed = await confirm({
      title: 'Delete Section',
      message: `Delete section "${section.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    const success = await deleteSection(section.id);
    if (success) {
      showToast('Section deleted');
      invalidateNavCache();
      refetch();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="admin-sections-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="section-title">Manage Sections</h1>
        <Button
          variant="primary"
          onClick={() => { setShowCreateForm(!showCreateForm); setEditingId(null); }}
          data-testid="create-section-button"
        >
          {showCreateForm ? 'Cancel' : 'New Section'}
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorDisplay
            error={ErrorService.createDisplayError(error)}
            onDismiss={clearError}
          />
        </div>
      )}

      {showCreateForm && (
        <SectionCreateForm onSubmit={handleCreate} disabled={mutating} />
      )}

      {loading ? (
        <div>Loading sections...</div>
      ) : (
        <div className="space-y-2" data-testid="sections-list">
          {sections.map(section => (
            editingId === section.id ? (
              <SectionEditForm
                key={section.id}
                section={section}
                onSubmit={(data) => handleUpdate(section.id, data)}
                onCancel={() => setEditingId(null)}
                disabled={mutating}
              />
            ) : (
              <SectionRow
                key={section.id}
                section={section}
                onEdit={() => { setEditingId(section.id); setShowCreateForm(false); }}
                onDelete={() => handleDelete(section)}
                onAddContent={() => router.push(`/editor?section_id=${section.id}`)}
                disabled={mutating}
              />
            )
          ))}
          {sections.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No sections found.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCreateForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (data: CreateSectionRequest) => void;
  disabled: boolean;
}) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<SectionContentType>('story');
  const [displayType, setDisplayType] = useState<DisplayType>('feed');
  const [navVisibility, setNavVisibility] = useState<NavVisibility>('main');
  const [icon, setIcon] = useState<SectionIcon>('default');

  const validDisplayTypes = CONTENT_TYPE_DISPLAYS[contentType];

  const handleContentTypeChange = (ct: SectionContentType) => {
    setContentType(ct);
    const valid = CONTENT_TYPE_DISPLAYS[ct];
    if (!valid.includes(displayType)) setDisplayType(valid[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), display_type: displayType, content_type: contentType, nav_visibility: navVisibility, icon });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3" data-testid="section-create-form">
      <div>
        <label htmlFor="new-section-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
        <Input
          id="new-section-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="mt-1 w-full"
          required
          disabled={disabled}
          data-testid="section-title-input"
        />
      </div>
      <div className={`grid grid-cols-1 gap-3 ${validDisplayTypes.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div>
          <label htmlFor="new-section-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content Type</label>
          <Select id="new-section-content" value={contentType} onChange={e => handleContentTypeChange(e.target.value as SectionContentType)} className="mt-1 w-full" disabled={disabled} data-testid="section-content-type-select">
            {CONTENT_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        {validDisplayTypes.length > 1 && (
          <div>
            <label htmlFor="new-section-display" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Type</label>
            <Select id="new-section-display" value={displayType} onChange={e => setDisplayType(e.target.value as DisplayType)} className="mt-1 w-full" disabled={disabled} data-testid="section-display-type-select">
              {validDisplayTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
        )}
        <div>
          <label htmlFor="new-section-nav" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nav Visibility</label>
          <Select id="new-section-nav" value={navVisibility} onChange={e => setNavVisibility(e.target.value as NavVisibility)} className="mt-1 w-full" disabled={disabled} data-testid="section-nav-visibility-select">
            {NAV_VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>
      <IconPicker value={icon} onChange={setIcon} disabled={disabled} />
      <Button type="submit" variant="primary" disabled={disabled} data-testid="section-create-submit">
        Create Section
      </Button>
    </form>
  );
}

function SectionRow({
  section,
  onEdit,
  onDelete,
  onAddContent,
  disabled,
}: {
  section: Section;
  onEdit: () => void;
  onDelete: () => void;
  onAddContent: () => void;
  disabled: boolean;
}) {
  const Icon = iconMap[(section.icon || 'default') as SectionIcon];
  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2" data-testid={`section-row-${section.id}`}>
      <div>
        <Icon className="inline-block w-4 h-4 mr-1.5 text-gray-500 dark:text-gray-400" />
        <span className="font-medium text-text-primary">{section.title}</span>
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">/{section.slug}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{section.display_type}</span>
        {section.content_type && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{section.content_type}</span>}
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{section.nav_visibility}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onAddContent}
          disabled={disabled}
          data-testid={`section-add-content-${section.id}`}
        >
          Add Content
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onEdit}
          disabled={disabled}
          data-testid={`section-edit-${section.id}`}
        >
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
          data-testid={`section-delete-${section.id}`}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function SectionEditForm({
  section,
  onSubmit,
  onCancel,
  disabled,
}: {
  section: Section;
  onSubmit: (data: Partial<CreateSectionRequest>) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [title, setTitle] = useState(section.title);
  const [contentType, setContentType] = useState<SectionContentType>((section.content_type || 'story') as SectionContentType);
  const [displayType, setDisplayType] = useState<DisplayType>(section.display_type);
  const [navVisibility, setNavVisibility] = useState<NavVisibility>(section.nav_visibility);
  const [icon, setIcon] = useState<SectionIcon>((section.icon || 'default') as SectionIcon);

  const validDisplayTypes = CONTENT_TYPE_DISPLAYS[contentType];

  const handleContentTypeChange = (ct: SectionContentType) => {
    setContentType(ct);
    const valid = CONTENT_TYPE_DISPLAYS[ct];
    if (!valid.includes(displayType)) setDisplayType(valid[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), display_type: displayType, nav_visibility: navVisibility, icon });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-2 border-indigo-500 rounded-lg space-y-3" data-testid={`section-edit-form-${section.id}`}>
      <div className={`grid grid-cols-1 gap-3 ${validDisplayTypes.length > 1 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <div>
          <label htmlFor={`edit-title-${section.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
          <Input
            id={`edit-title-${section.id}`}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="mt-1 w-full"
            required
            disabled={disabled}
            data-testid={`section-edit-title-${section.id}`}
          />
        </div>
        <div>
          <label htmlFor={`edit-content-${section.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content Type</label>
          <Select id={`edit-content-${section.id}`} value={contentType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleContentTypeChange(e.target.value as SectionContentType)} className="mt-1 w-full" disabled={disabled}>
            {CONTENT_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        {validDisplayTypes.length > 1 && (
          <div>
            <label htmlFor={`edit-display-${section.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Type</label>
            <Select id={`edit-display-${section.id}`} value={displayType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDisplayType(e.target.value as DisplayType)} className="mt-1 w-full" disabled={disabled}>
              {validDisplayTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
        )}
        <div>
          <label htmlFor={`edit-nav-${section.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nav Visibility</label>
          <Select id={`edit-nav-${section.id}`} value={navVisibility} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNavVisibility(e.target.value as NavVisibility)} className="mt-1 w-full" disabled={disabled}>
            {NAV_VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>
      <IconPicker value={icon} onChange={setIcon} disabled={disabled} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={disabled} data-testid={`section-edit-submit-${section.id}`}>
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} data-testid={`section-edit-cancel-${section.id}`}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
