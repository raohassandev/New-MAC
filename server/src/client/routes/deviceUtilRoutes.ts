import express, { Router, Request, Response } from 'express';
import { Device } from '../models';
import mongoose from 'mongoose';
import { checkDatabaseAndDevices } from '../../utils/diagnostic/dbCheck';

const router: Router = express.Router();

// Get all devices (with pagination)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const devices = await Device.find()
      .select('_id name description enabled connectionSetting')
      .skip(skip)
      .limit(limit);

    const totalDevices = await Device.countDocuments();

    res.json({
      success: true,
      devices,
      pagination: {
        total: totalDevices,
        page,
        limit,
        pages: Math.ceil(totalDevices / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices',
      error: error.message
    });
  }
});

// Validate device ID
router.get('/validate/:id', async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.id;
    
    // Check if ID is in valid MongoDB format
    const isValidFormat = mongoose.Types.ObjectId.isValid(deviceId);
    
    if (!isValidFormat) {
      return res.json({
        success: true,
        isValid: false,
        reason: 'Invalid MongoDB ObjectId format',
        deviceId
      });
    }
    
    // Try to find the device
    const device = await Device.findById(deviceId).select('_id name');
    
    if (!device) {
      return res.json({
        success: true,
        isValid: false,
        reason: 'Device not found in database',
        deviceId,
        isValidFormat
      });
    }
    
    // Device is valid
    res.json({
      success: true,
      isValid: true,
      deviceId,
      device: {
        _id: device._id,
        name: device.name
      },
      isValidFormat
    });
  } catch (error: any) {
    console.error('Error validating device ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate device ID',
      error: error.message
    });
  }
});

// Run diagnostics
router.get('/diagnostics', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string;
    const results = await checkDatabaseAndDevices(deviceId);
    
    res.json({
      success: true,
      results,
      timestamp: new Date()
    });
  } catch (error: any) {
    console.error('Error running diagnostics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run diagnostics',
      error: error.message
    });
  }
});

export default router;