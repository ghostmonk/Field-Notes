import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Section } from '@/shared/types/api';
import apiClient from '@/shared/lib/api-client';
import { StoryEditorForm, ProjectEditorForm, PageEditorForm } from '@/modules/editor/components';
import { PhotoEssayEditor } from '@/modules/photo-essays';
import { useFetchSections } from '@/modules/sections';

export default function EditorPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { section_id, id } = router.query;
  const sectionId = typeof section_id === 'string' ? section_id : undefined;
  const editId = typeof id === 'string' ? id : undefined;

  const [section, setSection] = useState<Section | null>(null);
  const [loadingSection, setLoadingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  // Resolve section_id from content item when editing without section_id
  const accessToken = session?.accessToken;
  useEffect(() => {
    if (sectionId || !editId || !accessToken) return;

    let cancelled = false;
    setLoadingSection(true);

    // Try fetching as story first (most common), then project
    apiClient.stories.getById(editId, accessToken)
      .then(story => {
        if (cancelled) return;
        if (story.section_id) {
          router.replace({ pathname: '/editor', query: { id: editId, section_id: story.section_id } }, undefined, { shallow: true });
        } else {
          setSectionError('This content has no section assigned. Edit it from its section page instead.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Try as project by ID
        return apiClient.projects.getById(editId, accessToken).then(project => {
          if (cancelled) return;
          if (project.section_id) {
            router.replace({ pathname: '/editor', query: { id: editId, section_id: project.section_id } }, undefined, { shallow: true });
          } else {
            setSectionError('This content has no section assigned. Edit it from its section page instead.');
          }
        });
      })
      .catch(() => {
        if (!cancelled) setSectionError('Content not found.');
      })
      .finally(() => { if (!cancelled) setLoadingSection(false); });

    return () => { cancelled = true; };
  }, [editId, sectionId, accessToken, router]);

  // Fetch section when section_id is provided
  useEffect(() => {
    if (!sectionId) {
      setSection(null);
      return;
    }

    let cancelled = false;
    setLoadingSection(true);
    setSectionError(null);

    apiClient.sections.getById(sectionId, session?.accessToken)
      .then(data => { if (!cancelled) setSection(data); })
      .catch(() => { if (!cancelled) setSectionError('Failed to load section'); })
      .finally(() => { if (!cancelled) setLoadingSection(false); });

    return () => { cancelled = true; };
  }, [sectionId, session?.accessToken]);

  const handleSectionSelect = useCallback((s: Section) => {
    router.push(`/editor?section_id=${s.id}`);
  }, [router]);

  if (status === 'loading' || status === 'unauthenticated' || loadingSection) {
    return <div>Loading...</div>;
  }

  if (sectionError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">{sectionError}</p>
      </div>
    );
  }

  // No section selected — show section picker
  if (!section) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="editor-page">
        <SectionPicker onSelect={handleSectionSelect} />
      </div>
    );
  }

  // Render the correct form based on content_type
  return (
    <div className="container mx-auto px-4 py-8" data-testid="editor-page">
      {section.content_type === 'story' && <StoryEditorForm section={section} />}
      {section.content_type === 'project' && <ProjectEditorForm section={section} />}
      {section.content_type === 'page' && <PageEditorForm section={section} />}
      {section.content_type === 'photo_essay' && session?.accessToken && (
        <PhotoEssayEditor sectionId={section.id} essayId={editId} token={session.accessToken} />
      )}
      {!['story', 'project', 'page', 'photo_essay'].includes(section.content_type) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Content type &quot;{section.content_type}&quot; does not have an editor form yet.
        </div>
      )}
    </div>
  );
}

function SectionPicker({ onSelect }: { onSelect: (section: Section) => void }) {
  const { sections, loading } = useFetchSections();
  const editableSections = sections.filter(s =>
    ['story', 'project', 'page', 'photo_essay'].includes(s.content_type)
  );

  useEffect(() => {
    if (!loading && editableSections.length === 1) {
      onSelect(editableSections[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, editableSections.length, onSelect]);

  if (loading || editableSections.length === 1) return <div>Loading...</div>;

  return (
    <div data-testid="section-picker">
      <h1 className="section-title mb-4">Select a Section</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose which section to create content for.</p>
      <div className="grid gap-3 max-w-2xl">
        {editableSections.map(section => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section)}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            data-testid={`section-picker-${section.slug}`}
          >
            <div>
              <span className="font-medium text-text-primary">{section.title}</span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({section.content_type})</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {section.display_type}
            </span>
          </button>
        ))}
        {editableSections.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No editable sections found.</p>
        )}
      </div>
    </div>
  );
}
