/**
 * Polling Service
 * 
 * Manages the scheduling and execution of device parameter polling
 */

import { EventEmitter } from 'events';
import { deviceManager } from './deviceManager';
import { logService } from './logService';
import { cacheService } from './cacheService';
import { PollingServiceEvents } from './types';

class PollingService extends EventEmitter {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pollingSettings: Map<string, number> = new Map();
  
  constructor() {
    super();
  }
  
  /**
   * Start polling a device at the specified interval
   * @param deviceId The device ID
   * @param intervalMs The polling interval in milliseconds
   * @returns True if polling was started, false otherwise
   */
  startPolling(deviceId: string, intervalMs = 10000): boolean {
    // Check if already polling
    if (this.pollingIntervals.has(deviceId)) {
      this.stopPolling(deviceId); // Stop existing polling
    }
    
    // Get the device
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      logService.error(`Cannot start polling: Device ${deviceId} not found`);
      return false;
    }
    
    // Create polling interval
    const interval = setInterval(async () => {
      try {
        // Read all parameters from the device
        const values = await device.readAllParameters();
        
        // Process and emit each value
        for (const [paramId, value] of Object.entries(values)) {
          // Cache the value
          cacheService.set(`${deviceId}_${paramId}`, value);
          
          // Emit the value
          this.emit('data', deviceId, paramId, value);
        }
      } catch (error) {
        logService.error(`Error polling device ${deviceId}: ${error}`);
        this.emit('error', deviceId, error);
      }
    }, intervalMs);
    
    // Store the interval
    this.pollingIntervals.set(deviceId, interval);
    this.pollingSettings.set(deviceId, intervalMs);
    
    // Emit start event
    this.emit('start', deviceId, intervalMs);
    
    logService.info(`Started polling device ${deviceId} at ${intervalMs}ms interval`);
    return true;
  }
  
  /**
   * Stop polling a device
   * @param deviceId The device ID
   * @returns True if polling was stopped, false otherwise
   */
  stopPolling(deviceId: string): boolean {
    const interval = this.pollingIntervals.get(deviceId);
    if (!interval) {
      return false;
    }
    
    // Clear the interval
    clearInterval(interval);
    
    // Remove from maps
    this.pollingIntervals.delete(deviceId);
    this.pollingSettings.delete(deviceId);
    
    // Emit stop event
    this.emit('stop', deviceId);
    
    logService.info(`Stopped polling device ${deviceId}`);
    return true;
  }
  
  /**
   * Check if a device is being polled
   * @param deviceId The device ID
   * @returns True if the device is being polled, false otherwise
   */
  isPolling(deviceId: string): boolean {
    return this.pollingIntervals.has(deviceId);
  }
  
  /**
   * Get the polling interval for a device
   * @param deviceId The device ID
   * @returns The polling interval in milliseconds, or null if not polling
   */
  getPollingInterval(deviceId: string): number | null {
    return this.pollingSettings.get(deviceId) || null;
  }
  
  /**
   * Get all device IDs currently being polled
   * @returns Array of device IDs
   */
  getActivePollingIds(): string[] {
    return Array.from(this.pollingIntervals.keys());
  }
  
  /**
   * Get the number of devices being polled
   * @returns The number of devices being polled
   */
  getActivePollingCount(): number {
    return this.pollingIntervals.size;
  }
}

// Export a singleton instance
export const pollingService = new PollingService() as PollingService & EventEmitter;