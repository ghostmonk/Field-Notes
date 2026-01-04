/**
 * Platform-independent logging for the frontend.
 * 
 * Provides a clean logging interface that automatically detects the environment
 * and chooses the appropriate provider (console, structured JSON, etc.)
 */

import { Logger, LoggerFactory, autoConfigureLogging } from '@/lib/logging';

let _factory: LoggerFactory | null = null;
let _initPromise: Promise<LoggerFactory> | null = null;

async function getFactory(): Promise<LoggerFactory> {
    if (_factory) return _factory;
    
    if (!_initPromise) {
        _initPromise = autoConfigureLogging();
    }
    
    _factory = await _initPromise;
    return _factory;
}

let _defaultLogger: Logger | null = null;

async function getDefaultLogger(): Promise<Logger> {
    if (_defaultLogger) return _defaultLogger;
    
    const factory = await getFactory();
    _defaultLogger = factory.createLogger('app');
    return _defaultLogger;
}

export async function getComponentLogger(component: string, defaultContext: any = {}): Promise<Logger> {
    const factory = await getFactory();
    return factory.createLogger(component, defaultContext);
}

export async function getRequestLogger(requestId: string, context: any = {}): Promise<Logger> {
    const logger = await getDefaultLogger();
    return logger.withContext({ request_id: requestId, ...context });
}

export const logger = {
    debug: async (message: string, context?: any) => {
        const l = await getDefaultLogger();
        return l.debug(message, context);
    },
    info: async (message: string, context?: any) => {
        const l = await getDefaultLogger();
        return l.info(message, context);
    },
    warn: async (message: string, context?: any) => {
        const l = await getDefaultLogger();
        return l.warn(message, context);
    },
    error: async (message: string, error?: Error, context?: any) => {
        const l = await getDefaultLogger();
        return l.error(message, error, context);
    },
    critical: async (message: string, error?: Error, context?: any) => {
        const l = await getDefaultLogger();
        return l.critical(message, error, context);
    },
    logRequest: async (method: string, url: string, status?: number, latencyMs?: number, responseSize?: number, context?: any) => {
        const l = await getDefaultLogger();
        return l.logRequest(method, url, status, latencyMs, responseSize, context);
    }
};

export class LoggerManager {
    private static instance: LoggerManager;
    private factory: LoggerFactory | null = null;
    private loggers: Map<string, Logger> = new Map();

    static getInstance(): LoggerManager {
        if (!LoggerManager.instance) {
            LoggerManager.instance = new LoggerManager();
        }
        return LoggerManager.instance;
    }

    async initialize(): Promise<void> {
        if (!this.factory) {
            this.factory = await autoConfigureLogging();
        }
    }

    async getLogger(component: string, defaultContext: any = {}): Promise<Logger> {
        await this.initialize();
        
        const key = `${component}:${JSON.stringify(defaultContext)}`;
        if (!this.loggers.has(key)) {
            const logger = this.factory!.createLogger(component, defaultContext);
            this.loggers.set(key, logger);
        }
        
        return this.loggers.get(key)!;
    }

    async createRequestLogger(requestId: string, context: any = {}): Promise<Logger> {
        const baseLogger = await this.getLogger('request');
        return baseLogger.withContext({ request_id: requestId, ...context });
    }

    async createApiLogger(endpoint: string, method: string): Promise<Logger> {
        const baseLogger = await this.getLogger('api');
        return baseLogger.withContext({ endpoint, method });
    }

    async createErrorLogger(component: string): Promise<Logger> {
        const baseLogger = await this.getLogger('error');
        return baseLogger.withContext({ error_component: component });
    }
}

export const loggerManager = LoggerManager.getInstance();

export const apiLogger = {
    async logRequest(method: string, url: string, status?: number, latencyMs?: number, context?: any) {
        const logger = await loggerManager.createApiLogger(url, method);
        logger.logRequest(method, url, status, latencyMs, undefined, context);
    },
    
    async logApiRequest(req: any, res?: any) {
        const logger = await loggerManager.createApiLogger(req.url || 'unknown', req.method || 'unknown');
        const startTime = Date.now();
        
        logger.info(`API request started: ${req.method} ${req.url}`, {
            method: req.method,
            url: req.url,
            query: req.query,
            headers: req.headers
        });
        
        if (res) {
            const latencyMs = Date.now() - startTime;
            logger.logRequest(req.method, req.url, res.statusCode, latencyMs, undefined, {
                query: req.query
            });
        }
    },
    
    async info(message: string, context?: any) {
        const logger = await loggerManager.getLogger('api');
        logger.info(message, context);
    },
    
    async error(message: string, error?: Error, context?: any) {
        const logger = await loggerManager.getLogger('api');
        logger.error(message, error, context);
    },
    
    async logError(method: string, url: string, error: Error, context?: any) {
        const logger = await loggerManager.createApiLogger(url, method);
        logger.error(`API call failed: ${method} ${url}`, error, context);
    },
    
    async logSuccess(method: string, url: string, latencyMs?: number, context?: any) {
        const logger = await loggerManager.createApiLogger(url, method);
        logger.info(`API call succeeded: ${method} ${url}`, { latency_ms: latencyMs, ...context });
    }
};

export const errorLogger = {
    async logError(component: string, message: string, error: Error, context?: any) {
        const logger = await loggerManager.createErrorLogger(component);
        logger.error(message, error, context);
    },
    
    async logWarning(component: string, message: string, context?: any) {
        const logger = await loggerManager.createErrorLogger(component);
        logger.warn(message, context);
    }
};

loggerManager.initialize().catch(console.error);
