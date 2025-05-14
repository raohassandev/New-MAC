import { Request, Response } from 'express';
import mongoose from 'mongoose';
import HistoricalData from '../models/historicalData.model';
import { getDeviceModel } from '../services/device.service';

/**
 * @desc    Get historical data for a device
 * @route   GET /api/devices/:id/data/historical
 * @access  Private
 */
export const getHistoricalData = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[historicalDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get the device model
    const DeviceModel = await getDeviceModel(req);
    
    // Look up the device
    const device = await DeviceModel.findById(deviceId);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    
    // Extract query parameters for filtering
    const { 
      parameterName, 
      startDate, 
      endDate, 
      limit = 1000,
      skip = 0
    } = req.query;
    
    // Default sort is by timestamp descending
    const sortField = typeof req.query.sort === 'string' ? req.query.sort : '-timestamp';
    
    // Build query
    const query: any = { deviceId };
    
    // Add parameter filter if provided
    if (parameterName) {
      query.parameterName = parameterName;
    }
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string);
      }
      
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string);
      }
    }
    
    // Get historical data from the database
    let HistoricalDataModel = HistoricalData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.HistoricalData) {
      HistoricalDataModel = req.app.locals.clientModels.HistoricalData;
    }
    
    // Get the count of records
    const total = await HistoricalDataModel.countDocuments(query);
    
    // Get the data with pagination
    const historicalData = await HistoricalDataModel.find(query)
      .sort(sortField)
      .skip(Number(skip))
      .limit(Number(limit));
    
    return res.json({
      success: true,
      message: 'Historical data retrieved successfully',
      deviceId,
      deviceName: device.name,
      data: {
        count: historicalData.length,
        total,
        records: historicalData
      },
      pagination: {
        limit: Number(limit),
        skip: Number(skip),
        hasMore: total > (Number(skip) + historicalData.length)
      }
    });
    
  } catch (error: any) {
    console.error('[historicalDataController] Error getting historical data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get available parameters for historical data
 * @route   GET /api/devices/:id/data/historical/parameters
 * @access  Private
 */
export const getHistoricalParameters = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[historicalDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get historical data model
    let HistoricalDataModel = HistoricalData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.HistoricalData) {
      HistoricalDataModel = req.app.locals.clientModels.HistoricalData;
    }
    
    // Get unique parameter names for this device
    const parameters = await HistoricalDataModel.distinct('parameterName', { deviceId });
    
    return res.json({
      success: true,
      message: 'Historical data parameters retrieved successfully',
      deviceId,
      parameters,
    });
    
  } catch (error: any) {
    console.error('[historicalDataController] Error getting historical parameters:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Get time range summary for historical data
 * @route   GET /api/devices/:id/data/historical/timerange
 * @access  Private
 */
export const getHistoricalTimeRange = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[historicalDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get historical data model
    let HistoricalDataModel = HistoricalData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.HistoricalData) {
      HistoricalDataModel = req.app.locals.clientModels.HistoricalData;
    }
    
    // Get the earliest and latest timestamp
    const earliest = await HistoricalDataModel.findOne({ deviceId }).sort('timestamp');
    const latest = await HistoricalDataModel.findOne({ deviceId }).sort('-timestamp');
    
    // Get the total count of records
    const count = await HistoricalDataModel.countDocuments({ deviceId });
    
    return res.json({
      success: true,
      message: 'Historical data time range retrieved successfully',
      deviceId,
      timeRange: {
        earliest: earliest ? earliest.timestamp : null,
        latest: latest ? latest.timestamp : null,
        count
      }
    });
    
  } catch (error: any) {
    console.error('[historicalDataController] Error getting historical time range:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete historical data for a device (admin only)
 * @route   DELETE /api/devices/:id/data/historical
 * @access  Private (Admin)
 */
export const deleteHistoricalData = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[historicalDataController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Extract query parameters for filtering
    const { parameterName, startDate, endDate } = req.query;
    
    // Build query
    const query: any = { deviceId };
    
    // Add parameter filter if provided
    if (parameterName) {
      query.parameterName = parameterName;
    }
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string);
      }
      
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string);
      }
    }
    
    // Get historical data model
    let HistoricalDataModel = HistoricalData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.HistoricalData) {
      HistoricalDataModel = req.app.locals.clientModels.HistoricalData;
    }
    
    // Delete the historical data
    const result = await HistoricalDataModel.deleteMany(query);
    
    return res.json({
      success: true,
      message: 'Historical data deleted successfully',
      deviceId,
      deletedCount: result.deletedCount,
    });
    
  } catch (error: any) {
    console.error('[historicalDataController] Error deleting historical data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};