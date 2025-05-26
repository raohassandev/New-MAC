/**
 * Helper utility to check control bit status
 */
import ModbusRTU from 'modbus-serial';
import { getDeviceModel } from '../services/device.service';
import { Request } from 'express';
import { ModbusConnectionManager } from './modbusConnectionManager';
import { DatabaseModelManager } from './databaseModelManager';

/**
 * Control bit status cache with expiration to avoid excessive requests
 * Format: { deviceId: { status: boolean, timestamp: number } }
 */
const controlBitCache: Record<string, { status: boolean, timestamp: number }> = {};
// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Check if device has control bit with "Control" in the name
 * @param device Device object
 * @returns control bit address if found, undefined otherwise
 */
const findControlBit = (device: any): number | undefined => {
  if (!device || !device.dataPoints) return undefined;
  
  // Look for coil data points with "Control" in the name
  for (const dataPoint of device.dataPoints) {
    if (
      dataPoint.range && 
      (dataPoint.range.fc === 1 || dataPoint.range.fc === 2) && // Coil or discrete input
      dataPoint.name && 
      dataPoint.name.includes('Control')
    ) {
      return dataPoint.range.startAddress;
    }
  }
  
  return undefined;
};

/**
 * Find schedule bit address in device data
 * @param device Device object
 * @returns schedule bit address if found, undefined otherwise
 */
const findScheduleBit = (device: any): number | undefined => {
  if (!device || !device.dataPoints) return undefined;
  
  // First, look for the known ID from the image (700)
  for (const dataPoint of device.dataPoints) {
    if (
      dataPoint.range && 
      (dataPoint.range.fc === 1 || dataPoint.range.fc === 2) && // Coil or discrete input
      dataPoint.range.startAddress === 700
    ) {
      return dataPoint.range.startAddress;
    }
  }
  
  // Then look for any coil with "Schedule" in the name
  for (const dataPoint of device.dataPoints) {
    if (
      dataPoint.range && 
      (dataPoint.range.fc === 1 || dataPoint.range.fc === 2) && // Coil or discrete input
      dataPoint.name && 
      dataPoint.name.toLowerCase().includes('schedule')
    ) {
      return dataPoint.range.startAddress;
    }
  }
  
  return undefined;
};

/**
 * Get control and schedule bit status for a device
 * @param deviceId Device ID
 * @param req Express request object
 * @returns Promise resolving to object with control and schedule status
 */
export const getDeviceControlStatus = async (
  deviceId: string, 
  req: Request
): Promise<{ isControlCentral: boolean; isScheduleOn: boolean }> => {
  let isControlCentral = false;
  let isScheduleOn = false;
  
  try {
    // Get all bit statuses
    const [controlStatus, scheduleStatus] = await Promise.all([
      getControlBitStatus(deviceId, req),
      // Import when used to avoid circular dependency
      (await import('./scheduleBitHelper')).getScheduleBitStatus(deviceId, req)
    ]);
    
    isControlCentral = controlStatus;
    isScheduleOn = scheduleStatus;
  } catch (error) {
    console.error(`[ControlBitHelper] Error getting device status: ${error}`);
  }
  
  return { isControlCentral, isScheduleOn };
};

/**
 * Checks if a device is in central control mode (control bit is ON)
 * @param deviceId Device ID
 * @param req Express request object
 * @returns Promise resolving to boolean - true if central control, false if local control
 */
export const getControlBitStatus = async (
  deviceId: string, 
  req: Request
): Promise<boolean> => {
  try {
    // Check cache first
    const cacheEntry = controlBitCache[deviceId];
    const now = Date.now();
    
    if (cacheEntry && now - cacheEntry.timestamp < CACHE_EXPIRATION) {
      console.log(`[ControlBitHelper] Using cached control status for device ${deviceId}: ${cacheEntry.status ? 'CENTRAL' : 'LOCAL'}`);
      return cacheEntry.status;
    }
    
    // Fetch the device data using unified manager
    const DeviceModel = await DatabaseModelManager.getDeviceModel(req);
    const device = await DeviceModel.findById(deviceId);
    
    if (!device) {
      console.error(`[ControlBitHelper] Device ${deviceId} not found`);
      return true; // Default to central control if device not found
    }
    
    // Find control bit address
    const controlBitAddress = findControlBit(device);
    
    // If no control bit found, default to central control
    if (controlBitAddress === undefined) {
      console.log(`[ControlBitHelper] No control bit found for device ${deviceId}, assuming CENTRAL control`);
      
      // Cache the result
      controlBitCache[deviceId] = { status: true, timestamp: now };
      
      return true;
    }
    
    // Read control bit value via Modbus using unified connection manager
    let connection;
    
    try {
      // Connect to device using unified manager
      connection = await ModbusConnectionManager.connect({
        device,
        timeout: 5000,
        logPrefix: '[ControlBitHelper]'
      });
      
      // Read the control bit
      const response = await connection.client.readCoils(controlBitAddress, 1);
      const isCentralControl = response.data[0];
      
      console.log(`[ControlBitHelper] Device ${deviceId} control bit at ${controlBitAddress} is ${isCentralControl ? 'ON (CENTRAL)' : 'OFF (LOCAL)'}`);
      
      // Cache the result
      controlBitCache[deviceId] = { status: isCentralControl, timestamp: now };
      
      return isCentralControl;
      
    } catch (error) {
      console.error(`[ControlBitHelper] Connection or reading failed: ${error}`);
      // Default to central control if connection fails
      controlBitCache[deviceId] = { status: true, timestamp: now };
      return true;
    } finally {
      if (connection) {
        try {
          await ModbusConnectionManager.disconnect(connection, '[ControlBitHelper]');
        } catch (error) {
          console.error(`[ControlBitHelper] Error disconnecting: ${error}`);
        }
      }
    }
    
  } catch (error) {
    console.error(`[ControlBitHelper] Error checking control bit status: ${error}`);
    // Default to central control in case of errors
    return true;
  }
};

/**
 * Clears the control bit cache for a specific device or all devices
 * @param deviceId Optional device ID. If not provided, clears the entire cache
 */
export const clearControlBitCache = (deviceId?: string): void => {
  if (deviceId) {
    delete controlBitCache[deviceId];
    console.log(`[ControlBitHelper] Cleared control bit cache for device ${deviceId}`);
  } else {
    Object.keys(controlBitCache).forEach(id => delete controlBitCache[id]);
    console.log('[ControlBitHelper] Cleared entire control bit cache');
  }
};