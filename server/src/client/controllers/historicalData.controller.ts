import { Request, Response } from 'express';
import mongoose from 'mongoose';
import HistoricalData from '../models/historicalData.model';
import { getDeviceModel } from '../services/device.service';
import { getClientDbConnection } from '../models/index.model';

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
export const   getHistoricalTimeRange = async (req: Request, res: Response) => {
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

/**
 * @desc    Get aggregated historical data for all devices
 * @route   GET /api/devices/data/historical/aggregate
 * @access  Private
 */
export const getAggregatedHistoricalData = async (req: Request, res: Response) => {
  try {
    const {
      parameterName,
      startDate,
      endDate,
      aggregationType = 'average', // 'average', 'sum', 'min', 'max', 'count'
      groupBy = 'daily' // 'hourly', 'daily', 'weekly', 'monthly', 'yearly'
    } = req.query;

    // Validate required parameters
    if (!parameterName) {
      return res.status(400).json({
        success: false,
        message: 'Parameter name is required'
      });
    }

    // Get the device model
    const DeviceModel = await getDeviceModel(req);
    
    // Get all device IDs
    const devices = await DeviceModel.find(
      { isTemplate: { $ne: true }, enabled: true },
      { _id: 1, name: 1 }
    );

    if (devices.length === 0) {
      return res.json({
        success: true,
        message: 'No active devices found',
        data: []
      });
    }

    // Extract device IDs and create a map for device names
    const deviceIds = devices.map(d => d._id);
    const deviceNameMap = devices.reduce((map, device) => {
      map[device._id.toString()] = device.name;
      return map;
    }, {} as Record<string, string>);

    // Build aggregation pipeline
    const matchStage: any = {
      deviceId: { $in: deviceIds },
      parameterName: parameterName
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      matchStage.timestamp = {};
      
      if (startDate) {
        matchStage.timestamp.$gte = new Date(startDate as string);
      }
      
      if (endDate) {
        matchStage.timestamp.$lte = new Date(endDate as string);
      }
    }

    // Define date grouping format based on groupBy parameter
    let dateFormat: any;
    switch (groupBy) {
      case 'hourly':
        dateFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
        break;
      case 'daily':
        dateFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
        break;
      case 'weekly':
        dateFormat = {
          year: { $year: '$timestamp' },
          week: { $week: '$timestamp' }
        };
        break;
      case 'monthly':
        dateFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        };
        break;
      case 'yearly':
        dateFormat = {
          year: { $year: '$timestamp' }
        };
        break;
      default:
        dateFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
    }

    // Define aggregation operator based on aggregationType
    let aggregationOperator: any;
    switch (aggregationType) {
      case 'sum':
        aggregationOperator = { $sum: '$value' };
        break;
      case 'min':
        aggregationOperator = { $min: '$value' };
        break;
      case 'max':
        aggregationOperator = { $max: '$value' };
        break;
      case 'count':
        aggregationOperator = { $sum: 1 };
        break;
      case 'average':
      default:
        aggregationOperator = { $avg: '$value' };
        break;
    }

    // Build the aggregation pipeline
    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: dateFormat,
            deviceId: '$deviceId'
          },
          value: aggregationOperator,
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          devices: {
            $push: {
              deviceId: '$_id.deviceId',
              value: '$value',
              count: '$count'
            }
          },
          totalValue: aggregationOperator,
          totalCount: { $sum: '$count' },
          deviceCount: { $sum: 1 }
        }
      },
      {
        $sort: { 
          '_id.year': 1 as const, 
          '_id.month': 1 as const, 
          '_id.day': 1 as const, 
          '_id.hour': 1 as const, 
          '_id.week': 1 as const 
        }
      }
    ];

    // Get historical data model
    let HistoricalDataModel = HistoricalData;
    if (req.app.locals.clientModels && req.app.locals.clientModels.HistoricalData) {
      HistoricalDataModel = req.app.locals.clientModels.HistoricalData;
    }

    // Execute aggregation
    const aggregatedData = await HistoricalDataModel.aggregate(pipeline);

    // Format the response with device names
    const formattedData = aggregatedData.map(item => {
      // Format the date based on groupBy parameter
      let dateString: string;
      const dateObj = item._id;
      
      switch (groupBy) {
        case 'hourly':
          dateString = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')} ${String(dateObj.hour).padStart(2, '0')}:00`;
          break;
        case 'daily':
          dateString = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
          break;
        case 'weekly':
          dateString = `${dateObj.year}-W${String(dateObj.week).padStart(2, '0')}`;
          break;
        case 'monthly':
          dateString = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}`;
          break;
        case 'yearly':
          dateString = `${dateObj.year}`;
          break;
        default:
          dateString = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
      }

      // Add device names to the devices array
      const devicesWithNames = item.devices.map((device: any) => ({
        ...device,
        deviceName: deviceNameMap[device.deviceId.toString()] || 'Unknown Device'
      }));

      const result: any = {
        date: dateString,
        deviceCount: item.deviceCount,
        totalDataPoints: item.totalCount,
        devices: devicesWithNames
      };
      result[aggregationType.toString()] = item.totalValue;
      return result;
    });

    return res.json({
      success: true,
      message: 'Historical data aggregated successfully',
      parameterName: parameterName as string,
      aggregationType: aggregationType as string,
      groupBy: groupBy as string,
      dateRange: {
        start: startDate || 'no limit',
        end: endDate || 'no limit'
      },
      data: formattedData,
      summary: {
        totalDevices: devices.length,
        totalDataPoints: formattedData.reduce((sum, item) => sum + item.totalDataPoints, 0),
        dateGroups: formattedData.length
      }
    });

  } catch (error: any) {
    console.error('[historicalDataController] Error aggregating historical data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};