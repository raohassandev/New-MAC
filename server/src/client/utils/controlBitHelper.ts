/**
 * Helper utility to check control bit status
 */
import ModbusRTU from 'modbus-serial';
import { getDeviceModel } from '../services/device.service';
import { Request } from 'express';

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
    
    // Fetch the device data
    const DeviceModel = await getDeviceModel(req);
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
    
    // Read control bit value via Modbus
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
          console.error(`[ControlBitHelper] TCP connection failed: ${error}`);
          // Default to central control if connection fails
          controlBitCache[deviceId] = { status: true, timestamp: now };
          return true;
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
          console.error(`[ControlBitHelper] RTU connection failed: ${error}`);
          // Default to central control if connection fails
          controlBitCache[deviceId] = { status: true, timestamp: now };
          return true;
        }
        
        client.setID(rtuSettings.slaveId);
      } else {
        throw new Error('Unsupported connection type');
      }
      
      // Read the control bit
      const response = await client.readCoils(controlBitAddress, 1);
      const isCentralControl = response.data[0];
      
      console.log(`[ControlBitHelper] Device ${deviceId} control bit at ${controlBitAddress} is ${isCentralControl ? 'ON (CENTRAL)' : 'OFF (LOCAL)'}`);
      
      // Cache the result
      controlBitCache[deviceId] = { status: isCentralControl, timestamp: now };
      
      return isCentralControl;
      
    } finally {
      try {
        client.close();
      } catch (error) {
        console.error(`[ControlBitHelper] Error closing Modbus connection: ${error}`);
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