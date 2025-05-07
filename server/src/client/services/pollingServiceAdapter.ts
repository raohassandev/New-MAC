/**
 * Adapter to integrate the new communication module's polling service
 * with the existing dataPollingService
 */

import mongoose from 'mongoose';
import { getClientModels } from '../../config/database';
import { deviceManager, pollingService, cacheService, logService } from '../../communication/services';
import { Device as CommunicationDevice } from '../../communication/services/types';
import { createDeviceFromData } from '../controllers/modbusAdapter';

// Type definitions for data readings
interface DeviceReading {
  deviceId: mongoose.Types.ObjectId;
  deviceName: string;
  timestamp: Date;
  readings: ParameterReading[];
}

interface ParameterReading {
  name: string;
  registerIndex?: number;
  address?: number;
  value: any;
  unit?: string;
  dataType?: string;
  error?: string;
}

// In-memory cache for real-time data (use the existing format for backward compatibility)
const realtimeDataCache = new Map<string, DeviceReading>();

/**
 * Initialize the device in the new communication module
 * @param deviceId The ID of the device to initialize
 * @returns The device ID if successful, null otherwise
 */
export async function initializeDevice(deviceId: string): Promise<string | null> {
  try {
    logService.info(`Initializing device ${deviceId} in communication module`);
    
    // Get the Device model from client connection
    const clientModels = getClientModels();
    if (!clientModels || !clientModels.Device) {
      logService.error('Client Device model not available');
      return null;
    }
    const Device = clientModels.Device;
    
    // Find the device
    logService.debug(`Looking up device ${deviceId} in database...`);
    const device = await Device.findById(deviceId).exec();
    
    if (!device) {
      logService.warn(`Device ${deviceId} not found in database`);
      return null;
    }
    
    if (!device.enabled) {
      logService.warn(`Device ${deviceId} (${device.name}) is disabled, skipping initialization`);
      return null;
    }
    
    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;
    
    if (!hasNewConfig && !hasLegacyConfig) {
      logService.warn(`No data points or registers configured for device ${deviceId}`);
      return null;
    }
    
    // Create device in the new module
    const newDeviceId = await createDeviceFromData(device);
    
    logService.info(`Device ${device.name} (${deviceId}) initialized in communication module`);
    return newDeviceId;
  } catch (error) {
    logService.error(`Error initializing device ${deviceId}: ${error}`);
    return null;
  }
}

/**
 * Main polling function for a specific device using the new communication module
 * @param deviceId The ID of the device to poll
 * @returns A promise that resolves with the device readings
 */
export async function pollDeviceWithNewModule(deviceId: string): Promise<DeviceReading | null> {
  try {
    logService.info(`Starting poll for device ${deviceId} using communication module`);
    
    // Check if the device is already registered in the new module
    let device = deviceManager.getDevice(deviceId);
    
    // If not, initialize it
    if (!device) {
      const newDeviceId = await initializeDevice(deviceId);
      if (!newDeviceId) {
        return null;
      }
      device = deviceManager.getDevice(newDeviceId);
      if (!device) {
        logService.error(`Failed to get device ${deviceId} after initialization`);
        return null;
      }
    }
    
    // Poll the device using the new module
    const pollResult = await device.readAllParameters();
    
    if (!pollResult || Object.keys(pollResult).length === 0) {
      throw new Error(`No data returned from device ${deviceId}`);
    }
    
    // Get the Device model from client connection for device info
    const clientModels = getClientModels();
    if (!clientModels || !clientModels.Device) {
      throw new Error('Client Device model not available');
    }
    
    const deviceInfo = await clientModels.Device.findById(deviceId).select('name').lean().exec();
    const deviceName = deviceInfo?.name || 'Unknown';
    
    // Format the results to match the existing format
    const readings: ParameterReading[] = [];
    
    for (const [paramId, value] of Object.entries(pollResult)) {
      const parameter = device.getParameter(paramId);
      
      if (parameter) {
        readings.push({
          name: parameter.name,
          registerIndex: parameter.address,
          value: value,
          unit: parameter.unit || '',
          dataType: parameter.dataType,
        });
      }
    }
    
    // Update device lastSeen timestamp
    await clientModels.Device.findByIdAndUpdate(deviceId, { lastSeen: new Date() }).exec();
    
    // Prepare the result
    const deviceReading: DeviceReading = {
      deviceId: new mongoose.Types.ObjectId(deviceId),
      deviceName,
      timestamp: new Date(),
      readings,
    };
    
    // Store in real-time cache
    realtimeDataCache.set(deviceId, deviceReading);
    logService.debug(`Updated real-time cache for device ${deviceName}`);
    
    // Store in history database
    await storeHistoricalData(deviceReading);
    logService.info(`Successfully polled device ${deviceName} with ${readings.length} readings`);
    
    return deviceReading;
  } catch (error) {
    logService.error(`Error polling device ${deviceId}: ${error}`);
    
    try {
      // Get device name for better error reporting
      const clientModels = getClientModels();
      let deviceName = deviceId;
      
      if (clientModels && clientModels.Device) {
        const device = await clientModels.Device.findById(deviceId).select('name').lean().exec();
        if (device && device.name) {
          deviceName = device.name;
        }
      }
      
      // Create error reading for the device
      const errorReading: DeviceReading = {
        deviceId: mongoose.Types.ObjectId.isValid(deviceId) 
          ? new mongoose.Types.ObjectId(deviceId)
          : new mongoose.Types.ObjectId(),
        deviceName: deviceName,
        timestamp: new Date(),
        readings: [
          {
            name: 'connection_status',
            value: 'error',
            error: `Error polling device: ${error}`,
          },
        ],
      };
      
      // Update cache with error status
      realtimeDataCache.set(deviceId, errorReading);
    } catch (cacheError) {
      logService.error(`Error updating cache for device ${deviceId}: ${cacheError}`);
    }
    
    return null;
  }
}

/**
 * Get the latest real-time data for a device from the new module
 * @param deviceId The ID of the device
 * @returns The latest device reading or null if not available
 */
export function getRealtimeDataFromNewModule(deviceId: string): DeviceReading | null {
  // First try to get data from cache (supports the old format)
  const cachedData = realtimeDataCache.get(deviceId);
  if (cachedData) {
    return cachedData;
  }
  
  // If not in cache, try to get current values from the communication module
  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return null;
    }
    
    // Get parameters from device
    const parameters = device.getAllParameters();
    
    // Get current values from cache service
    const readings: ParameterReading[] = [];
    
    for (const param of parameters) {
      const value = cacheService.get(`${deviceId}_${param.id}`);
      
      readings.push({
        name: param.name,
        registerIndex: param.address,
        value: value ?? null,
        unit: param.unit || '',
        dataType: param.dataType,
      });
    }
    
    // Create device reading
    const deviceReading: DeviceReading = {
      deviceId: new mongoose.Types.ObjectId(deviceId),
      deviceName: device.name,
      timestamp: new Date(),
      readings,
    };
    
    return deviceReading;
  } catch (error) {
    logService.error(`Error getting realtime data for device ${deviceId}: ${error}`);
    return null;
  }
}

/**
 * Store device reading in historical database
 * @param deviceReading The device reading to store
 */
async function storeHistoricalData(deviceReading: DeviceReading): Promise<void> {
  try {
    // Get the HistoricalData model from client connection
    logService.debug(`Preparing to store historical data for device ${deviceReading.deviceName}`);
    
    const clientModels = getClientModels();
    if (!clientModels || !clientModels.HistoricalData) {
      logService.warn(`HistoricalData model not available, skipping historical data storage`);
      return; // Skip historical data storage instead of throwing an error
    }
    const HistoricalData = clientModels.HistoricalData;
    
    // Filter out readings with errors or null values
    const validReadings = deviceReading.readings.filter(
      reading => reading.value !== null && reading.value !== undefined && !reading.error,
    );
    
    logService.debug(`Found ${validReadings.length}/${deviceReading.readings.length} valid readings to store`);
    
    // Create history data entries for valid readings only
    const historyEntries = validReadings.map(reading => ({
      deviceId: deviceReading.deviceId,
      parameterName: reading.name,
      value: reading.value,
      unit: reading.unit,
      timestamp: deviceReading.timestamp,
      quality: 'good', // These are all valid readings since we filtered out errors
    }));
    
    // Insert historical data if there are valid entries
    if (historyEntries.length > 0) {
      await HistoricalData.insertMany(historyEntries);
      logService.info(`Successfully stored ${historyEntries.length} historical data points`);
    }
  } catch (error) {
    logService.error(`Error storing historical data: ${error}`);
  }
}

/**
 * Start polling for a device at a specific interval using the new module
 * @param deviceId The ID of the device to poll
 * @param intervalMs The polling interval in milliseconds
 * @returns True if successful
 */
export async function startPollingDeviceWithNewModule(deviceId: string, intervalMs = 10000): Promise<boolean> {
  try {
    // Check if the device is already registered in the new module
    let device = deviceManager.getDevice(deviceId);
    
    // If not, initialize it
    if (!device) {
      const newDeviceId = await initializeDevice(deviceId);
      if (!newDeviceId) {
        return false;
      }
    }
    
    // Start polling with the new module
    pollingService.startPolling(deviceId, intervalMs);
    
    // Register callbacks to update the realtime cache and historical data
    pollingService.on('data', (deviceId: string, paramId: string, value: any) => {
      try {
        // Get the device
        const device = deviceManager.getDevice(deviceId);
        if (!device) return;
        
        // Update the realtime cache
        const existingData = realtimeDataCache.get(deviceId);
        const param = device.getParameter(paramId);
        
        if (param && existingData) {
          // Find if we already have this parameter in readings
          const existingParamIndex = existingData.readings.findIndex(r => r.name === param.name);
          
          if (existingParamIndex >= 0) {
            // Update existing parameter
            existingData.readings[existingParamIndex].value = value;
            existingData.readings[existingParamIndex].error = undefined;
          } else {
            // Add new parameter
            existingData.readings.push({
              name: param.name,
              registerIndex: param.address,
              value: value,
              unit: param.unit || '',
              dataType: param.dataType,
            });
          }
          
          // Update timestamp
          existingData.timestamp = new Date();
          
          // Update cache
          realtimeDataCache.set(deviceId, existingData);
        }
      } catch (error) {
        logService.error(`Error updating realtime cache: ${error}`);
      }
    });
    
    // Register error callbacks
    pollingService.on('error', (deviceId: string, error: any) => {
      logService.error(`Polling error for device ${deviceId}: ${error}`);
    });
    
    logService.info(`Started polling for device ${deviceId} at ${intervalMs}ms interval`);
    return true;
  } catch (error) {
    logService.error(`Failed to start polling for device ${deviceId}: ${error}`);
    return false;
  }
}

/**
 * Stop polling for a device with the new module
 * @param deviceId The ID of the device to stop polling
 * @returns True if successful
 */
export function stopPollingDeviceWithNewModule(deviceId: string): boolean {
  try {
    // Stop polling with the new module
    pollingService.stopPolling(deviceId);
    
    logService.info(`Stopped polling for device ${deviceId}`);
    return true;
  } catch (error) {
    logService.error(`Failed to stop polling for device ${deviceId}: ${error}`);
    return false;
  }
}