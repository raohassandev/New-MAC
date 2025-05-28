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
 * Start automatic polling for all enabled devices with smart initialization
 * @param defaultIntervalSeconds Optional default polling interval in seconds (defaults to 60)
 * @param timeoutMs Optional timeout for initialization in milliseconds (defaults to 30000ms)
 */
export async function startAutoPollingService(defaultIntervalSeconds?: number, timeoutMs: number = 30000): Promise<void> {
  try {
    // If interval is provided, update the global default (convert seconds to milliseconds)
    if (defaultIntervalSeconds !== undefined && defaultIntervalSeconds > 0) {
      globalDefaultPollingInterval = defaultIntervalSeconds * 1000;
      console.log(chalk.magenta(`🔄 Starting Smart Auto-Polling service with default interval: ${defaultIntervalSeconds} seconds, timeout: ${timeoutMs}ms`));
    } else {
      console.log(chalk.magenta(`🔄 Starting Smart Auto-Polling service with default interval: ${globalDefaultPollingInterval / 1000} seconds, timeout: ${timeoutMs}ms`));
    }
    
    // Only start if not already running
    if (pollingStats.isPollingActive) {
      console.log(chalk.yellow('⚠️ Auto-polling service is already running, not starting again'));
      return;
    }
    
    const startTime = Date.now();
    pollingStats.isPollingActive = true;
    pollingStats.startTime = new Date();
    
    // Use smart initialization strategy
    console.log(chalk.blue('🧮 Starting smart device polling initialization...'));
    const initResult = await smartPollAllEnabledDevices(timeoutMs, startTime);
    
    const elapsedTime = Date.now() - startTime;
    console.log(chalk.green(`✅ Smart auto-polling service started in ${elapsedTime}ms`));
    console.log(chalk.cyan(`📈 Strategy: ${initResult.strategy}`));
    console.log(chalk.cyan(`📊 Devices processed: ${initResult.processedDevices}/${initResult.totalDevices}`));
    console.log(chalk.cyan(`🔥 Active polling: ${initResult.activePolling}`));
    console.log(chalk.cyan(`📋 Background devices: ${initResult.backgroundDevices}`));
    
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

/**
 * Smart polling initialization based on available time vs number of devices
 */
async function smartPollAllEnabledDevices(timeoutMs: number, startTime: number): Promise<{
  strategy: string;
  totalDevices: number;
  processedDevices: number;
  activePolling: number;
  backgroundDevices: number;
}> {
  // Edge case: Invalid timeout
  if (timeoutMs <= 0) {
    console.warn(chalk.yellow(`[AutoPolling] ⚠️ Invalid timeout ${timeoutMs}ms, using default 30000ms`));
    timeoutMs = 30000;
  }
  
  if (timeoutMs < 1000) {
    console.warn(chalk.yellow(`[AutoPolling] ⚠️ Timeout too small (${timeoutMs}ms), using minimum 1000ms`));
    timeoutMs = 1000;
  }
  
  try {
    console.log(chalk.blue('[AutoPolling] 🔍 Getting device model...'));
    
    // Get the Device model with error handling
    let DeviceModel;
    try {
      const clientModels = getClientModels();
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
      } else {
        try {
          DeviceModel = mongoose.model('Device');
        } catch (error) {
          throw new Error('Failed to get Device model from mongoose');
        }
      }
    } catch (dbError: any) {
      console.error(chalk.red('[AutoPolling] ❌ Database connection failed:', dbError));
      throw new Error(`Database connection failed: ${dbError.message || dbError}`);
    }
    
    console.log(chalk.blue('[AutoPolling] 📋 Querying enabled devices...'));
    
    // Edge case: Database query timeout
    let devices;
    try {
      const queryTimeout = Math.min(timeoutMs * 0.1, 5000); // Max 5 seconds for DB query
      devices = await Promise.race([
        DeviceModel.find({ enabled: true }).select('_id name pollingInterval advancedSettings').lean(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), queryTimeout)
        )
      ]);
    } catch (queryError: any) {
      console.error(chalk.red('[AutoPolling] ❌ Database query failed:', queryError));
      throw new Error(`Database query failed: ${queryError.message || queryError}`);
    }

    console.log(chalk.cyan(`[AutoPolling] Database query completed`));
    console.log(chalk.cyan(`[AutoPolling] Found ${devices.length} enabled devices`));
    
    // Edge case: No devices
    if (!devices || devices.length === 0) {
      console.warn(chalk.yellow('[AutoPolling] ⚠️ No enabled devices found in database!'));
      console.log(chalk.yellow('[AutoPolling] Edge case handling:'));
      
      try {
        const totalDevices = await DeviceModel.countDocuments({});
        const enabledDevices = await DeviceModel.countDocuments({ enabled: true });
        
        console.log(chalk.yellow(`[AutoPolling]   Total devices: ${totalDevices}`));
        console.log(chalk.yellow(`[AutoPolling]   Enabled devices: ${enabledDevices}`));
        
        if (totalDevices === 0) {
          console.log(chalk.yellow('  ➡️ No devices exist in database'));
        } else if (enabledDevices === 0) {
          console.log(chalk.yellow('  ➡️ All devices are disabled'));
        }
      } catch (countError: any) {
        console.log(chalk.yellow('  ➡️ Unable to check device counts:', countError.message));
      }
      
      return { strategy: 'no-devices', totalDevices: 0, processedDevices: 0, activePolling: 0, backgroundDevices: 0 };
    }
    
    // Update polling stats
    pollingStats.totalDevicesPolled = devices.length;
    pollingStats.lastPollTime = new Date();
    
    // Calculate available time
    const coreTime = Date.now() - startTime;
    const reserveTime = Math.max(coreTime + 2000, 3000); // At least 3 seconds reserve
    const availableTime = Math.max(timeoutMs - reserveTime, 1000); // At least 1 second
    const timePerDevice = availableTime / devices.length;
    
    console.log(chalk.magenta(`[AutoPolling] 🧮 Smart Analysis:`));
    console.log(chalk.magenta(`[AutoPolling]   Total timeout: ${timeoutMs}ms`));
    console.log(chalk.magenta(`[AutoPolling]   Available time: ${availableTime}ms`));
    console.log(chalk.magenta(`[AutoPolling]   Devices to process: ${devices.length}`));
    console.log(chalk.magenta(`[AutoPolling]   Time per device: ${timePerDevice.toFixed(1)}ms`));
    
    // Edge case: Extremely tight time constraints
    if (availableTime < 1000) {
      console.warn(chalk.yellow(`[AutoPolling] ⚠️ Extremely tight time (${availableTime}ms), using emergency mode`));
      return await emergencyPollingInitialization(devices, availableTime, startTime);
    }
    
    // Decide strategy based on time vs devices ratio
    if (timePerDevice >= 1000) {
      console.log(chalk.green(`[AutoPolling] 📈 Strategy Decision: BATCH SEQUENTIAL (sufficient time)`));
      return await batchSequentialPolling(devices, availableTime, startTime);
    } else {
      console.log(chalk.green(`[AutoPolling] 📈 Strategy Decision: PARALLEL + BACKGROUND (tight time)`));
      return await parallelBackgroundPolling(devices, availableTime, startTime);
    }

  } catch (error: any) {
    const errorMessage = error.message || error;
    console.error(chalk.red('[AutoPolling] ❌ Critical error in smart initialization:', errorMessage));
    
    // Edge case: Try graceful degradation
    try {
      console.log(chalk.yellow('[AutoPolling] 🆘 Attempting graceful degradation...'));
      return await gracefulPollingDegradation(error, timeoutMs);
    } catch (degradationError: any) {
      console.error(chalk.red('[AutoPolling] ❌ Graceful degradation also failed:', degradationError));
      throw new Error(`Smart polling initialization failed: ${errorMessage}. Graceful degradation failed: ${degradationError.message || degradationError}`);
    }
  }
}

/**
 * Batch Sequential Polling - for when we have sufficient time
 */
async function batchSequentialPolling(devices: any[], availableTime: number, startTime: number): Promise<{
  strategy: string;
  totalDevices: number;
  processedDevices: number;
  activePolling: number;
  backgroundDevices: number;
}> {
  const strategy = 'batch-sequential';
  const totalDevices = devices.length;
  let processedDevices = 0;
  let activePolling = 0;
  const timePerBatch = availableTime / 2; // Split into 2 batches
  const devicesPerBatch = Math.ceil(devices.length / 2);
  
  console.log(chalk.green(`[AutoPolling] 📦 Using BATCH SEQUENTIAL strategy`));
  console.log(chalk.cyan(`[AutoPolling]   Batch 1: ${devicesPerBatch} devices (${timePerBatch}ms)`));
  console.log(chalk.cyan(`[AutoPolling]   Batch 2: ${devices.length - devicesPerBatch} devices (${timePerBatch}ms)`));
  
  try {
    // Batch 1 - First half of devices
    const batch1 = devices.slice(0, devicesPerBatch);
    const batch1StartTime = Date.now();
    
    console.log(chalk.blue(`[AutoPolling] 📦 Processing Batch 1: ${batch1.length} devices`));
    for (const device of batch1) {
      try {
        const pollingInterval = calculatePollingInterval(device);
        scheduleDevicePolling(device._id.toString(), device.name, pollingInterval);
        processedDevices++;
        activePolling++;
        console.log(chalk.green(`[AutoPolling] ✅ Batch 1: ${device.name} scheduled`));
      } catch (error) {
        console.warn(chalk.yellow(`[AutoPolling] ⚠️ Batch 1: ${device.name} failed, will retry in background`));
        scheduleBackgroundPolling(device);
      }
      
      // Check if we're running out of time
      const elapsedBatch1 = Date.now() - batch1StartTime;
      if (elapsedBatch1 > timePerBatch) {
        console.log(chalk.yellow(`[AutoPolling] ⏰ Batch 1 time limit reached, moving to Batch 2`));
        break;
      }
    }
    
    // Batch 2 - Second half of devices
    const batch2 = devices.slice(devicesPerBatch);
    const remainingTime = Math.max(availableTime - (Date.now() - startTime), 1000);
    
    if (batch2.length > 0 && remainingTime > 1000) {
      console.log(chalk.blue(`[AutoPolling] 📦 Processing Batch 2: ${batch2.length} devices (${remainingTime}ms remaining)`));
      
      for (const device of batch2) {
        try {
          const pollingInterval = calculatePollingInterval(device);
          scheduleDevicePolling(device._id.toString(), device.name, pollingInterval);
          processedDevices++;
          activePolling++;
          console.log(chalk.green(`[AutoPolling] ✅ Batch 2: ${device.name} scheduled`));
        } catch (error) {
          console.warn(chalk.yellow(`[AutoPolling] ⚠️ Batch 2: ${device.name} failed, will retry in background`));
          scheduleBackgroundPolling(device);
        }
        
        // Check remaining time
        const totalElapsed = Date.now() - startTime;
        if (totalElapsed > availableTime * 0.9) {
          console.log(chalk.yellow(`[AutoPolling] ⏰ Batch 2 time limit reached`));
          const remainingDevices = batch2.slice(batch2.indexOf(device) + 1);
          remainingDevices.forEach(dev => scheduleBackgroundPolling(dev));
          break;
        }
      }
    } else {
      console.log(chalk.yellow(`[AutoPolling] ⏰ No time for Batch 2, scheduling ${batch2.length} devices for background`));
      batch2.forEach(device => scheduleBackgroundPolling(device));
    }
    
  } catch (error) {
    console.error(chalk.red('[AutoPolling] Error in batch sequential polling:', error));
  }
  
  const backgroundDevices = totalDevices - processedDevices;
  return { strategy, totalDevices, processedDevices, activePolling, backgroundDevices };
}

/**
 * Parallel Background Polling - for when time is tight
 */
async function parallelBackgroundPolling(devices: any[], availableTime: number, startTime: number): Promise<{
  strategy: string;
  totalDevices: number;
  processedDevices: number;
  activePolling: number;
  backgroundDevices: number;
}> {
  const strategy = 'parallel-background';
  const totalDevices = devices.length;
  let processedDevices = 0;
  let activePolling = 0;
  
  console.log(chalk.green(`[AutoPolling] ⚡ Using PARALLEL + BACKGROUND strategy`));
  
  try {
    // Process a subset of devices immediately, rest go to background
    const maxImmediateDevices = Math.min(5, devices.length);
    const immediateDevices = devices.slice(0, maxImmediateDevices);
    const backgroundDevicesList = devices.slice(maxImmediateDevices);
    
    console.log(chalk.blue(`[AutoPolling] ⚡ Processing ${immediateDevices.length} devices immediately, ${backgroundDevicesList.length} in background`));
    
    // Process immediate devices in parallel
    const pollingPromises = immediateDevices.map(async (device) => {
      try {
        const pollingInterval = calculatePollingInterval(device);
        scheduleDevicePolling(device._id.toString(), device.name, pollingInterval);
        return { device, success: true };
      } catch (error) {
        console.warn(chalk.yellow(`[AutoPolling] ⚠️ Immediate polling failed for ${device.name}`));
        return { device, success: false };
      }
    });
    
    const results = await Promise.allSettled(pollingPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          processedDevices++;
          activePolling++;
          console.log(chalk.green(`[AutoPolling] ✅ Immediate: Device scheduled`));
        } else {
          backgroundDevicesList.push(result.value.device);
        }
      }
    }
    
    // Schedule remaining devices for background processing
    console.log(chalk.blue(`[AutoPolling] 🔄 Scheduling ${backgroundDevicesList.length} devices for background processing`));
    backgroundDevicesList.forEach(device => scheduleBackgroundPolling(device));
    
  } catch (error) {
    console.error(chalk.red('[AutoPolling] Error in parallel background polling:', error));
  }
  
  const backgroundDevices = totalDevices - processedDevices;
  return { strategy, totalDevices, processedDevices, activePolling, backgroundDevices };
}

/**
 * Emergency polling initialization for extremely tight time constraints
 */
async function emergencyPollingInitialization(devices: any[], availableTime: number, startTime: number): Promise<{
  strategy: string;
  totalDevices: number;
  processedDevices: number;
  activePolling: number;
  backgroundDevices: number;
}> {
  console.log(chalk.red(`[AutoPolling] 🆘 EMERGENCY MODE: ${availableTime}ms for ${devices.length} devices`));
  
  const strategy = 'emergency';
  const totalDevices = devices.length;
  let processedDevices = 0;
  let activePolling = 0;
  
  try {
    // Only process 1-2 critical devices immediately
    const criticalDevices = devices.slice(0, Math.min(2, devices.length));
    const backgroundDevicesList = devices.slice(criticalDevices.length);
    
    console.log(chalk.yellow(`[AutoPolling] 🆘 Emergency: Processing ${criticalDevices.length} critical devices, ${backgroundDevicesList.length} to background`));
    
    for (const device of criticalDevices) {
      try {
        const pollingInterval = calculatePollingInterval(device);
        scheduleDevicePolling(device._id.toString(), device.name, pollingInterval);
        processedDevices++;
        activePolling++;
        console.log(chalk.green(`[AutoPolling] ✅ Emergency: ${device.name} scheduled`));
        
        // Check time constraint
        if (Date.now() - startTime > availableTime * 0.8) {
          console.log(chalk.yellow(`[AutoPolling] ⏰ Emergency time limit, stopping critical processing`));
          break;
        }
      } catch (error) {
        console.warn(chalk.yellow(`[AutoPolling] ⚠️ Emergency: ${device.name} failed`));
        backgroundDevicesList.push(device);
      }
    }
    
    // Schedule all remaining devices for background
    backgroundDevicesList.forEach(device => scheduleBackgroundPolling(device));
    
    const backgroundDevices = backgroundDevicesList.length;
    return { strategy, totalDevices, processedDevices, activePolling, backgroundDevices };
    
  } catch (error) {
    console.error(chalk.red('[AutoPolling] ❌ Emergency initialization failed:', error));
    // Even emergency mode failed - schedule all devices for background
    devices.forEach(device => scheduleBackgroundPolling(device));
    return { strategy: 'emergency-failed', totalDevices, processedDevices: 0, activePolling: 0, backgroundDevices: totalDevices };
  }
}

/**
 * Graceful degradation when polling initialization fails
 */
async function gracefulPollingDegradation(originalError: any, timeoutMs: number): Promise<{
  strategy: string;
  totalDevices: number;
  processedDevices: number;
  activePolling: number;
  backgroundDevices: number;
}> {
  console.log(chalk.yellow('[AutoPolling] 🆘 Graceful degradation: Starting with minimal functionality'));
  
  const strategy = 'graceful-degradation';
  
  try {
    // Try to get device count from alternative method
    let deviceCount = 0;
    try {
      const clientModels = getClientModels();
      let DeviceModel;
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
      } else {
        DeviceModel = mongoose.model('Device');
      }
      deviceCount = await DeviceModel.countDocuments({ enabled: true });
      console.log(chalk.cyan(`[AutoPolling] 🆘 Found ${deviceCount} enabled devices via count query`));
    } catch (countError) {
      console.warn(chalk.yellow('[AutoPolling] 🆘 Unable to get device count, assuming 0'));
      deviceCount = 0;
    }
    
    if (deviceCount > 0) {
      console.log(chalk.yellow(`[AutoPolling] 🆘 Scheduling all ${deviceCount} devices for background processing`));
      
      // Schedule background polling for all devices
      setImmediate(async () => {
        try {
          await pollAllEnabledDevices(); // Use existing function as fallback
          console.log(chalk.green(`[AutoPolling] ✅ Graceful degradation: Background polling started`));
        } catch (bgError) {
          console.error(chalk.red('[AutoPolling] ❌ Even background polling failed:', bgError));
        }
      });
    }
    
    return {
      strategy,
      totalDevices: deviceCount,
      processedDevices: 0,
      activePolling: 0,
      backgroundDevices: deviceCount
    };
    
  } catch (degradationError) {
    console.error(chalk.red('[AutoPolling] ❌ Graceful degradation failed:', degradationError));
    throw degradationError;
  }
}

/**
 * Calculate polling interval for a device
 */
function calculatePollingInterval(device: any): number {
  let pollingInterval = globalDefaultPollingInterval;
  
  // First try device-specific polling interval
  if (device.pollingInterval) {
    pollingInterval = device.pollingInterval;
  } 
  // Then try the advanced settings default poll interval
  else if (device.advancedSettings?.defaultPollInterval) {
    pollingInterval = device.advancedSettings.defaultPollInterval;
  }
  
  // Enforce minimum polling interval of 10 seconds
  pollingInterval = Math.max(pollingInterval, 10000);
  
  // Handle devices with connection issues
  const deviceId = device._id.toString();
  const errorCount = pollingStats.deviceErrorCount.get(deviceId) || 0;
  const lastErrorTime = pollingStats.deviceLastErrorTime.get(deviceId);
  
  if (errorCount > 3) {
    const minutes = Math.min(errorCount, 10);
    const extendedInterval = minutes * 60000;
    pollingInterval = Math.max(pollingInterval, extendedInterval);
  } else if (lastErrorTime) {
    const minutesSinceError = (Date.now() - lastErrorTime.getTime()) / 60000;
    if (minutesSinceError < 5) {
      pollingInterval = Math.max(pollingInterval, 2 * 60000);
    }
  }
  
  return pollingInterval;
}

/**
 * Schedule device for background polling
 */
function scheduleBackgroundPolling(device: any): void {
  console.log(chalk.gray(`[AutoPolling] 🔄 Scheduling background polling for ${device.name}`));
  
  // Schedule for immediate background processing
  setImmediate(() => {
    try {
      const pollingInterval = calculatePollingInterval(device);
      scheduleDevicePolling(device._id.toString(), device.name, pollingInterval);
      console.log(chalk.green(`[AutoPolling] ✅ Background: ${device.name} scheduled`));
    } catch (error) {
      console.warn(chalk.yellow(`[AutoPolling] ⚠️ Background: ${device.name} failed, will retry in 5 minutes`));
      // Schedule retry in 5 minutes
      setTimeout(() => {
        scheduleBackgroundPolling(device);
      }, 5 * 60 * 1000);
    }
  });
}