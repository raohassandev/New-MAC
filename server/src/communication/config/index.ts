/**
 * Communication Module Configuration
 * 
 * This file exports the configuration for the communication module.
 */

import { CommunicationConfig } from './types';
import { configManager } from './configManager';

// Default configuration
export const defaultConfig: CommunicationConfig = {
  modbus: {
    timeout: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    defaultUnitId: 1,
    maxPDUSize: 253,
    tcp: {
      defaultPort: 502,
      connectionTimeout: 10000,
      useTransactionIds: true,
    },
    rtu: {
      defaultBaudRate: 9600,
      defaultDataBits: 8,
      defaultStopBits: 1,
      defaultParity: 'none',
      maxPortAttempts: 3,
      portOpenTimeout: 5000,
      allowConcurrentReads: false,
    },
  },
  device: {
    maxDevices: 100,
    defaultPollingInterval: 10000,
    byteOrder: {
      default16Bit: 'AB',
      default32Bit: 'ABCD',
      default64Bit: 'ABCDEFGH',
    },
  },
  logging: {
    level: 'info',
    includeTimestamps: true,
    useColors: true,
    logToFile: false,
  },
  cache: {
    enabled: true,
    defaultTTL: 60000, // 1 minute
    maxEntries: 10000,
    invalidateOnError: true,
  },
  polling: {
    minInterval: 1000,  // 1 second minimum
    maxInterval: 3600000, // 1 hour maximum
    adaptivePolling: false,
    maxConcurrentPolls: 5,
    defaultBatchSize: 10,
    maxBatchSize: 125,
  },
};

// Export type definitions
export * from './types';

// Export the config manager
export { configManager, ConfigManager } from './configManager';

// Export a function to load configuration from environment variables
export function loadConfigFromEnv(): Partial<CommunicationConfig> {
  const config: Partial<CommunicationConfig> = {
    modbus: {},
    device: {},
    logging: {},
    cache: {},
    polling: {},
  };
  
  // Modbus config
  if (process.env.MODBUS_TIMEOUT) {
    config.modbus!.timeout = parseInt(process.env.MODBUS_TIMEOUT, 10);
  }
  
  if (process.env.MODBUS_MAX_RETRIES) {
    config.modbus!.maxRetries = parseInt(process.env.MODBUS_MAX_RETRIES, 10);
  }
  
  // Logging config
  if (process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL.toLowerCase();
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.logging!.level = level as 'debug' | 'info' | 'warn' | 'error';
    }
  }
  
  // Cache config
  if (process.env.CACHE_ENABLED) {
    config.cache!.enabled = process.env.CACHE_ENABLED === 'true';
  }
  
  if (process.env.CACHE_TTL) {
    config.cache!.defaultTTL = parseInt(process.env.CACHE_TTL, 10);
  }
  
  // Polling config
  if (process.env.DEFAULT_POLLING_INTERVAL) {
    config.polling!.defaultBatchSize = parseInt(process.env.DEFAULT_POLLING_INTERVAL, 10);
  }
  
  return config;
}

// Export a function to initialize the configuration
export function initConfig(customConfig?: Partial<CommunicationConfig>): void {
  // First load from environment
  const envConfig = loadConfigFromEnv();
  
  // Update with env config
  configManager.updateConfig(envConfig);
  
  // If custom config provided, apply it
  if (customConfig) {
    configManager.updateConfig(customConfig);
  }
}