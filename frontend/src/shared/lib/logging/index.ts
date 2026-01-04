/**
 * Logging abstraction layer for platform-independent logging.
 * 
 * This package provides a clean interface for logging that can be backed by
 * different providers (Console, Remote API, etc.) without requiring application 
 * code changes.
 * 
 * Example usage:
 *   import { getLogger } from '@/lib/logging';
 *   
 *   const logger = getLogger('my-component');
 *   logger.info("Application started", { version: "1.0.0" });
 *   
 *   // With request context
 *   const requestLogger = logger.withContext({ request_id: "123", user_id: "user456" });
 *   requestLogger.info("Processing request");
 */

export type { 
    LogLevel, 
    LogContext, 
    LogEntry, 
    Logger, 
    LogProvider, 
    LoggerFactory 
} from './interfaces';

export { 
    createLoggerFactory, 
    getLogger, 
    setProvider 
} from './factory';

export {
    autoConfigureLogging,
    setupLoggingForEnvironment,
    setupDevelopmentLogging,
    setupProductionLogging,
    detectEnvironment,
    getAvailableProviders,
    type Environment,
    type LoggingConfig
} from './setup';

export {
    ConsoleLogProvider
} from './providers';
