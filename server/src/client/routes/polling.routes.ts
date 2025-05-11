import * as deviceDataController from '../controllers/polling.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Device polling control routes
router.post('/:id/polling/start', deviceDataController.startDevicePolling as express.RequestHandler);
router.post('/:id/polling/stop', deviceDataController.stopDevicePolling as express.RequestHandler);

// Device data retrieval routes
router.get('/:id/data/current', deviceDataController.getCurrentDeviceData as express.RequestHandler);

// Read-only version that respects device polling interval settings
router.get('/:id/data/current/readonly', async (req: express.Request, res: express.Response) => {
  try {
    const deviceId = req.params.id;
    // Set the readOnly query parameter to true
    req.query.readOnly = 'true';
    
    // Import types
    interface ParameterReading {
      name: string;
      registerIndex?: number;
      address?: number;
      value: any;
      unit?: string;
      dataType?: string;
      error?: string;
    }
    
    interface DeviceReading {
      deviceId: string;
      deviceName: string;
      timestamp: Date;
      readings: ParameterReading[];
    }
    
    // First, get the device to check polling interval settings
    const { getDeviceModel } = require('../services/device.service');
    const DeviceModel = await getDeviceModel(req);
    const device = await DeviceModel.findById(deviceId);
    
    if (!device) {
      console.log(`[polling.routes] Device not found with ID: ${deviceId} for readonly endpoint`);
      // If device not found, just forward to the regular handler
      return deviceDataController.getCurrentDeviceData(req, res);
    }
    
    // Get the device-specific polling interval (default 30 seconds if not set)
    const pollingInterval = device.pollingInterval || 30000;
    console.log(`[polling.routes] Device ${device.name} has polling interval of ${pollingInterval}ms`);
    
    // Get current data from cache
    const dataPollingService = require('../services/polling.service');
    const cachedData: DeviceReading | null = dataPollingService.getRealtimeData(deviceId);
    
    if (cachedData && cachedData.timestamp) {
      // Calculate how long ago the cache was updated
      const cachedTime = new Date(cachedData.timestamp).getTime();
      const currentTime = new Date().getTime();
      const timeSinceLastPoll = currentTime - cachedTime;
      
      console.log(`[polling.routes] Cache data is ${timeSinceLastPoll}ms old, polling interval is ${pollingInterval}ms`);
      console.log(`[polling.routes] Cache timestamp: ${new Date(cachedData.timestamp).toISOString()}, current time: ${new Date().toISOString()}`);
      
      // Log the actual readings in the cache to help with debugging
      if (cachedData.readings && cachedData.readings.length > 0) {
        console.log(`[polling.routes] Cache contains ${cachedData.readings.length} readings:`);
        cachedData.readings.slice(0, 3).forEach((reading: { name: string; value: any; unit?: string }, index: number) => {
          console.log(`[polling.routes] Reading ${index}: ${reading.name} = ${reading.value}${reading.unit || ''}`);
        });
        if (cachedData.readings.length > 3) {
          console.log(`[polling.routes] ... and ${cachedData.readings.length - 3} more readings`);
        }
      } else {
        console.log(`[polling.routes] Cache contains no readings`);
      }
      
      // If the cached data is newer than the polling interval, use it
      if (timeSinceLastPoll < pollingInterval) {
        console.log(`[polling.routes] Using cached data for device ${device.name} as it's within polling interval`);
        return res.json({
          success: true,
          message: 'Device data retrieved from cache (within polling interval)',
          deviceId,
          deviceName: device.name,
          hasData: true,
          timestamp: cachedData.timestamp,
          readings: cachedData.readings || [],
          fromCache: true,
          cacheAge: timeSinceLastPoll,
          pollingInterval: pollingInterval,
          nextPollIn: pollingInterval - timeSinceLastPoll,
          pollingSettings: {
            deviceSpecificInterval: true,
            intervalMs: pollingInterval,
            lastPolled: new Date(cachedData.timestamp).toISOString()
          }
        });
      }
      
      // If we're here, the cache is older than the polling interval
      console.log(`[polling.routes] Cache data is older than polling interval, forwarding to regular handler`);
    }
    
    // No valid cache or cache too old, forward to regular handler
    return deviceDataController.getCurrentDeviceData(req, res);
  } catch (error) {
    console.error(`[polling.routes] Error in readonly endpoint:`, error);
    // In case of error, fall back to regular handler
    return deviceDataController.getCurrentDeviceData(req, res);
  }
});

export default router;
