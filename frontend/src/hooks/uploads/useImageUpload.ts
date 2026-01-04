/**
 * Hook for image uploads with validation and editor integration.
 */
import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { validateImageFile, createFileValidationError, ALLOWED_IMAGE_TYPES } from '@/shared/utils/uploadUtils';

export interface UseImageUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  acceptTypes: string;
}

/**
 * Hook for handling image uploads in the rich text editor.
 * Manages validation, upload state, and editor content updates.
 */
export function useImageUpload(editor: Editor | null): UseImageUploadReturn {
  const baseUpload = useFileUpload({
    validate: validateImageFile,
    createValidationError: (file, error) => createFileValidationError(file, error, 'image'),
    context: 'image',
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !editor) return;

    const file = e.target.files[0];
    const loadingText = `![Uploading ${file.name}...]()`;

    // Insert loading placeholder
    editor.commands.insertContent(loadingText);

    const result = await baseUpload.upload(file);

    // Remove loading placeholder regardless of success/failure
    const content = editor.getHTML();
    const updatedContent = result
      ? content.replace(loadingText, '')
      : content.replace(/!\[Uploading .*?\]\(\)/g, '');
    editor.commands.setContent(updatedContent);

    if (result?.urls?.length) {
      const { urls, srcsets, dimensions } = result;

      if (srcsets?.length && dimensions?.length) {
        // Full responsive image with srcset and dimensions
        const imgHTML = `<img src="${urls[0]}" srcset="${srcsets[0]}" sizes="(max-width: 500px) 500px, (max-width: 750px) 750px, 1200px" width="${dimensions[0].width}" height="${dimensions[0].height}" alt="${file.name}" />`;
        editor.commands.insertContent(imgHTML);
      } else if (srcsets?.length) {
        // Responsive image without dimensions
        const imgHTML = `<img src="${urls[0]}" srcset="${srcsets[0]}" sizes="(max-width: 500px) 500px, (max-width: 750px) 750px, 1200px" alt="${file.name}" />`;
        editor.commands.insertContent(imgHTML);
      } else {
        // Basic image fallback
        editor.commands.insertContent(`<img src="${urls[0]}" alt="${file.name}" />`);
      }
    }
  }, [editor, baseUpload]);

  return {
    ...baseUpload,
    handleFileChange,
    acceptTypes: ALLOWED_IMAGE_TYPES.join(','),
  };
}
