/**
 * Helper utility to check schedule bit status
 */
import ModbusRTU from 'modbus-serial';
import { getDeviceModel } from '../services/device.service';
import { Request } from 'express';

/**
 * Schedule bit status cache with expiration to avoid excessive requests
 * Format: { deviceId: { status: boolean, timestamp: number } }
 */
const scheduleBitCache: Record<string, { status: boolean, timestamp: number }> = {};
// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Find schedule bit address in device data
 * @param device Device object
 * @returns schedule bit address if found, undefined otherwise
 */
export const findScheduleBit = (device: any): number | undefined => {
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
 * Checks if a device's schedule switch is ON
 * @param deviceId Device ID
 * @param req Express request object
 * @returns Promise resolving to boolean - true if schedule switch is ON, false if OFF
 */
export const getScheduleBitStatus = async (
  deviceId: string, 
  req: Request
): Promise<boolean> => {
  try {
    // Check cache first
    const cacheEntry = scheduleBitCache[deviceId];
    const now = Date.now();
    
    if (cacheEntry && now - cacheEntry.timestamp < CACHE_EXPIRATION) {
      console.log(`[ScheduleBitHelper] Using cached schedule status for device ${deviceId}: ${cacheEntry.status ? 'ON' : 'OFF'}`);
      return cacheEntry.status;
    }
    
    // Fetch the device data
    const DeviceModel = await getDeviceModel(req);
    const device = await DeviceModel.findById(deviceId);
    
    if (!device) {
      console.error(`[ScheduleBitHelper] Device ${deviceId} not found`);
      return false; // Default to OFF if device not found
    }
    
    // Find schedule bit address
    const scheduleBitAddress = findScheduleBit(device);
    
    // If no schedule bit found, default to OFF
    if (scheduleBitAddress === undefined) {
      console.log(`[ScheduleBitHelper] No schedule bit found for device ${deviceId}, assuming OFF`);
      
      // Cache the result
      scheduleBitCache[deviceId] = { status: false, timestamp: now };
      
      return false;
    }
    
    // Read schedule bit value via Modbus
    const client = new ModbusRTU();
    
    try {
      // Connect to device
      if (device.connectionSetting?.connectionType === 'tcp') {
        const tcpSettings = device.connectionSetting.tcp;
        if (!tcpSettings) {
          throw new Error('TCP connection settings not found');
        }
        
        // Add timeout to TCP connection to prevent hanging
        const connectPromise = client.connectTCP(
          tcpSettings.ip,
          { port: tcpSettings.port }
        );
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TCP connection timeout after 5 seconds')), 5000)
        );
        
        try {
          await Promise.race([connectPromise, timeoutPromise]);
        } catch (error) {
          console.error(`[ScheduleBitHelper] TCP connection failed: ${error}`);
          // Default to OFF if connection fails
          scheduleBitCache[deviceId] = { status: false, timestamp: now };
          return false;
        }
        
        client.setID(tcpSettings.slaveId);
      } else if (device.connectionSetting?.connectionType === 'rtu') {
        const rtuSettings = device.connectionSetting.rtu;
        if (!rtuSettings) {
          throw new Error('RTU connection settings not found');
        }
        
        const { connectRTUBuffered } = await import('./modbusHelper');
        try {
          await connectRTUBuffered(client, rtuSettings.serialPort, {
            baudRate: rtuSettings.baudRate,
            dataBits: rtuSettings.dataBits as 5 | 6 | 7 | 8,
            stopBits: rtuSettings.stopBits as 1 | 2,
            parity: rtuSettings.parity as 'none' | 'even' | 'odd'
          });
        } catch (error) {
          console.error(`[ScheduleBitHelper] RTU connection failed: ${error}`);
          // Default to OFF if connection fails
          scheduleBitCache[deviceId] = { status: false, timestamp: now };
          return false;
        }
        
        client.setID(rtuSettings.slaveId);
      } else {
        throw new Error('Unsupported connection type');
      }
      
      // Read the schedule bit
      const response = await client.readCoils(scheduleBitAddress, 1);
      const isScheduleOn = response.data[0];
      
      console.log(`[ScheduleBitHelper] Device ${deviceId} schedule bit at ${scheduleBitAddress} is ${isScheduleOn ? 'ON' : 'OFF'}`);
      
      // Cache the result
      scheduleBitCache[deviceId] = { status: isScheduleOn, timestamp: now };
      
      return isScheduleOn;
      
    } finally {
      try {
        client.close();
      } catch (error) {
        console.error(`[ScheduleBitHelper] Error closing Modbus connection: ${error}`);
      }
    }
    
  } catch (error) {
    console.error(`[ScheduleBitHelper] Error checking schedule bit status: ${error}`);
    // Default to OFF in case of errors
    return false;
  }
};

/**
 * Clears the schedule bit cache for a specific device or all devices
 * @param deviceId Optional device ID. If not provided, clears the entire cache
 */
export const clearScheduleBitCache = (deviceId?: string): void => {
  if (deviceId) {
    delete scheduleBitCache[deviceId];
    console.log(`[ScheduleBitHelper] Cleared schedule bit cache for device ${deviceId}`);
  } else {
    Object.keys(scheduleBitCache).forEach(id => delete scheduleBitCache[id]);
    console.log('[ScheduleBitHelper] Cleared entire schedule bit cache');
  }
};