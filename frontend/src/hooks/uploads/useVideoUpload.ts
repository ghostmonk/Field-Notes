/**
 * Hook for video uploads with validation and editor integration.
 */
import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { validateVideoFile, createFileValidationError, ALLOWED_VIDEO_TYPES } from '@/shared/utils/uploadUtils';

export interface UseVideoUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  acceptTypes: string;
}

/**
 * Hook for handling video uploads in the rich text editor.
 * Manages validation, upload state, and editor content updates.
 */
export function useVideoUpload(editor: Editor | null): UseVideoUploadReturn {
  const baseUpload = useFileUpload({
    validate: validateVideoFile,
    createValidationError: (file, error) => createFileValidationError(file, error, 'video'),
    context: 'video',
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editor) return;

    const file = e.target.files[0];
    const loadingText = `[Uploading video ${file.name}...]`;

    // Insert loading placeholder
    editor.commands.insertContent(loadingText);

    const result = await baseUpload.upload(file);

    // Get current HTML and remove placeholder
    const content = editor.getHTML();
    const cleanedContent = result
      ? content.replace(loadingText, '')
      : content.replace(/\[Uploading video .*?\]/g, '');

    if (result?.urls?.length) {
      const videoUrl = result.urls[0];
      const dimensions = result.dimensions?.[0] || { width: 1280, height: 720 };

      // Build video tag and inject into the HTML in a single setContent call.
      // Two separate commands (setContent + setVideo) race with the content
      // sync useEffect in RichTextEditor, losing the video node.
      const videoTag = `<video src="${videoUrl}" width="${dimensions.width}" height="${dimensions.height}" controls muted></video>`;
      editor.commands.setContent(cleanedContent + videoTag);
    } else {
      editor.commands.setContent(cleanedContent);
    }
  }, [editor, baseUpload]);

  return {
    ...baseUpload,
    handleFileChange,
    acceptTypes: ALLOWED_VIDEO_TYPES.join(','),
  };
}
