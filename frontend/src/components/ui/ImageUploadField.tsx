import { useCallback, useRef, useState } from 'react';
import { useFileUpload } from '@/hooks/uploads';
import { validateImageType, createFileValidationError, ALLOWED_IMAGE_TYPES, resizeImageFile } from '@/shared/utils/uploadUtils';
import { ErrorService } from '@/services/errorService';
import { Button } from './Button';

interface ImageUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  sectionId?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

export function ImageUploadField({ value, onChange, sectionId, disabled, ...props }: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { uploading, error, upload, clearError } = useFileUpload({
    validate: validateImageType,
    createValidationError: (file, err) => createFileValidationError(file, err, 'image'),
    context: 'project-image',
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    clearError();

    const file = e.target.files[0];
    let resized: File | Blob;
    try {
      resized = await resizeImageFile(file);
    } catch {
      return;
    }

    const localPreview = URL.createObjectURL(resized);
    setPreview(localPreview);

    const uploadFile = resized instanceof File ? resized : new File([resized], file.name, { type: resized.type });
    const extraFields: Record<string, string> = { image_filter: 'none' };
    if (sectionId) extraFields.section_id = sectionId;

    const result = await upload(uploadFile, extraFields);
    URL.revokeObjectURL(localPreview);

    if (result?.urls?.length) {
      setPreview(null);
      onChange(result.urls[0]);
    } else {
      setPreview(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [upload, onChange, sectionId, clearError]);

  const handleRemove = useCallback(() => {
    onChange(null);
    setPreview(null);
  }, [onChange]);

  const displayUrl = preview || value;

  return (
    <div className="image-upload-field" data-testid={props['data-testid']}>
      {displayUrl ? (
        <div className="image-upload-field__preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt="Project image" className="image-upload-field__img" />
          <div className="image-upload-field__actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? 'Uploading...' : 'Replace'}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="image-upload-field__dropzone"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? 'Uploading...' : 'Click to upload project image'}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleFileChange}
        className="image-upload-field__input"
        disabled={disabled || uploading}
      />

      {error && (
        <div className="image-upload-field__error">
          {typeof error === 'string' ? error : ErrorService.getUserMessage(error)}
        </div>
      )}
    </div>
  );
}
