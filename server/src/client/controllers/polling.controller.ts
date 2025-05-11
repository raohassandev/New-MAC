import { Request, Response } from 'express';
import HistoricalData from '../models/historicalData.model';
import * as dataPollingService from '../services/polling.service';
import mongoose from 'mongoose';
import { getDeviceModel } from '../services/device.service';

/**
 * Helper to convert readyState to a human-readable status
 */
function getConnectionStatus(readyState: number): string {
  switch (readyState) {
    case mongoose.ConnectionStates.connected:
      return 'connected';
    case mongoose.ConnectionStates.connecting:
      return 'connecting';
    case mongoose.ConnectionStates.disconnected:
      return 'disconnected';
    case mongoose.ConnectionStates.disconnecting:
      return 'disconnecting';
    default:
      return 'unknown';
  }
}

/**
 * Helper function to process a device for polling
 */
function processDevice(device: any, interval: number, userId: string, res: Response) {
  if (!device.enabled) {
    return res.status(400).json({ 
      success: false,
      message: 'Device is disabled' 
    });
  }

  // Start polling
  const success = dataPollingService.setDevicePolling(device._id.toString(), interval);

  if (success) {
    // Track this device for the current user
    if (!userPollingDevices.has(userId)) {
      userPollingDevices.set(userId, new Set());
    }
    userPollingDevices.get(userId)?.add(device._id.toString());
    
    return res.json({
      success: true,
      message: `Started polling device ${device.name} every ${interval}ms`,
      deviceId: device._id,
      deviceName: device.name,
      pollingInterval: interval
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Failed to start polling service',
    });
  }
}

// Log MongoDB connection status on import
console.log(`[deviceDataController] MongoDB connection readyState: ${mongoose.connection.readyState}`);
// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

// Store active polling sessions for each user to manage them
const userPollingDevices = new Map<string, Set<string>>();

// @desc    Start polling a device
// @route   POST /api/devices/:id/polling/start
// @access  Private
export const startDevicePolling = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    const userId = (req as any).user?.id || 'anonymous';
    
    // Get polling interval from request or use default (10 seconds)
    const interval = req.body.interval ? parseInt(req.body.interval) : 10000;

    // Check if deviceId is in valid format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }

    const DeviceModel = await getDeviceModel(req);
    
    // Skip the MongoDB connection check for now since the read endpoint works
    // Look up the device using a more direct approach
    const device = await DeviceModel.findById(deviceId);
    
    // If device is still not found, try to get it directly from the database client
    if (!device && req.app && req.app.locals.clientModels && req.app.locals.clientModels.Device) {
      try {
        const DeviceModel = req.app.locals.clientModels.Device;
        const alternativeDevice = await DeviceModel.findById(deviceId);
        if (alternativeDevice) {
          console.log(`[deviceDataController] Found device using app.locals.clientModels: ${alternativeDevice.name}`);
          
          // Check if device has a specific polling interval setting and use it if available
          if (alternativeDevice.pollingInterval && !req.body.interval) {
            console.log(`[deviceDataController] Using device-specific polling interval: ${alternativeDevice.pollingInterval}ms`);
            // Use device's polling interval instead of the default or requested interval
            return processDevice(alternativeDevice, alternativeDevice.pollingInterval, userId, res);
          }
          
          // Use this device with requested interval
          return processDevice(alternativeDevice, interval, userId, res);
        }
      } catch (err) {
        console.error(`[deviceDataController] Error finding device using alternative method:`, err);
      }
    }

    if (!device) {
      console.log(`[deviceDataController] Device not found with ID: ${deviceId}`);
      
      // Log available devices to help debug
      try {
        const allDevices = await DeviceModel.find().select('_id name').limit(5);
        console.log(`[deviceDataController] Available devices (sample): ${JSON.stringify(allDevices)}`);
      } catch (err) {
        console.error(`[deviceDataController] Error listing devices: ${err}`);
      }
      
      // As a workaround, try to directly create a device reading endpoint instead
      try {
        // Try to start device polling even without verifying device
        console.log(`[deviceDataController] Attempting to start polling without device validation`);
        const success = dataPollingService.setDevicePolling(deviceId, interval);
        
        if (success) {
          console.log(`[deviceDataController] Successfully started polling for device ID: ${deviceId}`);
          // Track this device for the current user
          if (!userPollingDevices.has(userId)) {
            userPollingDevices.set(userId, new Set());
          }
          userPollingDevices.get(userId)?.add(deviceId);
          
          return res.json({
            success: true,
            message: `Started polling device with ID ${deviceId} every ${interval}ms`,
            deviceId,
            pollingInterval: interval,
            note: "Device was not validated but polling was started"
          });
        }
      } catch (err) {
        console.error(`[deviceDataController] Error in direct polling attempt:`, err);
      }
      
      return res.status(404).json({ 
        success: false,
        message: 'Device not found'
      });
    }
    
    console.log(`[deviceDataController] Found device: ${device.name} (${deviceId})`);
    
    // Check if device has a specific polling interval setting and use it if available
    if (device.pollingInterval && !req.body.interval) {
      console.log(`[deviceDataController] Using device-specific polling interval: ${device.pollingInterval}ms`);
      // Use device's polling interval instead of the default or requested interval
      return processDevice(device, device.pollingInterval, userId, res);
    }
    
    // Process the device using our helper function with requested interval
    return processDevice(device, interval, userId, res);
  } catch (error: any) {
    console.error('Start device polling error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Stop polling a device
// @route   POST /api/devices/:id/polling/stop
// @access  Private
export const stopDevicePolling = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    const userId = (req as any).user?.id || 'anonymous';
    
    // Check if deviceId is in valid format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }

    const DeviceModel = await getDeviceModel(req);
    
    console.log(`[deviceDataController] Stopping polling for device ID: ${deviceId}`);
    
    // Try to lookup the device, but doesn't matter if we don't find it
    const device = await DeviceModel.findById(deviceId);
    const deviceName = device ? device.name : `Device ${deviceId}`;
    
    // Stop polling regardless of whether device was found
    const stopped = dataPollingService.stopPollingDevice(deviceId);

    // Remove this device from the user's polling list
    userPollingDevices.get(userId)?.delete(deviceId);

    res.json({
      success: true,
      message: stopped 
        ? `Stopped polling device ${deviceName}` 
        : `No active polling found for device ${deviceName}`,
      deviceId,
      deviceName
    });
  } catch (error: any) {
    console.error('Stop device polling error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get latest real-time data for a device
// @route   GET /api/devices/:id/data/current
// @access  Private
export const getCurrentDeviceData = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    const forceRefresh = req.query.forceRefresh === 'true';
    const readOnly = req.query.readOnly === 'true'; // New parameter to avoid database operations
    
    console.log(`[deviceDataController] Getting current data for device ID: ${deviceId}${forceRefresh ? ' (force refresh)' : ''}${readOnly ? ' (read-only mode)' : ''}`);
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    const DeviceModel = await getDeviceModel(req);

    // Skip the MongoDB connection check for now since the read endpoint works
    // Look up the device using a more direct approach
    const device = await DeviceModel.findById(deviceId);
    
    // If device is still not found, try to get it directly from the database client
    let deviceFound = !!device;
    if (!device && req.app && req.app.locals.clientModels && req.app.locals.clientModels.Device) {
      try {
        const DeviceModel = req.app.locals.clientModels.Device;
        const alternativeDevice = await DeviceModel.findById(deviceId);
        if (alternativeDevice) {
          console.log(`[deviceDataController] Found device using app.locals.clientModels: ${alternativeDevice.name}`);
          deviceFound = true;
        }
      } catch (err) {
        console.error(`[deviceDataController] Error finding device using alternative method:`, err);
      }
    }

    // Process device data retrieval even if we couldn't find the device in the database
    // This allows us to get data if the polling service can still access the device
    
    // Get real-time data from cache
    let realtimeData = dataPollingService.getRealtimeData(deviceId);
    let deviceName = device ? device.name : `Device ${deviceId}`;

    // Check if auto-polling service is running by trying to import and check its status
    let isAutoPollingActive = false;
    try {
      const autoPollingService = require('../services/autoPolling.service');
      const stats = autoPollingService.getPollingStats();
      isAutoPollingActive = stats.isPollingActive;
      
      console.log(`[deviceDataController] Auto-polling service status: ${isAutoPollingActive ? 'active' : 'inactive'}`);
    } catch (error) {
      console.warn(`[deviceDataController] Could not determine auto-polling status: ${error}`);
    }

    // Check if device-specific polling is enabled (via frontend)
    const isDevicePollingActive = dataPollingService.isDevicePollingActive(deviceId);
    console.log(`[deviceDataController] Device ${deviceId} polling status: ${isDevicePollingActive ? 'active' : 'inactive'}`);
    
    // Priority order for data retrieval:
    // 1. Use cached data if available and recent (< 30 seconds old)
    // 2. Use auto-polling service if running
    // 3. Use device-specific polling if enabled
    // 4. Poll directly if forced refresh requested
    
    // If read-only mode is specified, only return cached data without any polling
    if (readOnly) {
      console.log(`[deviceDataController] READ-ONLY MODE: Using only cached data for device ${deviceId}`);
      // Just continue to the return statement - no polling will be done
      
      // Add note about polling interval if device is found
      if (device && device.pollingInterval) {
        console.log(`[deviceDataController] Device ${deviceId} has polling interval of ${device.pollingInterval}ms`);
        // Note: The actual polling interval respecting logic is handled in the /:id/data/current/readonly endpoint
      }
    }
    else {
      const isCachedDataRecent = realtimeData && 
                              realtimeData.timestamp && 
                              (new Date().getTime() - new Date(realtimeData.timestamp).getTime() < 30000);
      
      if (isCachedDataRecent) {
        console.log(`[deviceDataController] Using recent cached data for device ${deviceId}`);
        // Don't poll again, just use the cached data
      }
      else if (!isCachedDataRecent && isAutoPollingActive && forceRefresh) {
        // If auto-polling is active and we need fresh data, trigger a single poll via auto-polling service
        try {
          console.log(`[deviceDataController] Triggering auto-polling refresh for device ${deviceId}`);
          const autoPollingService = require('../services/autoPolling.service');
          
          // Collect but don't await the polling (just trigger it for next cycle)
          autoPollingService.scheduleImmediatePoll(deviceId);
          
          // Still use existing cached data if available
          if (!realtimeData) {
            console.log(`[deviceDataController] Waiting for auto-polling data for device ${deviceId}, polling once...`);
            // If no cached data, do one direct poll to get initial data
            const freshData = await dataPollingService.pollDevice(deviceId, req);
            if (freshData) {
              realtimeData = freshData;
            }
          }
        } catch (error) {
          console.warn(`[deviceDataController] Error using auto-polling service: ${error}`);
        }
      }
      // Poll directly as a last resort if we need fresh data and other methods aren't available
      else if ((forceRefresh && (isDevicePollingActive || !isAutoPollingActive)) || 
              (isDevicePollingActive && !realtimeData && !isAutoPollingActive)) {
        try {
          console.log(`[deviceDataController] Polling device ${deviceId} directly (auto-polling inactive)`);
          // Pass the req object to pollDevice so it can use app.locals if needed
          const freshData = await dataPollingService.pollDevice(deviceId, req);

          if (!freshData) {
            if (realtimeData) {
              // If we have cached data but failed to refresh, still return the cached data
              // but with a warning
              return res.json({
                ...realtimeData,
                success: true,
                stale: true,
                message: 'Failed to refresh data, returning cached data',
                timestamp: realtimeData.timestamp,
                deviceName,
              });
            }
            
            // No cached data and couldn't get fresh data
            if (!deviceFound) {
              // If the device wasn't found in the database, let the client know
              return res.status(200).json({ 
                success: true,
                message: 'Device not found in database. No data available.',
                deviceId,
                deviceName,
                hasData: false,
                readings: []
              });
            } else {
              // Device exists but no data yet
              return res.status(200).json({ 
                success: true,
                message: 'No data available for this device. To retrieve data, start polling for this device.',
                deviceId,
                deviceName,
                pollingStatus: 'inactive',
                hasData: false,
                readings: []
              });
            }
          }

          realtimeData = freshData;
        } catch (error) {
          // Type-safe error handling
          const pollError = error as Error;
          const errorMessage = pollError?.message || String(error);
          
          console.error(`[deviceDataController] Error polling device:`, errorMessage);
          
          // If we have cached data but failed to refresh, still return the cached data
          if (realtimeData) {
            return res.json({
              ...realtimeData,
              success: true,
              stale: true,
              error: errorMessage,
              message: 'Error refreshing data, returning cached data',
              timestamp: realtimeData.timestamp,
              deviceName,
            });
          }
          
          // No cached data and couldn't get fresh data due to error
          return res.status(200).json({ 
            success: false,
            message: `Error polling device: ${errorMessage}`,
            deviceId,
            deviceName,
            hasData: false,
            readings: []
          });
        }
      } else if (!realtimeData && !isDevicePollingActive && !isAutoPollingActive) {
        // No data available and polling is not active
        return res.status(200).json({ 
          success: true,
          message: 'No data available for this device. To retrieve data, start polling for this device.',
          deviceId,
          deviceName,
          pollingStatus: 'inactive',
          hasData: false,
          readings: []
        });
      }
    }

    // Make sure realtimeData is not null before returning
    if (!realtimeData) {
      return res.status(200).json({
        success: false,
        message: 'No data available for this device',
        deviceId,
        deviceName: device?.name || deviceName,
        hasData: false,
        readings: []
      });
    }
    
    // Get the device's polling interval (if available)
    const pollingInterval = device?.pollingInterval || 30000; // Default to 30 seconds if not specified
    
    // Calculate how long ago the cache was updated
    const cachedTime = new Date(realtimeData.timestamp).getTime();
    const currentTime = new Date().getTime();
    const timeSinceLastPoll = currentTime - cachedTime;
    
    // Return formatted response with valid data
    res.json({
      success: true,
      message: 'Device data retrieved successfully',
      deviceId,
      deviceName: device?.name || deviceName, // Use deviceName fallback if device is null
      hasData: true,
      timestamp: realtimeData.timestamp,
      readings: realtimeData.readings || [],
      // Add polling interval information
      cacheAge: timeSinceLastPoll,
      pollingInterval: pollingInterval,
      nextPollIn: readOnly ? Math.max(0, pollingInterval - timeSinceLastPoll) : 0, // Only relevant in readOnly mode
      pollingSettings: {
        deviceSpecificInterval: !!device?.pollingInterval,
        intervalMs: pollingInterval,
        lastPolled: new Date(realtimeData.timestamp).toISOString()
      }
    });
  } catch (error: any) {
    console.error('Get current device data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};