/**
 * Communication Module for Industrial Automation
 *
 * This module provides a framework for industrial communication protocols,
 * focusing on Modbus TCP and RTU implementations with support for various
 * industrial data types, automatic reconnection, polling, and caching.
 *
 * Features:
 * - Support for Modbus TCP and RTU protocols
 * - Full implementation of Modbus function codes (01-16)
 * - Data type conversion utilities for all standard industrial types
 * - Connection management with automatic reconnection
 * - Polling service for scheduled parameter reading
 * - Caching service for parameter values
 * - Event-based notification system
 * - Comprehensive error handling
 * - Full TypeScript support with interfaces and type definitions
 */

// Core interfaces and types
export * from './core/types';
export * from './core/errors';
export * from './core/events';
export * from './core/protocol.interface';
export * from './core/device.interface';

// Modbus implementation
export * from './protocols/modbus/common/function-codes';
export * from './protocols/modbus/common/data-types';
export * from './protocols/modbus/common/pdu';
export * from './protocols/modbus/common/utils';
export * from './protocols/modbus/common/crc';

// Modbus TCP
export * from './protocols/modbus/tcp/client';
export * from './protocols/modbus/tcp/connection';

// Modbus RTU
export * from './protocols/modbus/rtu/client';
export * from './protocols/modbus/rtu/connection';

// Utility services
export * from './services/deviceManager';
export * from './services/pollingService';
export * from './services/cacheService';
export * from './services/logService';

// Utility functions
export * from './utils/bufferUtils';
export * from './utils/dataConversion';

// Configuration
export * from './config/types';
export * from './config/configManager';
export * from './config/configLoader';

// Create and export a default configuration for easier initialization
import { ConfigLoader } from './config/configLoader';
import { ModuleConfig } from './config/types';

/**
 * Initialize the communication module with a configuration
 * @param config Module configuration or path to configuration file
 */
export async function initializeModule(config: ModuleConfig | string): Promise<void> {
  const configLoader = ConfigLoader.getInstance();

  if (typeof config === 'string') {
    await configLoader.loadAndApply(config);
  } else {
    // Set configuration and apply
    const configManager = await import('./config/configManager').then(module =>
      module.ConfigManager.getInstance(),
    );

    configManager.setConfig(config);
    await configLoader.loadAndApply();
  }
}
