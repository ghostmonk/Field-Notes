/**
 * Logging setup utilities for automatic provider detection and configuration.
 */

import { LogProvider, LoggerFactory } from './interfaces';
import { createLoggerFactory } from './factory';
import { ConsoleLogProvider } from './providers';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface LoggingConfig {
    provider?: 'console';
    environment?: Environment;
    console?: {
        jsonFormat?: boolean;
        includeSource?: boolean;
    };
}

export function detectEnvironment(): Environment {
    if (typeof process !== 'undefined' && process.env.NODE_ENV) {
        switch (process.env.NODE_ENV) {
            case 'development':
                return 'development';
            case 'production':
                return 'production';
            case 'test':
                return 'test';
            default:
                return 'development';
        }
    }
    
    // Fallback based on hostname in browser
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
            return 'development';
        }
        if (hostname.includes('staging') || hostname.includes('dev')) {
            return 'staging';
        }
        return 'production';
    }
    
    return 'development';
}

export function createProviderFromConfig(providerType: string, config: any): LogProvider {
    switch (providerType) {
        case 'console':
            return new ConsoleLogProvider(
                config?.jsonFormat ?? false,
                config?.includeSource ?? true
            );
        default:
            throw new Error(`Unsupported provider type: ${providerType}`);
    }
}

export async function autoConfigureLogging(config: LoggingConfig = {}): Promise<LoggerFactory> {
    const environment = config.environment || detectEnvironment();
    
    let providerType: 'console';
    let providerConfig: any;
    
    if (config.provider) {
        providerType = config.provider;
        providerConfig = config.console;
    } else {
        // Auto-detect provider based on environment
        providerType = 'console';
        if (environment === 'development' || environment === 'test') {
            providerConfig = {
                jsonFormat: false,
                includeSource: true,
                ...config.console
            };
        } else {
            // For production/staging, use structured console logging
            providerConfig = {
                jsonFormat: true,
                includeSource: false,
                ...config.console
            };
        }
    }
    
    const provider = createProviderFromConfig(providerType, providerConfig);
    
    // Initialize the provider
    const initialized = await provider.initialize(providerConfig || {});
    if (!initialized) {
        console.warn(`Failed to initialize ${providerType} provider, falling back to console`);
        const fallbackProvider = new ConsoleLogProvider();
        await fallbackProvider.initialize({});
        return createLoggerFactory(fallbackProvider);
    }
    
    return createLoggerFactory(provider);
}

export async function setupLoggingForEnvironment(environment: Environment): Promise<LoggerFactory> {
    switch (environment) {
        case 'development':
        case 'test':
            return autoConfigureLogging({
                provider: 'console',
                console: {
                    jsonFormat: false,
                    includeSource: true
                }
            });
        case 'staging':
        case 'production':
            // Use structured console logging for production
            return autoConfigureLogging({
                provider: 'console',
                console: {
                    jsonFormat: true,
                    includeSource: false
                }
            });
        default:
            return autoConfigureLogging();
    }
}

// Convenience functions
export function setupDevelopmentLogging(): Promise<LoggerFactory> {
    return setupLoggingForEnvironment('development');
}

export function setupProductionLogging(): Promise<LoggerFactory> {
    return setupLoggingForEnvironment('production');
}

export function getAvailableProviders(): string[] {
    return ['console'];
}
