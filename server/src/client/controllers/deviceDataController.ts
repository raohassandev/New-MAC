import { Request, Response } from 'express';
import { Device } from '../models';
import HistoricalData from '../models/HistoricalData';
import * as dataPollingService from '../services/dataPollingService';
import mongoose from 'mongoose';

// @desc    Start polling a device
// @route   POST /api/devices/:id/polling/start
// @access  Private
export const startDevicePolling = async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (!device.enabled) {
      return res.status(400).json({ message: 'Device is disabled' });
    }

    // Get polling interval from request or use default (10 seconds)
    const interval = req.body.interval ? parseInt(req.body.interval) : 10000;

    // Start polling
    dataPollingService.setDevicePolling(deviceId, interval);

    res.json({
      success: true,
      message: `Started polling device ${deviceId} every ${interval}ms`,
    });
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
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Stop polling
    dataPollingService.stopPollingDevice(deviceId);

    res.json({
      success: true,
      message: `Stopped polling device ${deviceId}`,
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
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Get real-time data from cache
    const realtimeData = dataPollingService.getRealtimeData(deviceId);

    // If no data available, attempt to poll once
    if (!realtimeData) {
      const freshData = await dataPollingService.pollDevice(deviceId);

      if (!freshData) {
        return res.status(404).json({ message: 'No data available for this device' });
      }

      return res.json(freshData);
    }

    res.json(realtimeData);
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
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Get query parameters
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours

    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const parameterName = req.query.parameter as string;
    const limit = parseInt(req.query.limit as string) || 1000;

    // Build query
    const query: any = {
      deviceId: new mongoose.Types.ObjectId(deviceId),
      timestamp: { $gte: startDate, $lte: endDate },
    };

    // Add parameter filter if specified
    if (parameterName) {
      query.parameterName = parameterName;
    }

    // Execute query
    const historicalData = await HistoricalData.find(query).sort({ timestamp: -1 }).limit(limit);

    // If parameter is specified, format for time-series display
    if (parameterName) {
      const formattedData = historicalData.map(entry => ({
        timestamp: entry.timestamp,
        value: entry.value,
        unit: entry.unit,
        quality: entry.quality,
      }));

      return res.json({
        deviceId,
        deviceName: device.name,
        parameter: parameterName,
        data: formattedData,
      });
    }

    // Otherwise, return grouped by timestamp
    const groupedData = new Map();

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
        unit: entry.unit,
        quality: entry.quality,
      };
    });

    res.json({
      deviceId,
      deviceName: device.name,
      data: Array.from(groupedData.values()),
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
