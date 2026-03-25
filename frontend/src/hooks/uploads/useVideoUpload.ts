/**
 * Hook for video uploads with validation, poster extraction, and editor integration.
 */
import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { validateVideoFile, createFileValidationError, ALLOWED_VIDEO_TYPES } from '@/shared/utils/uploadUtils';
import { extractVideoPoster } from '@/shared/utils/videoPoster';
import { logger } from '@/shared/utils/logger';

export interface UseVideoUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  acceptTypes: string;
}

/**
 * Hook for handling video uploads in the rich text editor.
 * Extracts a poster frame and real dimensions from the video before inserting.
 */
export function useVideoUpload(editor: Editor | null): UseVideoUploadReturn {
  const baseUpload = useFileUpload({
    validate: validateVideoFile,
    createValidationError: (file, error) => createFileValidationError(file, error, 'video'),
    context: 'video',
  });

  const posterUpload = useFileUpload({
    validate: () => ({ isValid: true }),
    createValidationError: (file, error) => createFileValidationError(file, error, 'image'),
    context: 'poster',
  });

  const { upload: uploadPoster } = posterUpload;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editor) return;

    const file = e.target.files[0];
    const loadingText = `[Uploading video ${file.name}...]`;

    // Insert loading placeholder
    editor.commands.insertContent(loadingText);

    // Extract poster frame and real dimensions while uploading video
    const [videoResult, posterData] = await Promise.all([
      baseUpload.upload(file),
      extractVideoPoster(file).catch((err) => {
        logger.warn('Poster extraction failed, proceeding without poster', err);
        return null;
      }),
    ]);

    // Get current HTML and remove placeholder
    const content = editor.getHTML();
    const cleanedContent = videoResult
      ? content.replace(loadingText, '')
      : content.replace(/\[Uploading video .*?\]/g, '');

    if (videoResult?.urls?.length) {
      const videoUrl = videoResult.urls[0];
      const dimensions = posterData
        ? { width: posterData.width, height: posterData.height }
        : videoResult.dimensions?.[0] || { width: 1280, height: 720 };

      // Upload poster frame if extraction succeeded
      let posterUrl = '';
      if (posterData) {
        const posterFile = new File(
          [posterData.posterBlob],
          `${file.name.replace(/\.[^.]+$/, '')}_poster.jpg`,
          { type: 'image/jpeg' }
        );
        const posterResult = await uploadPoster(posterFile);
        if (posterResult?.urls?.length) {
          posterUrl = posterResult.urls[0];
        }
      }

      // Build video tag with poster and correct dimensions
      const posterAttr = posterUrl ? ` poster="${posterUrl}"` : '';
      const videoTag = `<video src="${videoUrl}"${posterAttr} width="${dimensions.width}" height="${dimensions.height}" controls muted></video>`;
      editor.commands.setContent(cleanedContent + videoTag);
    } else {
      editor.commands.setContent(cleanedContent);
    }
  }, [editor, baseUpload, uploadPoster]);

  return {
    ...baseUpload,
    handleFileChange,
    acceptTypes: ALLOWED_VIDEO_TYPES.join(','),
  };
}
