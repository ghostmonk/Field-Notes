/**
 * Standardized error types for the frontend
 */

export enum ErrorCode {
  // Upload errors
  UPLOAD_FILE_TOO_LARGE = "UPLOAD_FILE_TOO_LARGE",
  UPLOAD_INVALID_FORMAT = "UPLOAD_INVALID_FORMAT", 
  UPLOAD_PROCESSING_FAILED = "UPLOAD_PROCESSING_FAILED",
  UPLOAD_NETWORK_ERROR = "UPLOAD_NETWORK_ERROR",
  
  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  VALIDATION_REQUIRED_FIELD = "VALIDATION_REQUIRED_FIELD",
  VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT",
  
  // Authentication errors
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  AUTHENTICATION_EXPIRED = "AUTHENTICATION_EXPIRED", 
  AUTHENTICATION_INVALID = "AUTHENTICATION_INVALID",
  
  // Authorization errors
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  
  // Network/System errors
  NETWORK_ERROR = "NETWORK_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
}

export interface ErrorDetails {
  max_file_size?: string;
  current_file_size?: string;
  allowed_formats?: string[];
  field_errors?: Record<string, string>;
  suggestions?: string[];
  resource_id?: string;
}

export interface StandardErrorResponse {
  error_code: ErrorCode;
  user_message: string;
  details?: ErrorDetails;
  request_id?: string;
}

export interface RequestDetails {
  url: string;
  method: string;
  hasToken: boolean;
  bodyPreview?: string;
}

export interface ErrorDisplayProps {
  error: StandardErrorResponse | string;
  onDismiss?: () => void;
  className?: string;
  showDetails?: boolean;
}

// Legacy API error format for backwards compatibility
export interface ApiError {
  detail: string;
  status?: number;
  error?: string;
}

// Enhanced API request error class
export class ApiRequestError extends Error {
  status: number;
  data: unknown;
  errorResponse?: StandardErrorResponse;
  requestDetails?: RequestDetails;

  constructor(
    message: string, 
    status: number, 
    data?: unknown, 
    requestDetails?: RequestDetails
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.data = data;
    this.requestDetails = requestDetails;
    
    // Try to parse structured error response
    if (data && typeof data === 'object' && 'error_code' in data) {
      this.errorResponse = data as StandardErrorResponse;
    }
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiRequestError);
    }
  }

  /**
   * Get user-friendly error message, preferring structured response
   */
  getUserMessage(): string {
    if (this.errorResponse) {
      return this.errorResponse.user_message;
    }
    return this.message;
  }

  /**
   * Get error details if available
   */
  getErrorDetails(): ErrorDetails | undefined {
    return this.errorResponse?.details;
  }

  /**
   * Get error code if available
   */
  getErrorCode(): ErrorCode | undefined {
    return this.errorResponse?.error_code;
  }

  /**
   * Check if this is a specific error type
   */
  isErrorCode(code: ErrorCode): boolean {
    return this.errorResponse?.error_code === code;
  }
}

// Error severity levels for different display styles
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning", 
  ERROR = "error",
  CRITICAL = "critical"
}

// Map error codes to severity levels
export const ERROR_SEVERITY_MAP: Record<ErrorCode, ErrorSeverity> = {
  [ErrorCode.UPLOAD_FILE_TOO_LARGE]: ErrorSeverity.WARNING,
  [ErrorCode.UPLOAD_INVALID_FORMAT]: ErrorSeverity.WARNING,
  [ErrorCode.UPLOAD_PROCESSING_FAILED]: ErrorSeverity.ERROR,
  [ErrorCode.UPLOAD_NETWORK_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.VALIDATION_ERROR]: ErrorSeverity.WARNING,
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: ErrorSeverity.WARNING,
  [ErrorCode.VALIDATION_INVALID_FORMAT]: ErrorSeverity.WARNING,
  [ErrorCode.AUTHENTICATION_REQUIRED]: ErrorSeverity.INFO,
  [ErrorCode.AUTHENTICATION_EXPIRED]: ErrorSeverity.INFO,
  [ErrorCode.AUTHENTICATION_INVALID]: ErrorSeverity.WARNING,
  [ErrorCode.PERMISSION_DENIED]: ErrorSeverity.WARNING,
  [ErrorCode.RESOURCE_NOT_FOUND]: ErrorSeverity.WARNING,
  [ErrorCode.NETWORK_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.INTERNAL_ERROR]: ErrorSeverity.CRITICAL,
  [ErrorCode.SERVICE_UNAVAILABLE]: ErrorSeverity.ERROR
};
