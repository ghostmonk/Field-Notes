/**
 * Hook for image uploads with validation, resize, filter selection, and editor integration.
 */
import { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { validateImageType, createFileValidationError, ALLOWED_IMAGE_TYPES, resizeImageFile } from '@/shared/utils/uploadUtils';
import { escapeHtmlAttr } from '@/shared/utils/htmlUtils';

export interface UseImageUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  refilterImage: (currentSrc: string) => Promise<void>;
  acceptTypes: string;
  pendingAltText: { resolve: (altText: string) => void } | null;
  pendingFilter: {
    imageUrl: string;
    previews: Record<string, string>;
    loading: boolean;
    resolve: (filter: string) => void;
  } | null;
}

export function useImageUpload(editor: Editor | null): UseImageUploadReturn {
  const baseUpload = useFileUpload({
    validate: validateImageType,
    createValidationError: (file, error) => createFileValidationError(file, error, 'image'),
    context: 'image',
    preprocess: resizeImageFile,
  });

  const [pendingAltText, setPendingAltText] = useState<{
    resolve: (altText: string) => void;
  } | null>(null);

  const [pendingFilter, setPendingFilter] = useState<{
    imageUrl: string;
    previews: Record<string, string>;
    loading: boolean;
    resolve: (filter: string) => void;
  } | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editor) return;

    const file = e.target.files[0];

    // Resize first for preview and filter thumbnails
    const resized = await resizeImageFile(file);
    const imageUrl = URL.createObjectURL(resized);

    // Start filter selection flow
    const filterPromise = new Promise<string>((resolve) => {
      setPendingFilter({ imageUrl, previews: {}, loading: true, resolve });
    });

    // Fetch filter previews in background
    const previewFormData = new FormData();
    previewFormData.append('file', resized, file.name);
    try {
      const previewResponse = await fetch('/api/filter-previews', {
        method: 'POST',
        body: previewFormData,
        credentials: 'include',
      });
      if (previewResponse.ok) {
        const previewData = await previewResponse.json();
        setPendingFilter((prev) => prev ? { ...prev, previews: previewData.previews || {}, loading: false } : null);
      } else {
        setPendingFilter((prev) => prev ? { ...prev, loading: false } : null);
      }
    } catch {
      setPendingFilter((prev) => prev ? { ...prev, loading: false } : null);
    }

    // Wait for user to pick a filter
    const selectedFilter = await filterPromise;
    setPendingFilter(null);
    URL.revokeObjectURL(imageUrl);

    if (selectedFilter === '__cancel__') {
      // Reset input so same file can be selected again
      if (baseUpload.inputRef.current) {
        baseUpload.inputRef.current.value = '';
      }
      return;
    }

    const result = await baseUpload.upload(resized instanceof File ? resized : new File([resized], file.name, { type: resized.type }), { image_filter: selectedFilter });

    if (result?.urls?.length) {
      // Request alt text from user
      const altText = await new Promise<string>((resolve) => {
        setPendingAltText({ resolve });
      });
      setPendingAltText(null);

      const { urls, srcsets, dimensions } = result;
      const safeAlt = escapeHtmlAttr(altText);
      const attrs = [`src="${urls[0]}"`, `alt="${safeAlt}"`];
      if (srcsets?.length) {
        attrs.push(`srcset="${srcsets[0]}"`, `sizes="(max-width: 400px) 400px, (max-width: 768px) 768px, (max-width: 1536px) 1536px, 2048px"`);
      }
      if (dimensions?.length) {
        attrs.push(`width="${dimensions[0].width}"`, `height="${dimensions[0].height}"`);
      }
      editor.commands.insertContent(`<img ${attrs.join(' ')} />`);
    }
  }, [editor, baseUpload]);

  const refilterImage = useCallback(async (currentSrc: string) => {
    if (!editor) { console.error('[refilter] no editor'); return; }

    console.log('[refilter] fetching image from:', currentSrc);
    let response: Response;
    try {
      response = await fetch(currentSrc, { credentials: 'include' });
      if (!response.ok) { console.error('[refilter] fetch failed:', response.status); return; }
    } catch (err) {
      console.error('[refilter] fetch error:', err);
      return;
    }
    const blob = await response.blob();
    console.log('[refilter] blob:', blob.size, blob.type);
    const fileName = currentSrc.split('/').pop() || 'image.jpg';
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

    const resized = await resizeImageFile(file);
    console.log('[refilter] resized:', resized instanceof File ? 'File' : 'Blob', (resized as Blob).size);
    const imageUrl = URL.createObjectURL(resized);

    // Show filter picker
    const filterPromise = new Promise<string>((resolve) => {
      console.log('[refilter] opening filter picker');
      setPendingFilter({ imageUrl, previews: {}, loading: true, resolve });
    });

    // Fetch previews
    const previewFormData = new FormData();
    previewFormData.append('file', resized, fileName);
    try {
      const previewResponse = await fetch('/api/filter-previews', {
        method: 'POST',
        body: previewFormData,
        credentials: 'include',
      });
      console.log('[refilter] preview response:', previewResponse.status);
      if (previewResponse.ok) {
        const previewData = await previewResponse.json();
        console.log('[refilter] preview keys:', Object.keys(previewData.previews || {}));
        setPendingFilter((prev) => prev ? { ...prev, previews: previewData.previews || {}, loading: false } : null);
      } else {
        console.error('[refilter] preview failed:', previewResponse.status);
        setPendingFilter((prev) => prev ? { ...prev, loading: false } : null);
      }
    } catch (err) {
      console.error('[refilter] preview error:', err);
      setPendingFilter((prev) => prev ? { ...prev, loading: false } : null);
    }

    console.log('[refilter] waiting for user filter selection...');
    const selectedFilter = await filterPromise;
    console.log('[refilter] selected:', selectedFilter);
    setPendingFilter(null);
    URL.revokeObjectURL(imageUrl);

    if (selectedFilter === '__cancel__') return;

    // Re-upload with new filter
    const uploadFile = resized instanceof File ? resized : new File([resized], fileName, { type: resized.type });
    const result = await baseUpload.upload(uploadFile, { image_filter: selectedFilter });

    if (result?.urls?.length) {
      // Update the currently selected image node's attributes
      const { urls, srcsets, dimensions } = result;
      const newAttrs: Record<string, string | null> = { src: urls[0] };
      if (srcsets?.length) {
        newAttrs.srcset = srcsets[0];
        newAttrs.sizes = '(max-width: 400px) 400px, (max-width: 768px) 768px, (max-width: 1536px) 1536px, 2048px';
      }
      if (dimensions?.length) {
        newAttrs.width = String(dimensions[0].width);
        newAttrs.height = String(dimensions[0].height);
      }
      editor.chain().focus().updateAttributes('image', newAttrs).run();
    }
  }, [editor, baseUpload]);

  return {
    ...baseUpload,
    handleFileChange,
    refilterImage,
    acceptTypes: ALLOWED_IMAGE_TYPES.join(','),
    pendingAltText,
    pendingFilter,
  };
}
