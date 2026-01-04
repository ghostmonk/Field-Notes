import React, { useState, useEffect } from 'react';
import { ErrorDisplayProps, ErrorSeverity, StandardErrorResponse } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';

/**
 * Reusable error display component with consistent styling and behavior
 */
export function ErrorDisplay({ error, onDismiss, className = '', showDetails = false }: ErrorDisplayProps) {
  const [showExpandedDetails, setShowExpandedDetails] = useState(false);
  
  if (!error) return null;

  const isStructured = typeof error === 'object' && 'error_code' in error;
  const errorData = isStructured ? error as StandardErrorResponse : null;
  const userMessage = ErrorService.getUserMessage(error);
  const severity = ErrorService.getErrorSeverity(error);
  const suggestions = ErrorService.getErrorSuggestions(error);

  // Get styling based on severity
  const severityStyles = {
    [ErrorSeverity.INFO]: {
      container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
      icon: '📘',
      title: 'Information'
    },
    [ErrorSeverity.WARNING]: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      icon: '⚠️',
      title: 'Warning'
    },
    [ErrorSeverity.ERROR]: {
      container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      icon: '❌',
      title: 'Error'
    },
    [ErrorSeverity.CRITICAL]: {
      container: 'bg-red-100 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-100',
      icon: '🚨',
      title: 'Critical Error'
    }
  };

  const styles = severityStyles[severity];

  return (
    <div className={`rounded-lg border p-4 ${styles.container} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-lg flex-shrink-0" role="img" aria-label={styles.title}>
            {styles.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium mb-1">{styles.title}</h3>
            <p className="text-sm">{userMessage}</p>
            
            {errorData?.details && (
              <div className="mt-2 text-xs space-y-1">
                {errorData.details.current_file_size && (
                  <div>File size: <span className="font-mono">{errorData.details.current_file_size}</span></div>
                )}
                {errorData.details.max_file_size && (
                  <div>Maximum allowed: <span className="font-mono">{errorData.details.max_file_size}</span></div>
                )}
                {errorData.details.allowed_formats && (
                  <div>Supported formats: <span className="font-mono">{errorData.details.allowed_formats.join(', ')}</span></div>
                )}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-medium mb-1">What you can do:</h4>
                <ul className="text-xs space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showDetails && errorData && (
              <div className="mt-3">
                <button
                  onClick={() => setShowExpandedDetails(!showExpandedDetails)}
                  className="text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50 rounded"
                >
                  {showExpandedDetails ? 'Hide' : 'Show'} Technical Details
                </button>
                
                {showExpandedDetails && (
                  <div className="mt-2 p-2 bg-gray-800 text-gray-100 text-xs rounded font-mono overflow-auto max-h-32">
                    <div>Error Code: {errorData.error_code}</div>
                    {errorData.request_id && <div>Request ID: {errorData.request_id}</div>}
                    {errorData.details?.field_errors && (
                      <div className="mt-1">
                        Field Errors: {JSON.stringify(errorData.details.field_errors, null, 2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 flex-shrink-0 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50 hover:bg-black hover:bg-opacity-10"
            aria-label="Dismiss error"
          >
            <span className="text-lg">×</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Toast-style error notification that auto-dismisses
 */
export function ErrorToast({ error, onDismiss, duration = 5000 }: ErrorDisplayProps & { duration?: number }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!isVisible || !error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <ErrorDisplay 
        error={error} 
        onDismiss={() => {
          setIsVisible(false);
          onDismiss?.();
        }}
        className="shadow-lg"
      />
    </div>
  );
}

/**
 * Inline error display for forms and inputs
 */
export function InlineError({ error, className = '' }: { error: string | StandardErrorResponse | null; className?: string }) {
  if (!error) return null;
  
  const message = ErrorService.getUserMessage(error);
  
  return (
    <div className={`text-sm text-red-600 dark:text-red-400 mt-1 ${className}`}>
      {message}
    </div>
  );
}
