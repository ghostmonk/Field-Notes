/**
 * Centralized error handling service for the frontend
 */

import { ApiRequestError, ErrorCode, StandardErrorResponse, ErrorSeverity, ERROR_SEVERITY_MAP, RequestDetails } from '@/shared/types/error';
import { logger } from '@/shared/utils/logger';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isStandardErrorResponse(value: unknown): value is StandardErrorResponse {
  return isObject(value) && 
         typeof value.error_code === 'string' && 
         typeof value.user_message === 'string';
}

function hasDetailProperty(value: unknown): value is { detail: unknown } {
  return isObject(value) && 'detail' in value;
}

function hasNestedStandardError(value: unknown): value is { detail: StandardErrorResponse } {
  return hasDetailProperty(value) && isStandardErrorResponse(value.detail);
}

export class ErrorService {
  /**
   * Parses an API error response into a standardized ApiRequestError.
   * 
   * This method is async to handle response.text() and maintain consistency
   * with other API-related operations. The async nature also allows for
   * future extensibility (e.g., logging, external validation, caching).
   * 
   * @param response - The failed HTTP response to parse
   * @param requestDetails - context about the original request
   * @returns Promise resolving to an ApiRequestError with parsed error details
   */
  static async parseApiError(response: Response, requestDetails?: RequestDetails): Promise<ApiRequestError> {
    let data: unknown;
    let message = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
        
        if (isStandardErrorResponse(data)) {
          message = data.user_message;
        } else if (hasNestedStandardError(data)) {
          message = data.detail.user_message;
          data = data.detail;
        } else if (hasDetailProperty(data) && typeof data.detail === 'string') {
          message = data.detail;
        }
      }
    } catch (parseError) {
      logger.warn('Failed to parse error response as JSON', parseError as Error);
      data = { detail: message };
    }

    return new ApiRequestError(message, response.status, data, requestDetails);
  }

  static getUserMessage(error: unknown): string {
    if (error instanceof ApiRequestError) {
      return error.getUserMessage();
    }
    
    if (isObject(error)) {
      if ('user_message' in error && typeof error.user_message === 'string') {
        return error.user_message;
      }
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
      if ('detail' in error && typeof error.detail === 'string') {
        return error.detail;
      }
    }
    
    if (typeof error === 'string') {
      return error;
    }

    if (isObject(error)) {
      try {
        return JSON.stringify(error);
      } catch {
        // fall through
      }
    }

    return 'An unexpected error occurred';
  }

  static getErrorSeverity(error: unknown): ErrorSeverity {
    if (error instanceof ApiRequestError && error.errorResponse?.error_code) {
      return ERROR_SEVERITY_MAP[error.errorResponse.error_code] || ErrorSeverity.ERROR;
    }
    
    if (error instanceof ApiRequestError) {
      if (error.status >= 500) return ErrorSeverity.CRITICAL;
      if (error.status >= 400) return ErrorSeverity.ERROR;
      if (error.status >= 300) return ErrorSeverity.WARNING;
    }
    
    return ErrorSeverity.ERROR;
  }

  static isErrorCode(error: unknown, code: ErrorCode): boolean {
    if (error instanceof ApiRequestError) {
      return error.isErrorCode(code);
    }
    
    if (isObject(error) && 'error_code' in error) {
      return error.error_code === code;
    }
    
    return false;
  }

  static getErrorSuggestions(error: unknown): string[] {
    if (error instanceof ApiRequestError && error.errorResponse?.details?.suggestions) {
      return error.errorResponse.details.suggestions;
    }
    
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        return ['Please log in again', 'Check if your session has expired'];
      }
      if (error.status === 403) {
        return ['Check your permissions', 'Contact an administrator if needed'];
      }
      if (error.status >= 500) {
        return ['Try again in a few moments', 'Contact support if the problem persists'];
      }
      if (error.status === 0) {
        return ['Check your internet connection', 'Try refreshing the page'];
      }
    }
    
    return [];
  }

  static logError(error: unknown, context?: string, additionalData?: unknown) {
    const severity = this.getErrorSeverity(error);
    const message = this.getUserMessage(error);
    const logData = {
      context,
      severity,
      ...(isObject(additionalData) ? additionalData : {})
    };

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`Critical error${context ? ` in ${context}` : ''}: ${message}`, error instanceof Error ? error : new Error(String(error)), logData);
        break;
      case ErrorSeverity.ERROR:
        logger.error(`Error${context ? ` in ${context}` : ''}: ${message}`, error instanceof Error ? error : new Error(String(error)), logData);
        break;
      case ErrorSeverity.WARNING:
        logger.warn(`Warning${context ? ` in ${context}` : ''}: ${message}`, logData);
        break;
      case ErrorSeverity.INFO:
        logger.info(`Info${context ? ` in ${context}` : ''}: ${message}`, logData);
        break;
    }
  }

  static handleAuthError(error: unknown): string {
    if (this.isErrorCode(error, ErrorCode.AUTHENTICATION_EXPIRED)) {
      return 'Your session has expired. Please log in again.';
    }
    
    if (this.isErrorCode(error, ErrorCode.AUTHENTICATION_REQUIRED)) {
      return 'You need to be logged in to perform this action.';
    }
    
    if (this.isErrorCode(error, ErrorCode.AUTHENTICATION_INVALID)) {
      return 'Your authentication is invalid. Please log in again.';
    }
    
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        return 'Your session has expired. Please log in again.';
      }
      if (error.status === 403) {
        return 'You do not have permission to perform this action.';
      }
    }
    
    return this.getUserMessage(error);
  }

  static handleUploadError(error: unknown, fileName?: string): string {
    const fileContext = fileName ? ` for "${fileName}"` : '';
    
    if (this.isErrorCode(error, ErrorCode.UPLOAD_FILE_TOO_LARGE)) {
      return this.getUserMessage(error);
    }
    
    if (this.isErrorCode(error, ErrorCode.UPLOAD_INVALID_FORMAT)) {
      return this.getUserMessage(error);
    }
    
    if (this.isErrorCode(error, ErrorCode.UPLOAD_PROCESSING_FAILED)) {
      return this.getUserMessage(error);
    }
    
    if (error instanceof ApiRequestError) {
      if (error.status === 413) {
        return `File${fileContext} is too large. Please choose a smaller file.`;
      }
      if (error.status === 415) {
        return `File format not supported${fileContext}. Please choose a different file type.`;
      }
    }
    
    return `Failed to upload file${fileContext}. ${this.getUserMessage(error)}`;
  }

  static createDisplayError(error: unknown): StandardErrorResponse | string {
    if (error instanceof ApiRequestError && error.errorResponse) {
      return error.errorResponse;
    }
    
    return this.getUserMessage(error);
  }
}
