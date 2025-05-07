/**
 * Communication Services Module Exports
 *
 * This file exports all services for the communication module.
 */

import { LogService } from './logService';
import { CacheService } from './cacheService';
import { DeviceManager } from './deviceManager';
import { PollingService } from './pollingService';

// Export singleton instances
export const logService = new LogService();
export const cacheService = new CacheService();
export const deviceManager = new DeviceManager();
export const pollingService = new PollingService(deviceManager, cacheService, logService);

// Export class types for advanced usage
export { LogService, CacheService, DeviceManager, PollingService };
