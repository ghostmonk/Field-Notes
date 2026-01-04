/**
 * Logger factory implementation that manages provider selection and logger creation.
 */

import { Logger, LoggerFactory, LogProvider, LogLevel, LogContext, LogEntry } from './interfaces';

export class DefaultLogger implements Logger {
    private component: string;
    private provider: LogProvider;
    private defaultContext: LogContext;

    constructor(component: string, provider: LogProvider, defaultContext: LogContext = {}) {
        this.component = component;
        this.provider = provider;
        this.defaultContext = defaultContext;
    }

    withContext(context: LogContext): Logger {
        const mergedContext = { ...this.defaultContext, ...context };
        return new DefaultLogger(this.component, this.provider, mergedContext);
    }

    private createLogEntry(
        level: LogLevel,
        message: string,
        error?: Error,
        context: LogContext = {}
    ): LogEntry {
        // Merge all context
        const mergedContext: LogContext = {
            ...this.defaultContext,
            ...context,
            component: this.component,
            environment: process.env.NODE_ENV,
            service_name: process.env.NEXT_PUBLIC_SERVICE_NAME,
            service_version: process.env.NEXT_PUBLIC_SERVICE_VERSION,
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            referrer: typeof window !== 'undefined' ? document.referrer : undefined,
        };

        // Get stack trace for source location
        const stack = new Error().stack;
        let sourceFile: string | undefined;
        let sourceLine: number | undefined;
        let sourceFunction: string | undefined;

        if (stack) {
            // Parse stack trace to get caller information
            const lines = stack.split('\n');
            // Find the first stack line that does not reference internal logging methods
            const internalMethods = [
                'createLogEntry',
                'log', 'info', 'warn', 'error', 'debug', 'trace', // common log level methods
                'DefaultLogger.'
            ];
            let callerLine: string | undefined;
            for (let i = 1; i < lines.length; i++) { // skip the first line ("Error")
                const line = lines[i];
                if (!internalMethods.some(method => line.includes(method))) {
                    callerLine = line;
                    break;
                }
            }
            if (callerLine) {
                const match = callerLine.match(/at (.+?) \((.+?):(\d+):\d+\)/) ||
                             callerLine.match(/at (.+?):(\d+):\d+/) ||
                             callerLine.match(/(.+?)@(.+?):(\d+):\d+/);
                if (match) {
                    sourceFunction = match[1]?.trim();
                    sourceFile = match[2]?.trim();
                    sourceLine = parseInt(match[3], 10);
                }
            }
        }

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            context: mergedContext,
            source_file: sourceFile,
            source_line: sourceLine,
            source_function: sourceFunction
        };

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }

        return entry;
    }

    debug(message: string, context?: LogContext): void {
        const entry = this.createLogEntry(LogLevel.DEBUG, message, undefined, context);
        this.provider.log(entry).catch(console.error);
    }

    info(message: string, context?: LogContext): void {
        const entry = this.createLogEntry(LogLevel.INFO, message, undefined, context);
        this.provider.log(entry).catch(console.error);
    }

    warn(message: string, context?: LogContext): void {
        const entry = this.createLogEntry(LogLevel.WARNING, message, undefined, context);
        this.provider.log(entry).catch(console.error);
    }

    error(message: string, error?: Error, context?: LogContext): void {
        const entry = this.createLogEntry(LogLevel.ERROR, message, error, context);
        this.provider.log(entry).catch(console.error);
    }

    critical(message: string, error?: Error, context?: LogContext): void {
        const entry = this.createLogEntry(LogLevel.CRITICAL, message, error, context);
        this.provider.log(entry).catch(console.error);
    }

    logRequest(
        method: string,
        url: string,
        status?: number,
        latencyMs?: number,
        responseSize?: number,
        context?: LogContext
    ): void {
        const level = status && status >= 500 ? LogLevel.ERROR :
                     status && status >= 400 ? LogLevel.WARNING :
                     LogLevel.INFO;

        let message = `${method} ${url}`;
        if (status) {
            message += ` -> ${status}`;
        }

        const entry = this.createLogEntry(level, message, undefined, context);
        entry.http_method = method;
        entry.http_url = url;
        entry.http_status = status;
        entry.http_latency_ms = latencyMs;
        entry.http_response_size = responseSize;

        this.provider.log(entry).catch(console.error);
    }
}

export class DefaultLoggerFactory implements LoggerFactory {
    private provider: LogProvider;

    constructor(provider: LogProvider) {
        this.provider = provider;
    }

    createLogger(component: string, defaultContext?: LogContext): Logger {
        return new DefaultLogger(component, this.provider, defaultContext || {});
    }

    setProvider(provider: LogProvider): void {
        if (this.provider) {
            this.provider.close().catch(console.error);
        }
        this.provider = provider;
    }

    getProvider(): LogProvider {
        return this.provider;
    }
}

// Global factory instance
let _loggerFactory: LoggerFactory | null = null;

export function createLoggerFactory(provider: LogProvider): LoggerFactory {
    const factory = new DefaultLoggerFactory(provider);
    _loggerFactory = factory;
    return factory;
}

export function getLogger(component: string, defaultContext?: LogContext): Logger {
    if (!_loggerFactory) {
        throw new Error('Logger factory not initialized. Call createLoggerFactory() first.');
    }
    
    return _loggerFactory.createLogger(component, defaultContext);
}

export function setProvider(provider: LogProvider): void {
    if (!_loggerFactory) {
        throw new Error('Logger factory not initialized. Call createLoggerFactory() first.');
    }
    
    _loggerFactory.setProvider(provider);
}
