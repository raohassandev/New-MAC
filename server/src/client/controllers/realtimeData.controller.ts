import { Request, Response } from 'express';
import mongoose from 'mongoose';
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
    
    if (!realtimeData) {
      // No data in database, check in-memory cache
      const cachedData = dataPollingService.getRealtimeData(deviceId);
      
      if (cachedData) {
        return res.json({
          success: true,
          message: 'Cached data available but not yet stored in database',
          deviceId,
          deviceName: device ? device.name : `Device ${deviceId}`,
          hasData: true,
          data: cachedData,
          source: 'cache'
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