/**
 * Hook for image uploads with validation, resize, filter selection, and editor integration.
 */
import { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { validateImageType, createFileValidationError, ALLOWED_IMAGE_TYPES, resizeImageFile } from '@/shared/utils/uploadUtils';
import { escapeHtmlAttr } from '@/shared/utils/htmlUtils';

export const FILTER_CANCEL = '__cancel__';
const RESPONSIVE_SIZES = '(max-width: 400px) 400px, (max-width: 768px) 768px, (max-width: 1536px) 1536px, 2048px';

export interface UseImageUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  refilterImage: (currentSrc: string) => Promise<void>;
  acceptTypes: string;
  isProcessing: boolean;
  pendingAltText: { resolve: (altText: string) => void } | null;
  pendingFilter: {
    imageUrl: string;
    resolve: (filter: string) => void;
  } | null;
}

export function useImageUpload(editor: Editor | null, sectionId?: string): UseImageUploadReturn {
  const baseUpload = useFileUpload({
    validate: validateImageType,
    createValidationError: (file, error) => createFileValidationError(file, error, 'image'),
    context: 'image',
  });

  const [pendingAltText, setPendingAltText] = useState<{
    resolve: (altText: string) => void;
  } | null>(null);

  const [pendingFilter, setPendingFilter] = useState<{
    imageUrl: string;
    resolve: (filter: string) => void;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const showFilterPicker = useCallback(async (resized: File | Blob): Promise<string> => {
    const imageUrl = URL.createObjectURL(resized);

    const filterPromise = new Promise<string>((resolve) => {
      setPendingFilter({ imageUrl, resolve });
    });

    const selectedFilter = await filterPromise;
    setPendingFilter(null);
    URL.revokeObjectURL(imageUrl);
    return selectedFilter;
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editor) return;

    const file = e.target.files[0];
    let resized: File | Blob;
    try {
      resized = await resizeImageFile(file);
    } catch {
      baseUpload.setError('Failed to process image. Please try a different file.');
      return;
    }
    const selectedFilter = await showFilterPicker(resized);

    if (selectedFilter === FILTER_CANCEL) {
      if (baseUpload.inputRef.current) {
        baseUpload.inputRef.current.value = '';
      }
      return;
    }

    const uploadFile = resized instanceof File ? resized : new File([resized], file.name, { type: resized.type });

    setIsProcessing(true);
    try {
      // Upload original and filtered in parallel when filter is applied
      const extraFields = { image_filter: 'none', section_id: sectionId || '' };
      const [originalResult, result] = await Promise.all([
        selectedFilter !== 'none'
          ? baseUpload.upload(uploadFile, extraFields)
          : Promise.resolve(null),
        baseUpload.upload(uploadFile, { ...extraFields, image_filter: selectedFilter }),
      ]);

      if (result?.urls?.length) {
        const altText = await new Promise<string>((resolve) => {
          setPendingAltText({ resolve });
        });
        setPendingAltText(null);

        const { urls, srcsets, dimensions } = result;
        const safeAlt = escapeHtmlAttr(altText);
        const attrs = [`src="${urls[0]}"`, `alt="${safeAlt}"`];
        if (srcsets?.length) {
          attrs.push(`srcset="${srcsets[0]}"`, `sizes="${RESPONSIVE_SIZES}"`);
        }
        if (dimensions?.length) {
          attrs.push(`width="${dimensions[0].width}"`, `height="${dimensions[0].height}"`);
        }
        if (selectedFilter !== 'none' && originalResult?.urls?.[0]) {
          attrs.push(`data-original-src="${originalResult.urls[0]}"`);
        }
        editor.commands.insertContent(`<img ${attrs.join(' ')} />`);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [editor, baseUpload, showFilterPicker, sectionId]);

  const refilterImage = useCallback(async (currentSrc: string) => {
    if (!editor) return;

    let response: Response;
    try {
      response = await fetch(currentSrc, { credentials: 'include' });
      if (!response.ok) return;
    } catch {
      return;
    }
    const blob = await response.blob();
    const fileName = currentSrc.split('/').pop() || 'image.jpg';
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

    let resized: File | Blob;
    try {
      resized = await resizeImageFile(file);
    } catch {
      baseUpload.setError('Failed to process image for re-filtering.');
      return;
    }
    const selectedFilter = await showFilterPicker(resized);

    if (selectedFilter === FILTER_CANCEL) return;

    const uploadFile = resized instanceof File ? resized : new File([resized], fileName, { type: resized.type });

    setIsProcessing(true);
    try {
      const result = await baseUpload.upload(uploadFile, { image_filter: selectedFilter, section_id: sectionId || '' });

      if (result?.urls?.length) {
        const { urls, srcsets, dimensions } = result;
        const newAttrs: Record<string, string | null> = { src: urls[0] };
        if (srcsets?.length) {
          newAttrs.srcset = srcsets[0];
          newAttrs.sizes = RESPONSIVE_SIZES;
        }
        if (dimensions?.length) {
          newAttrs.width = String(dimensions[0].width);
          newAttrs.height = String(dimensions[0].height);
        }
        newAttrs['data-original-src'] = currentSrc;
        editor.chain().focus().updateAttributes('image', newAttrs).run();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [editor, baseUpload, showFilterPicker, sectionId]);

  return {
    ...baseUpload,
    handleFileChange,
    refilterImage,
    acceptTypes: ALLOWED_IMAGE_TYPES.join(','),
    isProcessing,
    pendingAltText,
    pendingFilter,
  };
}
