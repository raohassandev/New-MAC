import { Request, Response } from 'express';
import HistoricalData from '../models/HistoricalData';
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
          // Use this device instead
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
    
    // Process the device using our helper function
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
    
    console.log(`[deviceDataController] Getting current data for device ID: ${deviceId}${forceRefresh ? ' (force refresh)' : ''}`);
    
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

    // Check if this device has polling enabled
    const isPollingActive = dataPollingService.isDevicePollingActive(deviceId);
    console.log(`[deviceDataController] Device ${deviceId} polling status: ${isPollingActive ? 'active' : 'inactive'}`);
    
    // Only poll if polling is active or forceRefresh is requested AND polling is active
    if ((forceRefresh && isPollingActive) || (isPollingActive && !realtimeData)) {
      try {
        console.log(`[deviceDataController] Polling device ${deviceId} because polling is active`);
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
    } else if (!realtimeData && !isPollingActive) {
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
    
    // Return formatted response with valid data
    res.json({
      success: true,
      message: 'Device data retrieved successfully',
      deviceId,
      deviceName: device?.name || deviceName, // Use deviceName fallback if device is null
      hasData: true,
      timestamp: realtimeData.timestamp,
      readings: realtimeData.readings || []
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

// @desc    Get historical data for a device
// @route   GET /api/devices/:id/data/history
// @access  Private
export const getDeviceHistoricalData = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in valid format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    const DeviceModel = await getDeviceModel(req);
    
    
    // Try to lookup the device, but doesn't matter if we don't find it
    const device = await DeviceModel.findById(deviceId);
    
    // For historical data, we actually do need the device to exist
    // since it's stored in the database
    if (!device) {
      console.log(`[deviceDataController] Device not found for historical data: ${deviceId}`);
      return res.status(200).json({ 
        success: false,
        message: 'Device not found - no historical data available',
        deviceId,
        data: []
      });
    }
    
    const deviceName = device.name;

    // Get query parameters
    const startDate = req.query.startDate || req.query.startTime
      ? new Date(req.query.startDate as string || req.query.startTime as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours

    const endDate = req.query.endDate || req.query.endTime 
      ? new Date(req.query.endDate as string || req.query.endTime as string) 
      : new Date();

    // Get parameters as array or single value
    const parameterNames = req.query.parameters 
      ? (req.query.parameters as string).split(',') 
      : req.query.parameter 
        ? [(req.query.parameter as string)] 
        : undefined;
    
    const limit = parseInt(req.query.limit as string) || 1000;
    const format = (req.query.format as string) || 'grouped'; // 'grouped', 'timeseries', or 'raw'

    // Build query
    const query: any = {
      deviceId: new mongoose.Types.ObjectId(deviceId),
      timestamp: { $gte: startDate, $lte: endDate },
    };

    // Add parameter filter if specified
    if (parameterNames && parameterNames.length > 0) {
      query.parameterName = { $in: parameterNames };
    }

    // Execute query
    const historicalData = await HistoricalData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Single parameter time series format
    if (parameterNames && parameterNames.length === 1 && format === 'timeseries') {
      const formattedData = historicalData.map(entry => ({
        timestamp: entry.timestamp,
        value: entry.value,
        unit: entry.unit,
        quality: entry.quality,
      }));

      return res.json({
        success: true,
        deviceId,
        deviceName: device.name,
        parameter: parameterNames[0],
        format: 'timeseries',
        data: formattedData,
        timeRange: {
          start: startDate,
          end: endDate,
        },
      });
    }

    // Raw format - just return the data with minimal processing
    if (format === 'raw') {
      return res.json({
        success: true,
        deviceId,
        deviceName: device.name,
        format: 'raw',
        parameters: [...new Set(historicalData.map(entry => entry.parameterName))],
        data: historicalData,
        timeRange: {
          start: startDate,
          end: endDate,
        },
      });
    }

    // Default: grouped by timestamp
    const groupedData = new Map<string, any>();

    historicalData.forEach(entry => {
      const timestampStr = entry.timestamp.toISOString();

      if (!groupedData.has(timestampStr)) {
        groupedData.set(timestampStr, {
          timestamp: entry.timestamp,
          values: {},
        });
      }

      groupedData.get(timestampStr).values[entry.parameterName] = {
        value: entry.value,
        unit: entry.unit || '',
        quality: entry.quality || 'unknown',
      };
    });

    res.json({
      success: true,
      deviceId,
      deviceName: device.name,
      format: 'grouped',
      parameters: [...new Set(historicalData.map(entry => entry.parameterName))],
      data: Array.from(groupedData.values()),
      timeRange: {
        start: startDate,
        end: endDate,
      },
      count: historicalData.length,
    });
  } catch (error: any) {
    console.error('Get device historical data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
