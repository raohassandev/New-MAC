import { Request, Response } from 'express';
import mongoose from 'mongoose';
import chalk from 'chalk';
import RealtimeData from '../models/realtimeData.model';
import * as dataPollingService from '../services/polling.service';
import { getDeviceModel } from '../services/device.service';

/**
 * @desc    Store or update realtime data for a device
 * @route   POST /api/devices/:id/data/realtime
 * @access  Private
 */
export const updateRealtimeData = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[realtimeDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get the device model
    const DeviceModel = await getDeviceModel(req);
    
    // Look up the device
    const device = await DeviceModel.findById(deviceId);
    
    // Get the device name from the device or fallback to the ID
    const deviceName = device ? device.name : `Device ${deviceId}`;
    
    // Get realtime data from polling service
    let realtimeData = dataPollingService.getRealtimeData(deviceId);
    
    if (!realtimeData || !realtimeData.readings || realtimeData.readings.length === 0) {
      // Try to poll the device to get initial data
      try {
        const freshData = await dataPollingService.pollDevice(deviceId, req);
        if (freshData) {
          realtimeData = freshData;
        } else {
          return res.status(200).json({
            success: false,
            message: 'No data available for device',
            deviceId,
            deviceName,
          });
        }
      } catch (error: any) {
        console.error(`[realtimeDataController] Error polling device: ${error.message}`);
        return res.status(200).json({
          success: false,
          message: `Error polling device: ${error.message}`,
          deviceId,
          deviceName,
        });
      }
    }
    
    // Get the appropriate RealtimeData model
    let RealtimeDataModel = RealtimeData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.RealtimeData) {
      RealtimeDataModel = req.app.locals.clientModels.RealtimeData;
    }
    
    // Use findOneAndUpdate with upsert to handle both creation and updates atomically
    // This avoids version conflicts that can occur with findOne + save approach
    console.log(`[realtimeDataController] Upserting realtime data for device ${deviceId}`);
    
    const result = await RealtimeDataModel.findOneAndUpdate(
      { deviceId },
      { 
        $set: {
          deviceName,
          readings: realtimeData.readings,
          timestamp: realtimeData.timestamp,
          lastUpdated: new Date()
        }
      },
      { 
        upsert: true, // Create document if it doesn't exist
        new: true,    // Return the updated document
        runValidators: true // Ensure data meets schema validation
      }
    );
    
    const isNewRecord = !result._id || result.isNew;
    
    return res.json({
      success: true,
      message: isNewRecord ? 'Realtime data created' : 'Realtime data updated',
      deviceId,
      deviceName,
      realtimeData: result,
    });
    
  } catch (error: any) {
    console.error('[realtimeDataController] Error updating realtime data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get realtime data for a device
 * @route   GET /api/devices/:id/data/realtime
 * @access  Private
 */
export const getRealtimeData = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[realtimeDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get the device model
    const DeviceModel = await getDeviceModel(req);
    
    // Look up the device
    const device = await DeviceModel.findById(deviceId);
    
    // Get realtime data from the database
    let RealtimeDataModel = RealtimeData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.RealtimeData) {
      RealtimeDataModel = req.app.locals.clientModels.RealtimeData;
    }
    
    const realtimeData = await RealtimeDataModel.findOne({ deviceId });
    
    // Check if data exists but has empty readings (common with event-driven startup)
    if (!realtimeData || !realtimeData.readings || realtimeData.readings.length === 0) {
      console.log(chalk.yellow(`[realtimeDataController] No data or empty readings for ${deviceId}, checking cache and triggering fresh read`));
      
      // Check in-memory cache first
      const cachedData = dataPollingService.getRealtimeData(deviceId);
      
      if (cachedData && cachedData.readings && cachedData.readings.length > 0) {
        console.log(chalk.green(`[realtimeDataController] Found cached data with ${cachedData.readings.length} readings`));
        return res.json({
          success: true,
          message: 'Cached data available but not yet stored in database',
          deviceId,
          deviceName: device ? device.name : `Device ${deviceId}`,
          hasData: true,
          data: cachedData,
          source: 'cache'
        });
      }
      
      // Try to trigger a fresh device read
      try {
        console.log(chalk.cyan(`[realtimeDataController] Triggering fresh device read for ${deviceId}`));
        const freshData = await dataPollingService.pollDevice(deviceId, req);
        
        if (freshData && freshData.readings && freshData.readings.length > 0) {
          console.log(chalk.green(`[realtimeDataController] Fresh read successful: ${freshData.readings.length} readings`));
          return res.json({
            success: true,
            message: 'Fresh data retrieved successfully',
            deviceId,
            deviceName: device ? device.name : freshData.deviceName,
            hasData: true,
            data: freshData,
            source: 'fresh_poll'
          });
        }
      } catch (pollError: any) {
        console.error(chalk.red(`[realtimeDataController] Fresh poll failed: ${pollError.message}`));
      }
      
      // If all else fails, return the stale data or indicate no data
      if (realtimeData) {
        return res.json({
          success: true,
          message: 'Stale data with empty readings - device may be offline',
          deviceId,
          deviceName: device ? device.name : realtimeData.deviceName,
          hasData: false,
          data: realtimeData,
          source: 'stale_database'
        });
      } else {
        return res.json({
          success: true,
          message: 'No realtime data available',
          deviceId,
          deviceName: device ? device.name : `Device ${deviceId}`,
          hasData: false,
        });
      }
    }
    
    // Compare database data with cache to see if we need an update
    const cachedData = dataPollingService.getRealtimeData(deviceId);
    const isDataStale = cachedData && 
      cachedData.timestamp && 
      new Date(cachedData.timestamp) > new Date(realtimeData.timestamp);
    
    return res.json({
      success: true,
      message: 'Realtime data retrieved successfully',
      deviceId,
      deviceName: device ? device.name : realtimeData.deviceName,
      hasData: true,
      data: realtimeData,
      stale: isDataStale,
      newerDataAvailable: isDataStale,
    });
    
  } catch (error: any) {
    console.error('[realtimeDataController] Error getting realtime data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete realtime data for a device
 * @route   DELETE /api/devices/:id/data/realtime
 * @access  Private (Admin)
 */
/**
 * @desc    Get realtime data for all devices or filtered by query
 * @route   GET /api/data/realtime
 * @access  Private
 */
export const getAllRealtimeData = async (req: Request, res: Response) => {
  try {
    // Get query parameters for filtering
    const { 
      deviceIds, // comma-separated list of device IDs
      hasData,   // filter by devices with/without data
      limit = 100,
      page = 1,
      search,    // search in device names
    } = req.query;

    // Get the appropriate RealtimeData model
    let RealtimeDataModel = RealtimeData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.RealtimeData) {
      RealtimeDataModel = req.app.locals.clientModels.RealtimeData;
    }
    
    // Build query
    let query: any = {};
    
    // Filter by device IDs if provided
    if (deviceIds && typeof deviceIds === 'string') {
      const ids = deviceIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (ids.length > 0) {
        query.deviceId = { $in: ids.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }
    
    // Filter by whether device has data
    if (hasData !== undefined) {
      if (hasData === 'true') {
        query['readings.0'] = { $exists: true }; // Has at least one reading
      } else if (hasData === 'false') {
        query.$or = [
          { readings: { $size: 0 } },
          { readings: { $exists: false } }
        ];
      }
    }
    
    // Search in device names
    if (search && typeof search === 'string') {
      query.deviceName = { $regex: search, $options: 'i' };
    }
    
    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get total count
    const total = await RealtimeDataModel.countDocuments(query);
    
    // Get realtime data with pagination
    const realtimeData = await RealtimeDataModel
      .find(query)
      .sort({ lastUpdated: -1 }) // Most recently updated first
      .skip(skip)
      .limit(parseInt(limit as string));
    
    // Get device details if needed
    const DeviceModel = await getDeviceModel(req);
    const dataDeviceIds = realtimeData.map(data => data.deviceId);
    const devices = await DeviceModel.find({ _id: { $in: dataDeviceIds } })
      .select('name enabled connectionType')
      .lean();
    
    // Create a map for quick device lookup
    const deviceMap = new Map(devices.map(device => [device._id.toString(), device]));
    
    // Enhance realtime data with device info
    const enhancedData = realtimeData.map(data => {
      const device = deviceMap.get(data.deviceId.toString());
      return {
        ...data.toObject(),
        device: device || { name: data.deviceName || 'Unknown Device' }
      };
    });
    
    return res.json({
      success: true,
      message: 'Realtime data retrieved successfully',
      data: enhancedData,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
    
  } catch (error: any) {
    console.error('[realtimeDataController] Error getting all realtime data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const deleteRealtimeData = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[realtimeDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get realtime data model
    let RealtimeDataModel = RealtimeData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.RealtimeData) {
      RealtimeDataModel = req.app.locals.clientModels.RealtimeData;
    }
    
    // Delete the realtime data
    const result = await RealtimeDataModel.deleteOne({ deviceId });
    
    if (result.deletedCount === 0) {
      return res.json({
        success: true,
        message: 'No realtime data found to delete',
        deviceId,
      });
    }
    
    return res.json({
      success: true,
      message: 'Realtime data deleted successfully',
      deviceId,
    });
    
  } catch (error: any) {
    console.error('[realtimeDataController] Error deleting realtime data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};