import { useState, useEffect, useCallback, useRef, DragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import apiClient from '@/shared/lib/api-client';
import { REFRESH_TOKEN_ERROR } from '@/shared/lib/auth';
import { resizeImageFile } from '@/shared/utils/uploadUtils';
import { Button } from '@/components/ui';
import { useDraftRecovery } from '@/modules/editor/hooks/useDraftRecovery';

interface PhotoEssayDraftPhoto {
  url: string;
  srcset?: string;
  caption: string;
  width: number;
  height: number;
  sort_order: number;
}

interface PhotoEssayDraftData {
  title: string;
  description: string;
  coverUrl: string | null;
  coverPosition: string;
  isPublished: boolean;
  photos: PhotoEssayDraftPhoto[];
}

interface EditorPhoto {
  id: string;
  url: string;
  srcset?: string;
  caption: string;
  width: number;
  height: number;
  sort_order: number;
  uploading: boolean;
}

interface Props {
  sectionId: string;
  essayId?: string;
  token: string;
}

export function PhotoEssayEditor({ sectionId, essayId, token }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startIndexRef = useRef(0);

  const [title, setTitleState] = useState('');
  const [description, setDescriptionState] = useState('');
  const [photos, setPhotos] = useState<EditorPhoto[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [coverPosition, setCoverPosition] = useState('50% 50%');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!essayId);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isDirtyRef = useRef(false);
  const hasCheckedDraftRef = useRef(false);
  const fetchDoneRef = useRef(!essayId);

  const titleRef = useRef(title);
  titleRef.current = title;
  const descriptionRef = useRef(description);
  descriptionRef.current = description;
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const coverUrlRef = useRef(coverUrl);
  coverUrlRef.current = coverUrl;
  const coverPositionRef = useRef(coverPosition);
  coverPositionRef.current = coverPosition;
  const isPublishedRef = useRef(isPublished);
  isPublishedRef.current = isPublished;

  const setTitle = useCallback((v: string) => {
    isDirtyRef.current = true;
    setTitleState(v);
  }, []);

  const setDescription = useCallback((v: string) => {
    isDirtyRef.current = true;
    setDescriptionState(v);
  }, []);

  const isEmptyPhotoEssayDraft = useCallback(
    (d: PhotoEssayDraftData) => !d.title && d.photos.length === 0,
    []
  );

  const { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave } =
    useDraftRecovery<PhotoEssayDraftData>({
      contentType: 'photo-essay',
      entityId: essayId,
      sectionId,
      isEmpty: isEmptyPhotoEssayDraft,
    });

  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<PhotoEssayDraftData | null>(null);

  // Load existing essay when editing
  useEffect(() => {
    if (!essayId) return;
    let cancelled = false;

    apiClient.photoEssays.getById(essayId).then(essay => {
      if (cancelled) return;
      setTitleState(essay.title);
      setDescriptionState(essay.description || '');
      setCoverUrl(essay.cover_image_url);
      setCoverPosition(essay.cover_image_position || '50% 50%');
      setIsPublished(essay.is_published);
      setPhotos(
        essay.photos.map((p, i) => ({
          id: crypto.randomUUID(),
          url: p.url,
          srcset: p.srcset,
          caption: p.caption || '',
          width: p.width,
          height: p.height,
          sort_order: i,
          uploading: false,
        }))
      );
      setLoading(false);
      fetchDoneRef.current = true;
    }).catch(() => {
      if (!cancelled) {
        setError('Failed to load photo essay.');
        setLoading(false);
        fetchDoneRef.current = true;
      }
    });

    return () => { cancelled = true; };
  }, [essayId]);

  const handleFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    isDirtyRef.current = true;

    const newPhotos: EditorPhoto[] = Array.from(files).map(() => ({
      id: crypto.randomUUID(),
      url: '',
      caption: '',
      width: 0,
      height: 0,
      sort_order: 0,
      uploading: true,
    }));

    setPhotos(prev => {
      startIndexRef.current = prev.length;
      return [...prev, ...newPhotos.map((p, i) => ({ ...p, sort_order: prev.length + i }))];
    });

    const startIndex = startIndexRef.current;

    const failures: string[] = [];

    await Promise.all(
      Array.from(files).map(async (file, i) => {
        const resized = await resizeImageFile(file);
        const formData = new FormData();
        formData.append('files', resized);
        formData.append('section_id', sectionId);

        try {
          const response = await fetch('/api/upload-proxy', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(errData?.detail || errData?.error || response.statusText);
          }

          const data = await response.json();

          setPhotos(prev =>
            prev.map((p, idx) =>
              idx === startIndex + i
                ? {
                    ...p,
                    url: data.urls[0],
                    srcset: data.srcsets?.[0],
                    width: data.dimensions?.[0]?.width || 0,
                    height: data.dimensions?.[0]?.height || 0,
                    uploading: false,
                  }
                : p
            )
          );
        } catch (_err) {
          failures.push(file.name);
          setPhotos(prev =>
            prev.map((p, idx) =>
              idx === startIndex + i ? { ...p, uploading: false, url: '' } : p
            )
          );
        }
      })
    );

    // Remove all failed uploads and report once
    if (failures.length > 0) {
      setPhotos(prev => prev.filter(p => p.url !== ''));
      setError(`Failed to upload: ${failures.join(', ')}`);
    }
  }, [sectionId]);

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    isDirtyRef.current = true;
    setPhotos(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated.map((p, i) => ({ ...p, sort_order: i }));
    });

    setDragIndex(null);
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    isDirtyRef.current = true;
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const removedUrl = prev[index]?.url;
      if (removedUrl && coverUrl === removedUrl) {
        setCoverUrl(updated.length > 0 ? updated[0].url : null);
      }
      return updated.map((p, i) => ({ ...p, sort_order: i }));
    });
  }, [coverUrl]);

  const handleCaptionChange = useCallback((index: number, caption: string) => {
    isDirtyRef.current = true;
    setPhotos(prev =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  }, []);

  const positionPreviewRef = useRef<HTMLDivElement>(null);

  const handlePositionClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const container = positionPreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setCoverPosition(`${xPct}% ${yPct}%`);
    isDirtyRef.current = true;
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const readyPhotos = photos.filter(p => !p.uploading && p.url);
    if (readyPhotos.length === 0) {
      setError('At least one photo is required.');
      return;
    }

    const coverPhoto = readyPhotos.find(p => p.url === coverUrl) || readyPhotos[0];
    const effectiveCover = coverPhoto.url;
    const effectiveCoverSrcset = coverPhoto.srcset || undefined;

    setSaving(true);
    setError(null);

    const photoItems = readyPhotos.map((p, i) => ({
      url: p.url,
      srcset: p.srcset,
      caption: p.caption || undefined,
      width: p.width,
      height: p.height,
      sort_order: i,
    }));

    try {
      if (essayId) {
        await apiClient.photoEssays.update(essayId, {
          title: title.trim(),
          description: description.trim() || undefined,
          cover_image_url: effectiveCover,
          cover_image_srcset: effectiveCoverSrcset,
          cover_image_position: coverPosition,
          photos: photoItems,
          is_published: isPublished,
        }, token);
      } else {
        await apiClient.photoEssays.create({
          title: title.trim(),
          description: description.trim() || undefined,
          cover_image_url: effectiveCover,
          cover_image_srcset: effectiveCoverSrcset,
          cover_image_position: coverPosition,
          photos: photoItems,
          section_id: sectionId,
          is_published: isPublished,
        }, token);
      }

      clearDraft();
      stopAutosave();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [title, description, photos, coverUrl, coverPosition, isPublished, essayId, sectionId, token, router, clearDraft, stopAutosave]);

  const getCurrentDraftState = useCallback((): PhotoEssayDraftData => {
    const readyPhotos = photosRef.current.filter(p => !p.uploading && p.url);
    return {
      title: titleRef.current,
      description: descriptionRef.current,
      coverUrl: coverUrlRef.current,
      coverPosition: coverPositionRef.current,
      isPublished: isPublishedRef.current,
      photos: readyPhotos.map((p, i) => ({
        url: p.url,
        srcset: p.srcset,
        caption: p.caption,
        width: p.width,
        height: p.height,
        sort_order: i,
      })),
    };
  }, []);

  // Check for recovered draft on initial load
  useEffect(() => {
    if (loading || hasCheckedDraftRef.current || !fetchDoneRef.current) return;
    hasCheckedDraftRef.current = true;
    const draft = loadDraft();
    if (draft && (draft.title || draft.photos.length > 0)) {
      const photoCaptions = (ps: typeof draft.photos) => ps.map(p => p.caption).join('|');
      if (
        draft.title !== titleRef.current ||
        draft.description !== descriptionRef.current ||
        draft.coverUrl !== coverUrlRef.current ||
        draft.coverPosition !== coverPositionRef.current ||
        draft.photos.length !== photosRef.current.length ||
        photoCaptions(draft.photos) !== photoCaptions(photosRef.current)
      ) {
        setRecoveredDraft(draft);
        setShowDraftRecovery(true);
      }
    }
  }, [loading, loadDraft]);

  // Start autosave timer
  useEffect(() => {
    startAutosave(() => {
      if (!isDirtyRef.current) return null;
      return getCurrentDraftState();
    });
    return () => stopAutosave();
  }, [startAutosave, stopAutosave, getCurrentDraftState]);

  // Save draft on beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        saveDraft(getCurrentDraftState());
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraft, getCurrentDraftState]);

  // Save draft on session error
  useEffect(() => {
    if (session?.error !== REFRESH_TOKEN_ERROR) return;
    if (titleRef.current || photosRef.current.length > 0) {
      saveDraft(getCurrentDraftState());
    }
  }, [session?.error, saveDraft, getCurrentDraftState]);

  const acceptDraft = useCallback(() => {
    if (recoveredDraft) {
      setTitleState(recoveredDraft.title);
      setDescriptionState(recoveredDraft.description);
      setCoverUrl(recoveredDraft.coverUrl);
      setCoverPosition(recoveredDraft.coverPosition);
      setIsPublished(recoveredDraft.isPublished);
      setPhotos(
        recoveredDraft.photos.map((p) => ({
          id: crypto.randomUUID(),
          url: p.url,
          srcset: p.srcset,
          caption: p.caption,
          width: p.width,
          height: p.height,
          sort_order: p.sort_order,
          uploading: false,
        }))
      );
      isDirtyRef.current = true;
    }
    setShowDraftRecovery(false);
  }, [recoveredDraft]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  }, [clearDraft]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const uploading = photos.some(p => p.uploading);

  const effectiveCoverUrl = coverUrl || (photos.find(p => !p.uploading && p.url)?.url ?? null);

  return (
    <div className="photo-essay-editor" data-testid="photo-essay-editor">
      <div className="photo-essay-editor__top-bar">
        <h1 className="page-title">{essayId ? 'Edit Photo Essay' : 'New Photo Essay'}</h1>
        <div className="photo-essay-editor__top-actions">
          <label className="photo-essay-editor__publish-toggle">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={e => { setIsPublished(e.target.checked); isDirtyRef.current = true; }}
              data-testid="photo-essay-publish-toggle"
            />
            {' '}Publish
          </label>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={saving || uploading}
            data-testid="photo-essay-save-btn"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-state mb-lg">
          <p className="error-state__message">{error}</p>
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

      <div className="photo-essay-editor__field">
        <label htmlFor="pe-title">Title</label>
        <input
          id="pe-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Photo essay title"
          data-testid="photo-essay-title-input"
        />
      </div>

      <div className="photo-essay-editor__field">
        <label htmlFor="pe-description">Description</label>
        <textarea
          id="pe-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
          data-testid="photo-essay-description-input"
        />
      </div>

      <div className="photo-essay-editor__field">
        <label>Photos</label>
        <div
          className="photo-essay-editor__upload-area"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={e => {
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
          data-testid="photo-essay-upload-area"
        >
          Click to select images or drag files here
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
            data-testid="photo-essay-file-input"
          />
        </div>
      </div>

      {photos.length > 0 && (
        <div className="photo-essay-editor__photos-grid" data-testid="photo-essay-photos-grid">
          {photos.map((photo, index) => {
            const isCover = photo.url === coverUrl || (!coverUrl && index === 0 && !photo.uploading && photo.url);
            const classNames = [
              'photo-essay-editor__thumbnail',
              isCover ? 'photo-essay-editor__thumbnail--cover' : '',
              photo.uploading ? 'photo-essay-editor__thumbnail--uploading' : '',
              dragOverIndex === index ? 'photo-essay-editor__thumbnail--drag-over' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={photo.id}
                className={classNames}
                draggable={!photo.uploading}
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                data-testid={`photo-essay-thumbnail-${index}`}
              >
                {photo.uploading ? (
                  <div className="photo-essay-editor__thumbnail-placeholder">
                    Uploading...
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt={photo.caption || `Photo ${index + 1}`} />
                )}
                <div className="photo-essay-editor__thumbnail-actions">
                  {!photo.uploading && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => { setCoverUrl(photo.url); isDirtyRef.current = true; }}
                      data-testid={`photo-essay-set-cover-${index}`}
                    >
                      {isCover ? 'Cover' : 'Set cover'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemovePhoto(index)}
                    data-testid={`photo-essay-remove-${index}`}
                  >
                    Remove
                  </Button>
                </div>
                <input
                  className="photo-essay-editor__caption-input"
                  type="text"
                  placeholder="Caption"
                  value={photo.caption}
                  onChange={e => handleCaptionChange(index, e.target.value)}
                  data-testid={`photo-essay-caption-${index}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {effectiveCoverUrl && (
        <div className="photo-essay-editor__field">
          <label>Cover Image Position</label>
          <p className="photo-essay-editor__hint">Click on the preview to set the focal point for the cover card.</p>
          <div
            ref={positionPreviewRef}
            className="photo-essay-editor__position-preview"
            onClick={handlePositionClick}
            data-testid="photo-essay-position-preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effectiveCoverUrl}
              alt="Cover preview"
              className="photo-essay-editor__position-image"
              style={{ objectPosition: coverPosition }}
              data-no-zoom="true"
            />
            <div
              className="photo-essay-editor__position-marker"
              style={{
                left: coverPosition.split(' ')[0],
                top: coverPosition.split(' ')[1] || coverPosition.split(' ')[0],
              }}
              data-testid="photo-essay-position-marker"
            />
          </div>
        </div>
      )}
    </div>
  );
}
