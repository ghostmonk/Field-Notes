/**
 * Logging abstraction interfaces for platform-independent logging.
 * 
 * This module defines the core interfaces that allow the frontend to log
 * without being coupled to any specific logging provider (GCP, Datadog, Console, etc.).
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO', 
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL'
}

export interface LogContext {
    // Core application context
    component?: string;
    environment?: string;
    service_name?: string;
    service_version?: string;
    
    // Request/operation context
    request_id?: string;
    user_id?: string;
    session_id?: string;
    operation_id?: string;
    
    // Error context
    error_type?: string;
    error_code?: string;
    
    // Browser-specific context
    user_agent?: string;
    url?: string;
    referrer?: string;
    
    // Custom fields for application-specific context
    [key: string]: any;
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    context: LogContext;
    
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    
    http_method?: string;
    http_url?: string;
    http_status?: number;
    http_latency_ms?: number;
    http_response_size?: number;
    
    source_file?: string;
    source_line?: number;
    source_function?: string;
}

export interface LogProvider {
    /**
     * Initialize the logging provider with configuration.
     */
    initialize(config: Record<string, any>): Promise<boolean>;
    
    /**
     * Log an entry using the provider's implementation.
     */
    log(entry: LogEntry): Promise<boolean>;
    
    /**
     * Flush any pending logs (useful for batch providers).
     */
    flush(): Promise<void>;
    
    /**
     * Clean up resources and close connections.
     */
    close(): Promise<void>;
    
    /**
     * Return the name of the provider.
     */
    readonly name: string;
    
    /**
     * Return true if the provider supports structured logging.
     */
    readonly supportsStructuredLogging: boolean;
}

export interface Logger {
    /**
     * Create a new logger instance with additional context.
     * 
     * This allows for chaining context without modifying the original logger.
     */
    withContext(context: LogContext): Logger;
    
    /**
     * Log a debug message.
     */
    debug(message: string, context?: LogContext): void;
    
    /**
     * Log an info message.
     */
    info(message: string, context?: LogContext): void;
    
    /**
     * Log a warning message.
     */
    warn(message: string, context?: LogContext): void;
    
    /**
     * Log an error message, optionally with error details.
     */
    error(message: string, error?: Error, context?: LogContext): void;
    
    /**
     * Log a critical message, optionally with error details.
     */
    critical(message: string, error?: Error, context?: LogContext): void;
    
    /**
     * Log HTTP request information (for API calls).
     */
    logRequest(
        method: string,
        url: string,
        status?: number,
        latencyMs?: number,
        responseSize?: number,
        context?: LogContext
    ): void;
}

export interface LoggerFactory {
    /**
     * Create a logger for a specific component.
     */
    createLogger(component: string, defaultContext?: LogContext): Logger;
    
    /**
     * Set the logging provider to use for new loggers.
     */
    setProvider(provider: LogProvider): void;
    
    /**
     * Get the current logging provider.
     */
    getProvider(): LogProvider;
}
