/**
 * Device Manager Service
 * 
 * Manages device instances and provides access to them
 */

import { Device } from './types';
import { logService } from './logService';

class DeviceManager {
  private devices: Map<string, Device> = new Map();
  
  /**
   * Register a device with the manager
   * @param device The device to register
   * @returns The device ID
   */
  registerDevice(device: Device): string {
    if (!device.id) {
      throw new Error('Device must have an ID');
    }
    
    this.devices.set(device.id, device);
    logService.info(`Device registered: ${device.name} (${device.id})`);
    return device.id;
  }
  
  /**
   * Get a device by ID
   * @param deviceId The device ID
   * @returns The device if found, null otherwise
   */
  getDevice(deviceId: string): Device | null {
    return this.devices.get(deviceId) || null;
  }
  
  /**
   * Remove a device from the manager
   * @param deviceId The device ID
   * @returns True if the device was removed, false otherwise
   */
  removeDevice(deviceId: string): boolean {
    const result = this.devices.delete(deviceId);
    if (result) {
      logService.info(`Device removed: ${deviceId}`);
    }
    return result;
  }
  
  /**
   * Get all device IDs
   * @returns Array of device IDs
   */
  getDeviceIds(): string[] {
    return Array.from(this.devices.keys());
  }
  
  /**
   * Get the count of registered devices
   * @returns The number of registered devices
   */
  getDeviceCount(): number {
    return this.devices.size;
  }
}

// Export a singleton instance
export const deviceManager = new DeviceManager();