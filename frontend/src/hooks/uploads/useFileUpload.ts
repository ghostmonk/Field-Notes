/**
 * Base hook for file uploads with error handling.
 */
import { useState, useCallback, useRef } from 'react';
import { ApiRequestError, StandardErrorResponse } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { logger } from '@/shared/utils/logger';

export interface UploadResponse {
  urls: string[];
  srcsets?: string[];
  dimensions?: Array<{ width: number; height: number }>;
  jobId?: string;
}

export interface UseFileUploadOptions {
  validate: (file: File) => { isValid: boolean; error?: string };
  createValidationError: (file: File, error: string) => StandardErrorResponse;
  context: string;
  preprocess?: (file: File) => Promise<File | Blob>;
}

export interface UseFileUploadReturn {
  uploading: boolean;
  error: StandardErrorResponse | string | ApiRequestError | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  clearError: () => void;
  upload: (file: File, extraFields?: Record<string, string>) => Promise<UploadResponse | null>;
  triggerFileSelect: () => void;
}

/**
 * Base hook for handling file uploads to the backend.
 * Provides validation, error handling, and upload state management.
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const { validate, createValidationError, context, preprocess } = options;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<StandardErrorResponse | string | ApiRequestError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const triggerFileSelect = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const upload = useCallback(async (file: File, extraFields?: Record<string, string>): Promise<UploadResponse | null> => {
    setError(null);

    // Validate file type
    const validation = validate(file);
    if (!validation.isValid) {
      setError(createValidationError(file, validation.error!));
      return null;
    }

    setUploading(true);

    try {
      // Run preprocess (e.g., client-side resize)
      let processedFile: File | Blob = file;
      if (preprocess) {
        processedFile = await preprocess(file);
      }

      const formData = new FormData();
      formData.append('files', processedFile, file.name);
      if (extraFields) {
        for (const [key, value] of Object.entries(extraFields)) {
          formData.append(key, value);
        }
      }

      const response = await fetch('/api/upload-proxy', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      logger.info(`${context} upload response received`, { status: response.status });

      if (!response.ok) {
        const apiError = await ErrorService.parseApiError(response);
        ErrorService.logError(apiError, context, { fileName: file.name });
        setError(apiError);
        return null;
      }

      const data: UploadResponse = await response.json();
      logger.info(`${context} upload successful`, { data });

      return data;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err);
      } else {
        ErrorService.logError(err, context, { fileName: file.name });
        setError(ErrorService.createDisplayError(err));
      }
      return null;
    } finally {
      setUploading(false);
      // Reset the input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [validate, createValidationError, context, preprocess]);

  return {
    uploading,
    error,
    inputRef,
    clearError,
    upload,
    triggerFileSelect,
  };
}
