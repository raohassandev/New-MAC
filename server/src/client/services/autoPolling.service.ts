import mongoose from 'mongoose';
import chalk from 'chalk';
import { IDevice } from '../models/device.model';
import * as pollingService from './polling.service';
import { getClientModels } from '../../config/database';

// Store active polling timers by device ID
const devicePollingTimers = new Map<string, NodeJS.Timeout>();

// Store polling statistics
const pollingStats = {
  totalDevicesPolled: 0,
  successfulPolls: 0,
  failedPolls: 0,
  lastPollTime: null as Date | null,
  isPollingActive: false,
  startTime: null as Date | null,
  // New field to track last poll time per device
  deviceLastPollTime: new Map<string, Date>(),
  // Track consecutive errors per device
  deviceErrorCount: new Map<string, number>(),
  // Track last error time per device
  deviceLastErrorTime: new Map<string, Date>(),
};

// Store the global default polling interval
let globalDefaultPollingInterval = 60000; // Default to 60 seconds

/**
 * Start automatic polling for all enabled devices
 * @param defaultIntervalSeconds Optional default polling interval in seconds (defaults to 60)
 */
export async function startAutoPollingService(defaultIntervalSeconds?: number): Promise<void> {
  try {
    // If interval is provided, update the global default (convert seconds to milliseconds)
    if (defaultIntervalSeconds !== undefined && defaultIntervalSeconds > 0) {
      globalDefaultPollingInterval = defaultIntervalSeconds * 1000;
      console.log(chalk.magenta(`🔄 Starting automatic device polling service with default interval: ${defaultIntervalSeconds} seconds`));
    } else {
      console.log(chalk.magenta(`🔄 Starting automatic device polling service with default interval: ${globalDefaultPollingInterval / 1000} seconds`));
    }
    
    // Only start if not already running
    if (pollingStats.isPollingActive) {
      console.log(chalk.yellow('⚠️ Auto-polling service is already running, not starting again'));
      return;
    }
    
    pollingStats.isPollingActive = true;
    pollingStats.startTime = new Date();
    
    // Schedule the initial poll right away
    await pollAllEnabledDevices();
    
    console.log(chalk.green('✅ Auto-polling service started successfully'));
  } catch (error) {
    console.error(chalk.red(`❌ Error starting auto-polling service: ${error}`));
    throw error;
  }
}

/**
 * Stop automatic polling for all devices
 */
export function stopAutoPollingService(): void {
  console.log(chalk.magenta('🛑 Stopping automatic device polling service...'));
  
  // Clear all device polling timers
  for (const [deviceId, timer] of devicePollingTimers.entries()) {
    clearTimeout(timer);
    console.log(chalk.yellow(`⏹️ Stopped polling for device ${deviceId}`));
  }
  
  devicePollingTimers.clear();
  pollingStats.isPollingActive = false;
  console.log(chalk.green('✅ Auto-polling service stopped successfully'));
}

/**
 * Poll all enabled devices once
 */
export async function pollAllEnabledDevices(): Promise<void> {
  try {
    console.log(chalk.blue('📊 Starting polling cycle for all enabled devices'));
    
    // Get the Device model
    let DeviceModel;
    try {
      const clientModels = getClientModels();
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
      } else {
        try {
          DeviceModel = mongoose.model('Device');
        } catch (error) {
          console.error(chalk.red('❌ Failed to get Device model from mongoose'));
          throw error;
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error getting Device model: ${error}`));
      throw error;
    }
    
    // Find all enabled devices
    const enabledDevices = await DeviceModel.find({ enabled: true })
      .select('_id name pollingInterval advancedSettings')
      .lean();
    
    console.log(chalk.blue(`📋 Found ${enabledDevices.length} enabled devices to poll`));
    pollingStats.totalDevicesPolled = enabledDevices.length;
    pollingStats.lastPollTime = new Date();
    
    // Schedule polling for each device with its specific interval
    for (const device of enabledDevices) {
      try {
        // Clear any existing timer for this device
        if (devicePollingTimers.has(device._id.toString())) {
          clearTimeout(devicePollingTimers.get(device._id.toString()));
        }
        
        // Determine polling interval for this device
        let pollingInterval = globalDefaultPollingInterval; // Use global default
        
        // First try device-specific polling interval
        if (device.pollingInterval) {
          pollingInterval = device.pollingInterval;
        } 
        // Then try the advanced settings default poll interval
        else if (device.advancedSettings?.defaultPollInterval) {
          pollingInterval = device.advancedSettings.defaultPollInterval;
        }
        
        // Enforce minimum polling interval of 10 seconds to prevent overloading
        pollingInterval = Math.max(pollingInterval, 10000);
        
        // For offline devices or devices that might have connection issues, 
        // use a longer minimum interval to prevent flooding logs with errors
        const deviceId = device._id.toString();
        
        // Check for connection issues on previous polls
        const errorCount = pollingStats.deviceErrorCount.get(deviceId) || 0;
        const lastErrorTime = pollingStats.deviceLastErrorTime.get(deviceId);
        
        if (errorCount > 3) {
          // If device has had multiple consecutive errors, increase polling interval
          const minutes = Math.min(errorCount, 10); // Cap at 10 minutes
          const extendedInterval = minutes * 60000;
          
          console.log(chalk.yellow(`⚠️ Device ${device.name} has ${errorCount} consecutive errors, extending interval to ${minutes} minutes`));
          pollingInterval = Math.max(pollingInterval, extendedInterval);
        } else if (lastErrorTime) {
          // If device had recent error, use a moderate extension
          const minutesSinceError = (Date.now() - lastErrorTime.getTime()) / 60000;
          if (minutesSinceError < 5) {
            console.log(chalk.yellow(`⚠️ Device ${device.name} had recent error, using 2 minute interval`));
            pollingInterval = Math.max(pollingInterval, 2 * 60000);
          }
        }
        
        // Schedule immediate polling for this device
        scheduleDevicePolling(device._id.toString(), device.name, pollingInterval);
      } catch (deviceError) {
        console.error(chalk.red(`❌ Error scheduling polling for device ${device.name}: ${deviceError}`));
        pollingStats.failedPolls++;
      }
    }
    
    console.log(chalk.green(`✅ Polling scheduled for ${enabledDevices.length} devices`));
  } catch (error) {
    console.error(chalk.red(`❌ Error polling enabled devices: ${error}`));
    
    // Restart polling after a short delay even if there was an error
    setTimeout(() => {
      if (pollingStats.isPollingActive) {
        pollAllEnabledDevices().catch(err => 
          console.error(chalk.red(`❌ Error in delayed poll restart: ${err}`))
        );
      }
    }, 60000); // Retry after 1 minute
  }
}

/**
 * Schedule polling for a specific device
 * This is exported to allow direct scheduling from other modules
 */
export function scheduleDevicePolling(deviceId: string, deviceName: string, pollingInterval: number): void {
  // Execute immediate poll
  console.log(chalk.blue(`📡 Polling device: ${deviceName} (${deviceId})`));
  
  // Create a mock request with app locals from global store
  const req = {
    app: {
      locals: (global as any).appLocals || {}
    }
  };
  
  pollingService.pollDevice(deviceId, req)
    .then(result => {
      console.log(chalk.green(`✅ Successfully polled device ${deviceName}`));
      pollingStats.successfulPolls++;
      
      // Update the last poll time for this device
      pollingStats.deviceLastPollTime.set(deviceId, new Date());
      
      // Reset error count on successful poll
      pollingStats.deviceErrorCount.delete(deviceId);
      pollingStats.deviceLastErrorTime.delete(deviceId);
      
      // Make the result available to the polling.service cache and database
      // This ensures both services can share the same data
      if (result) {
        // Call async function but don't await it - just let it run in the background
        // This avoids blocking the polling cycle for database operations
        pollingService.storeRealtimeData(deviceId, result)
          .catch(err => console.error(chalk.red(`❌ Error storing realtime data: ${err}`)));
      }
      
      // Schedule the next poll
      if (pollingStats.isPollingActive) {
        const timerId = setTimeout(() => {
          // Recursive call to schedule next poll
          scheduleDevicePolling(deviceId, deviceName, pollingInterval);
        }, pollingInterval);
        
        // Store the timer ID
        devicePollingTimers.set(deviceId, timerId);
      }
    })
    .catch(error => {
      const errorMessage = String(error);
      
      // Track consecutive errors
      const currentErrorCount = (pollingStats.deviceErrorCount.get(deviceId) || 0) + 1;
      pollingStats.deviceErrorCount.set(deviceId, currentErrorCount);
      pollingStats.deviceLastErrorTime.set(deviceId, new Date());
      pollingStats.failedPolls++;
      
      console.error(chalk.red(`❌ Error polling device ${deviceName} (error #${currentErrorCount}): ${errorMessage}`));
      
      // Check for MongoDB timeout errors
      if (errorMessage.includes('buffering timed out after') || 
          errorMessage.includes('MongooseError') ||
          errorMessage.includes('MongoDB')) {
            
        console.error(chalk.red(`🛑 MongoDB error polling device ${deviceName}: ${errorMessage}`));
        console.log(chalk.yellow(`⏱️ Using longer delay before next poll attempt due to database issues`));
        
        // Use a longer delay for database errors to allow the DB to recover
        if (pollingStats.isPollingActive) {
          const timerId = setTimeout(() => {
            scheduleDevicePolling(deviceId, deviceName, pollingInterval);
          }, Math.max(pollingInterval, 2 * 60000)); // At least 2 minutes
          
          devicePollingTimers.set(deviceId, timerId);
        }
      }
      // Check for connection refused or network errors
      else if (errorMessage.includes('ECONNREFUSED') || 
               errorMessage.includes('connect') ||
               errorMessage.includes('timeout') ||
               errorMessage.includes('network error')) {
                 
        console.error(chalk.red(`📡 Connection error polling device ${deviceName}: ${errorMessage}`));
        
        // For connection errors, use the normal polling interval but log it differently
        if (pollingStats.isPollingActive) {
          const timerId = setTimeout(() => {
            scheduleDevicePolling(deviceId, deviceName, pollingInterval);
          }, pollingInterval);
          
          devicePollingTimers.set(deviceId, timerId);
        }
      }
      // Generic error handling
      else {
        // Error already logged above with count
        
        // Even if polling fails, schedule next attempt
        if (pollingStats.isPollingActive) {
          const timerId = setTimeout(() => {
            // Recursive call to schedule next poll
            scheduleDevicePolling(deviceId, deviceName, pollingInterval);
          }, pollingInterval);
          
          // Store the timer ID
          devicePollingTimers.set(deviceId, timerId);
        }
      }
    });
}

/**
 * Get statistics about the auto-polling service
 */
export function getPollingStats(): any {
  const activeDevices = Array.from(devicePollingTimers.keys());
  const deviceLastPolls = Object.fromEntries(pollingStats.deviceLastPollTime.entries());
  
  return {
    ...pollingStats,
    activePollingCount: devicePollingTimers.size,
    uptime: pollingStats.startTime ? 
      Math.floor((Date.now() - pollingStats.startTime.getTime()) / 1000) : 0,
    activeDevices,
    deviceLastPolls,
  };
}

/**
 * Check if a specific device is being auto-polled
 */
export function isDeviceBeingPolled(deviceId: string): boolean {
  return devicePollingTimers.has(deviceId);
}

/**
 * Get the last poll time for a specific device
 */
export function getDeviceLastPollTime(deviceId: string): Date | null {
  return pollingStats.deviceLastPollTime.get(deviceId) || null;
}

/**
 * Force an immediate poll of all enabled devices
 */
export async function forceRefreshAllDevices(): Promise<void> {
  // Stop current polling
  stopAutoPollingService();
  
  // Reset statistics
  pollingStats.successfulPolls = 0;
  pollingStats.failedPolls = 0;
  
  // Restart polling service
  await startAutoPollingService();
}

/**
 * Schedule an immediate poll for a specific device
 * This is used by frontend requests to get fresh data without duplicating polls
 */
export function scheduleImmediatePoll(deviceId: string): void {
  if (!pollingStats.isPollingActive) {
    console.log(chalk.yellow(`⚠️ Auto-polling service is not running, cannot schedule immediate poll for ${deviceId}`));
    return;
  }
  
  // Get the device info from our polling timers
  if (!devicePollingTimers.has(deviceId)) {
    console.log(chalk.yellow(`⚠️ Device ${deviceId} is not being auto-polled, cannot schedule immediate poll`));
    return;
  }
  
  // Clear any existing timer
  clearTimeout(devicePollingTimers.get(deviceId));
  devicePollingTimers.delete(deviceId);
  
  // Get device information from database to determine optimal polling interval
  getClientModels()
    .then((models: any) => {
      if (!models || !models.Device) {
        throw new Error('Device model not available');
      }
      
      return models.Device.findById(deviceId).select('name pollingInterval advancedSettings').lean();
    })
    .then((device: any) => {
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }
      
      console.log(chalk.green(`📱 Scheduling immediate poll for device ${device.name}`));
      
      // Determine polling interval for future scheduling 
      let pollingInterval = 60000; // Default to 60 seconds
      
      // First try device-specific polling interval
      if (device.pollingInterval) {
        pollingInterval = device.pollingInterval;
      } 
      // Then try the advanced settings default poll interval
      else if (device.advancedSettings?.defaultPollInterval) {
        pollingInterval = device.advancedSettings.defaultPollInterval;
      }
      
      // For the problematic device, use extended interval
      if (deviceId === '681be2e94525b07963a3a3c6') {
        pollingInterval = Math.max(pollingInterval, 5 * 60000); // At least 5 minutes
      }
      
      // Schedule the immediate poll now
      scheduleDevicePolling(deviceId, device.name, pollingInterval);
    })
    .catch((error: Error) => {
      console.error(chalk.red(`❌ Error scheduling immediate poll for device ${deviceId}: ${error}`));
    });
}