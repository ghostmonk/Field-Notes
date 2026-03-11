import { useState, useEffect, useCallback, useRef, DragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/shared/lib/api-client';
import { resizeImageFile } from '@/shared/utils/uploadUtils';

interface EditorPhoto {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<EditorPhoto[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [coverPosition, setCoverPosition] = useState('center center');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!essayId);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load existing essay when editing
  useEffect(() => {
    if (!essayId) return;
    let cancelled = false;

    apiClient.photoEssays.getById(essayId).then(essay => {
      if (cancelled) return;
      setTitle(essay.title);
      setDescription(essay.description || '');
      setCoverUrl(essay.cover_image_url);
      setCoverPosition(essay.cover_image_position || 'center center');
      setIsPublished(essay.is_published);
      setPhotos(
        essay.photos.map((p, i) => ({
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
    }).catch(() => {
      if (!cancelled) {
        setError('Failed to load photo essay.');
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [essayId]);

  const handleFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPhotos: EditorPhoto[] = Array.from(files).map((_, i) => ({
      url: '',
      caption: '',
      width: 0,
      height: 0,
      sort_order: photos.length + i,
      uploading: true,
    }));

    setPhotos(prev => [...prev, ...newPhotos]);

    const startIndex = photos.length;

    const failures: string[] = [];

    await Promise.all(
      Array.from(files).map(async (file, i) => {
        const resized = await resizeImageFile(file);
        const formData = new FormData();
        formData.append('files', resized);

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
        } catch (err) {
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
  }, [photos.length]);

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
    setPhotos(prev =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  }, []);

  const handleSetCover = useCallback((url: string) => {
    setCoverUrl(url);
  }, []);

  const positionPreviewRef = useRef<HTMLDivElement>(null);

  const handlePositionClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const container = positionPreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setCoverPosition(`${xPct}% ${yPct}%`);
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

    const effectiveCover = coverUrl && readyPhotos.some(p => p.url === coverUrl)
      ? coverUrl
      : readyPhotos[0].url;

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
          cover_image_position: coverPosition,
          photos: photoItems,
          is_published: isPublished,
        }, token);
      } else {
        await apiClient.photoEssays.create({
          title: title.trim(),
          description: description.trim() || undefined,
          cover_image_url: effectiveCover,
          cover_image_position: coverPosition,
          photos: photoItems,
          section_id: sectionId,
          is_published: isPublished,
        }, token);
      }

      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [title, description, photos, coverUrl, coverPosition, isPublished, essayId, sectionId, token, router]);

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
              onChange={e => setIsPublished(e.target.checked)}
              data-testid="photo-essay-publish-toggle"
            />
            {' '}Publish
          </label>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || uploading}
            data-testid="photo-essay-save-btn"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-state mb-lg">
          <p className="error-state__message">{error}</p>
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
                key={`${photo.url || 'uploading'}-${index}`}
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
                    <button
                      type="button"
                      className="btn btn--sm btn--secondary"
                      onClick={() => handleSetCover(photo.url)}
                      data-testid={`photo-essay-set-cover-${index}`}
                    >
                      {isCover ? 'Cover' : 'Set cover'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => handleRemovePhoto(index)}
                    data-testid={`photo-essay-remove-${index}`}
                  >
                    Remove
                  </button>
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
