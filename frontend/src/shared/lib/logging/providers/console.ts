/**
 * Console logging provider for development and simple deployments.
 * 
 * This provider outputs structured logs to the browser console or Node.js console,
 * making it suitable for development environments and platforms that capture console logs.
 */

import { LogProvider, LogEntry, LogLevel } from '../interfaces';

export class ConsoleLogProvider implements LogProvider {
    private jsonFormat: boolean;
    private includeSource: boolean;
    private initialized: boolean = false;

    constructor(jsonFormat: boolean = false, includeSource: boolean = true) {
        this.jsonFormat = jsonFormat;
        this.includeSource = includeSource;
    }

    async initialize(config: Record<string, any>): Promise<boolean> {
        // Override defaults with config
        this.jsonFormat = config.json_format ?? this.jsonFormat;
        this.includeSource = config.include_source ?? this.includeSource;
        
        this.initialized = true;
        return true;
    }

    async log(entry: LogEntry): Promise<boolean> {
        if (!this.initialized) {
            return false;
        }

        try {
            if (this.jsonFormat) {
                this.logJson(entry);
            } else {
                this.logFormatted(entry);
            }
            return true;
        } catch (error) {
            // Fallback to basic console.error to avoid logging loops
            console.error('Console logging error:', error);
            return false;
        }
    }

    private logJson(entry: LogEntry): void {
        const logData: any = {
            timestamp: entry.timestamp.toISOString(),
            level: entry.level,
            message: entry.message,
            component: entry.context.component
        };

        // Add context
        if (entry.context) {
            const contextData = { ...entry.context };
            delete contextData.component; // Already included at top level
            if (Object.keys(contextData).length > 0) {
                logData.context = contextData;
            }
        }

        // Add source location if enabled
        if (this.includeSource && entry.source_file) {
            logData.source = {
                file: entry.source_file,
                line: entry.source_line,
                function: entry.source_function
            };
        }

        // Add error info
        if (entry.error) {
            logData.error = entry.error;
        }

        // Add HTTP request info
        if (entry.http_method) {
            logData.http = {
                method: entry.http_method,
                url: entry.http_url,
                status: entry.http_status,
                latency_ms: entry.http_latency_ms,
                response_size: entry.http_response_size
            };
            // Remove undefined values
            Object.keys(logData.http).forEach(key => {
                if (logData.http[key] === undefined) {
                    delete logData.http[key];
                }
            });
        }

        // Use appropriate console method
        this.getConsoleMethod(entry.level)(JSON.stringify(logData));
    }

    private logFormatted(entry: LogEntry): void {
        const timestamp = entry.timestamp.toLocaleTimeString();
        const level = entry.level;
        const component = entry.context.component || 'app';
        
        // Base message
        let message = `[${timestamp}] [${level}] [${component}] ${entry.message}`;

        // Add context if present
        const contextData = { ...entry.context };
        delete contextData.component; // Already included
        delete contextData.environment; // Usually not interesting in browser logs
        delete contextData.user_agent; // Too verbose
        
        const contextItems: string[] = [];
        Object.entries(contextData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                contextItems.push(`${key}=${value}`);
            }
        });
        
        if (contextItems.length > 0) {
            message += ` | ${contextItems.join(', ')}`;
        }

        // Add source if enabled
        if (this.includeSource && entry.source_file) {
            const source = `${entry.source_file}:${entry.source_line}:${entry.source_function}`;
            message += ` | ${source}`;
        }

        // Log the message
        const consoleMethod = this.getConsoleMethod(entry.level);
        if (entry.error) {
            consoleMethod(message, entry.error);
        } else {
            consoleMethod(message);
        }
    }

    private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
        switch (level) {
            case LogLevel.DEBUG:
                return console.debug;
            case LogLevel.INFO:
                return console.info;
            case LogLevel.WARNING:
                return console.warn;
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                return console.error;
            default:
                return console.log;
        }
    }

    async flush(): Promise<void> {
        // Console output is immediate, no need to flush
    }

    async close(): Promise<void> {
        // No resources to clean up for console logging
    }

    get name(): string {
        return 'console';
    }

    get supportsStructuredLogging(): boolean {
        return this.jsonFormat;
    }
}
