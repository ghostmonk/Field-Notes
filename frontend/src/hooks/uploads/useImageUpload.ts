/**
 * Hook for image uploads with validation and editor integration.
 */
import { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { useFileUpload, UseFileUploadReturn } from './useFileUpload';
import { validateImageFile, createFileValidationError, ALLOWED_IMAGE_TYPES } from '@/shared/utils/uploadUtils';
import { escapeHtmlAttr } from '@/shared/utils/htmlUtils';

export interface UseImageUploadReturn extends UseFileUploadReturn {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  acceptTypes: string;
  pendingAltText: { resolve: (altText: string) => void } | null;
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

  const [pendingAltText, setPendingAltText] = useState<{
    resolve: (altText: string) => void;
  } | null>(null);

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
      // Request alt text from user via dialog
      const altText = await new Promise<string>((resolve) => {
        setPendingAltText({ resolve });
      });
      setPendingAltText(null);

      const { urls, srcsets, dimensions } = result;
      // Manual escaping required: TipTap insertContent injects raw HTML, bypassing React's auto-escaping
      const safeAlt = escapeHtmlAttr(altText);
      const attrs = [`src="${urls[0]}"`, `alt="${safeAlt}"`];
      if (srcsets?.length) {
        attrs.push(`srcset="${srcsets[0]}"`, `sizes="(max-width: 500px) 500px, (max-width: 750px) 750px, 1200px"`);
      }
      if (dimensions?.length) {
        attrs.push(`width="${dimensions[0].width}"`, `height="${dimensions[0].height}"`);
      }
      editor.commands.insertContent(`<img ${attrs.join(' ')} />`);
    }
  }, [editor, baseUpload]);

  return {
    ...baseUpload,
    handleFileChange,
    acceptTypes: ALLOWED_IMAGE_TYPES.join(','),
    pendingAltText,
  };
}
