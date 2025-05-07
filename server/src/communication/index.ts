/**
 * Communication Module Main Entry Point
 * 
 * This module provides the core communication functionality for interfacing with 
 * Modbus devices and managing data polling.
 */

import { deviceManager } from './services/deviceManager';
import { pollingService } from './services/pollingService';
import { cacheService } from './services/cacheService';
import { logService, LogLevel } from './services/logService';

// Configuration options for the communication module
export interface CommunicationModuleOptions {
  logLevel?: LogLevel;
  enableCaching?: boolean;
  cacheTTL?: number;
  modbusTimeout?: number;
  modbusRetries?: number;
}

/**
 * Initialize the communication module with the provided options
 * @param options Configuration options for the module
 * @returns An object containing the module's core services
 */
export async function initCommunicationModule(options: CommunicationModuleOptions = {}) {
  // Configure log service
  if (options.logLevel) {
    logService.setLogLevel(options.logLevel);
  }
  
  // Initialize cache service
  if (options.enableCaching !== undefined) {
    cacheService.setEnabled(options.enableCaching);
  }
  
  if (options.cacheTTL) {
    cacheService.setTTL(options.cacheTTL);
  }
  
  logService.info('Communication module initialized');
  
  // Return the module's core services
  return {
    deviceManager,
    pollingService,
    cacheService,
    logService
  };
}

// Export all the services
export * from './services';