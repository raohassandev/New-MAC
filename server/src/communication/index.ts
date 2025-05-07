/**
 * Communication Module
 * 
 * This is the main entry point for the communication module.
 * It provides all the necessary components for device communication.
 */

// Export core types and interfaces
export * from './core';

// Export protocol implementations
export * from './protocols';

// Export services
export * from './services';

// Export the configuration
export * from './config';

// Initialization function to setup the communication module
export async function initCommunicationModule(options: {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableCaching?: boolean;
  cacheTTL?: number;
} = {}) {
  // Import services
  const { logService, deviceManager, pollingService, cacheService } = await import('./services');
  
  // Configure services based on options
  if (options.logLevel) {
    logService.setLogLevel(options.logLevel);
  }
  
  if (options.enableCaching !== undefined) {
    cacheService.setEnabled(options.enableCaching);
  }
  
  if (options.cacheTTL) {
    cacheService.setDefaultTTL(options.cacheTTL);
  }
  
  logService.info('Communication module initialized');
  
  return {
    deviceManager,
    pollingService,
    cacheService,
    logService
  };
}