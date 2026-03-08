/**
 * Upload utilities and constants
 */

import { StandardErrorResponse, ErrorCode } from '@/shared/types/error';

// File size limits (in bytes)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed file types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];

// User-friendly format names
export const ALLOWED_IMAGE_FORMATS = ['JPEG', 'PNG', 'GIF', 'WebP'];
export const ALLOWED_VIDEO_FORMATS = ['MP4', 'WebM', 'QuickTime', 'AVI'];

/**
 * Format file size in human-readable format
 */
export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  } else if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)}KB`;
  } else {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

/**
 * Get the maximum allowed size for a file type
 */
export function getMaxSizeForType(fileType: string): number {
  if (ALLOWED_IMAGE_TYPES.includes(fileType)) {
    return MAX_IMAGE_SIZE;
  } else if (ALLOWED_VIDEO_TYPES.includes(fileType)) {
    return MAX_VIDEO_SIZE;
  }
  return 0;
}

/**
 * Check if a file type is allowed for images
 */
export function isAllowedImageType(fileType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(fileType);
}

/**
 * Check if a file type is allowed for videos
 */
export function isAllowedVideoType(fileType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(fileType);
}

/**
 * Validate file size and type for images
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!isAllowedImageType(file.type)) {
    return {
      isValid: false,
      error: `This image format is not supported. Please use ${ALLOWED_IMAGE_FORMATS.join(', ')}.`
    };
  }
  
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `The image file is too large. Please choose a file smaller than ${formatFileSize(MAX_IMAGE_SIZE)}.`
    };
  }
  
  return { isValid: true };
}

/**
 * Validate file size and type for videos
 */
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
  if (!isAllowedVideoType(file.type)) {
    return {
      isValid: false,
      error: `This video format is not supported. Please use ${ALLOWED_VIDEO_FORMATS.join(', ')}.`
    };
  }
  
  if (file.size > MAX_VIDEO_SIZE) {
    return {
      isValid: false,
      error: `The video file is too large. Please choose a file smaller than ${formatFileSize(MAX_VIDEO_SIZE)}.`
    };
  }
  
  return { isValid: true };
}

/**
 * Create a structured error response for file validation failures
 */
export const MAX_CLIENT_RESIZE_DIMENSION = 2048;

/**
 * Resize an image file client-side if it exceeds maxDimension.
 * Returns the original file if no resize needed or if the file is an animated GIF.
 */
export async function resizeImageFile(
  file: File,
  maxDimension: number = MAX_CLIENT_RESIZE_DIMENSION
): Promise<File | Blob> {
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;

      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      const scale = maxDimension / Math.max(width, height);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
      const quality = file.type === 'image/jpeg' ? 0.92 : 0.90;

      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resize'));
    };

    img.src = url;
  });
}

export function createFileValidationError(
  file: File,
  validationError: string,
  fileType: 'image' | 'video'
): StandardErrorResponse {
  const isFormatError = fileType === 'image' 
    ? !ALLOWED_IMAGE_TYPES.includes(file.type)
    : !ALLOWED_VIDEO_TYPES.includes(file.type);
  
  const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  const allowedFormats = fileType === 'image' ? ALLOWED_IMAGE_FORMATS : ALLOWED_VIDEO_FORMATS;
  
  return {
    error_code: isFormatError ? ErrorCode.UPLOAD_INVALID_FORMAT : ErrorCode.UPLOAD_FILE_TOO_LARGE,
    user_message: validationError,
    details: {
      ...(isFormatError ? 
        { allowed_formats: allowedFormats } : 
        { 
          current_file_size: formatFileSize(file.size),
          max_file_size: formatFileSize(maxSize)
        }
      )
    }
  };
}
