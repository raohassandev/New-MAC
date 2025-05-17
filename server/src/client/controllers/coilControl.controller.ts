/**
 * Coil Register Control Controller
 * This controller handles requests for controlling and reading device coil registers
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import chalk from 'chalk';

import * as coilControlService from '../services/coilControl.service';

// Define a custom request type that includes user information
interface AuthRequest extends Request {
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    username?: string;
    email?: string;
    roles?: string[];
  };
}

// @desc    Control a device's coil register
// @route   POST /api/devices/:id/coil-control
// @access  Private (Admin/Engineer/Operator)
export const controlDeviceCoil = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[coilControlController] Starting device coil control operation'));
    
    const deviceId = req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[coilControlController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get control parameters from request body
    const { coilAddress, value, type } = req.body;

    
    
    if (coilAddress === undefined) {
      console.error('[coilControlController] No coil address provided');
      return res.status(400).json({
        success: false,
        message: 'No coil address provided'
      });
    }
    
    if (value === undefined) {
      console.error('[coilControlController] No coil value provided');
      return res.status(400).json({
        success: false,
        message: 'No coil value provided'
      });
    }
    
    // Ensure value is boolean
    const boolValue = Boolean(value);
    
    // Validate coil type - normalize to lowercase for consistency
    const coilType = (type || 'control').toLowerCase();
    if (!['control', 'schedule', 'status'].includes(coilType)) {
      console.error(`[coilControlController] Invalid coil type: ${type}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid coil type. Must be one of: control, schedule, status (case-insensitive)'
      });
    }
    
    // Log the control request
    console.log(chalk.cyan(`[coilControlController] Coil control request for device ${deviceId}:`));
    console.log(chalk.cyan(`Address: ${coilAddress}, Value: ${boolValue}, Type: ${coilType}`));
    
    // Process user permissions (can be expanded based on your auth system)
    if (req.user) {
      const hasPermission = req.user.roles?.some(role => 
        ['admin', 'engineer', 'operator'].includes(role.toLowerCase())
      );
      
      if (!hasPermission) {
        console.error(`[coilControlController] User ${req.user.username || req.user.email} does not have control permission`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to control devices'
        });
      }
      
      // Add audit info
      console.log(chalk.blue(`[coilControlController] Control request by user: ${req.user.username || req.user.email}`));
    }
    
    try {
      // Call the service to perform the control operation
      const result = await coilControlService.controlCoilRegister(
        deviceId, 
        Number(coilAddress), 
        boolValue, 
        req, 
        coilType as 'control' | 'schedule' | 'status'
      );
      
      console.log(chalk.green(`[coilControlController] Coil control operation completed successfully`));
      
      // Return the result
      return res.status(200).json({
        success: result.success,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        timestamp: result.timestamp,
        coilAddress: result.coilAddress,
        value: result.value,
        coilType: result.coilType,
        message: result.message
      });
    } catch (operationError: any) {
      // This handles any errors from the service layer
      console.error(chalk.red('[coilControlController] Coil control operation error:'), operationError);
      
      // Determine the appropriate status code
      let statusCode = 500;
      if (operationError.message && operationError.message.includes('not found')) {
        statusCode = 404;
      } else if (operationError.message && operationError.message.includes('disabled')) {
        statusCode = 400;
      }
      
      // Return structured error response
      return res.status(statusCode).json({
        success: false,
        message: operationError.message || 'Unknown error occurred',
        error: operationError.message || 'Unknown error occurred',
        errorType: 'COIL_CONTROL_ERROR',
        deviceId
      });
    }
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[coilControlController] Critical error:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[coilControlController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the coil control request',
      error: error.message
    });
  }
};

// @desc    Control multiple coil registers for a device
// @route   POST /api/devices/:id/coil-batch-control
// @access  Private (Admin/Engineer/Operator)
export const batchControlDeviceCoils = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[coilControlController] Starting batch coil control operation'));
    
    const deviceId = req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[coilControlController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get coil data from request body
    const { coils } = req.body;
    
    if (!coils || !Array.isArray(coils) || coils.length === 0) {
      console.error('[coilControlController] No coil data provided');
      return res.status(400).json({
        success: false,
        message: 'No coil data provided'
      });
    }
    
    // Validate coil data structure
    for (const coil of coils) {
      if (coil.address === undefined) {
        console.error('[coilControlController] Missing coil address in batch request');
        return res.status(400).json({
          success: false,
          message: 'Missing coil address in batch request'
        });
      }
      
      if (coil.value === undefined) {
        console.error('[coilControlController] Missing coil value in batch request');
        return res.status(400).json({
          success: false,
          message: 'Missing coil value in batch request'
        });
      }
      
      // Validate coil type if provided - case insensitive
      if (coil.type && !['control', 'schedule', 'status'].includes(coil.type.toLowerCase())) {
        console.error(`[coilControlController] Invalid coil type: ${coil.type}`);
        return res.status(400).json({
          success: false,
          message: `Invalid coil type: ${coil.type}. Must be one of: control, schedule, status (case-insensitive)`
        });
      }
    }
    
    // Process user permissions (can be expanded based on your auth system)
    if (req.user) {
      const hasPermission = req.user.roles?.some(role => 
        ['admin', 'engineer', 'operator'].includes(role.toLowerCase())
      );
      
      if (!hasPermission) {
        console.error(`[coilControlController] User ${req.user.username || req.user.email} does not have control permission`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to control devices'
        });
      }
      
      // Add audit info
      console.log(chalk.blue(`[coilControlController] Batch coil control request by user: ${req.user.username || req.user.email}`));
    }
    
    // Standardize and convert values - normalize type to lowercase
    const standardizedCoils = coils.map(coil => ({
      address: Number(coil.address),
      value: Boolean(coil.value),
      type: ((coil.type || 'control').toLowerCase()) as 'control' | 'schedule' | 'status'
    }));
    
    try {
      // Call the service to perform the batch control operation
      const result = await coilControlService.controlMultipleCoilRegisters(
        deviceId, 
        standardizedCoils, 
        req
      );
      
      console.log(chalk.green(`[coilControlController] Batch coil control operation completed successfully`));
      
      // Return the result
      return res.status(200).json({
        success: result.success,
        allSuccess: result.allSuccess,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        timestamp: result.timestamp,
        results: result.results
      });
    } catch (operationError: any) {
      // This handles any errors from the service layer
      console.error(chalk.red('[coilControlController] Batch coil control operation error:'), operationError);
      
      // Determine the appropriate status code
      let statusCode = 500;
      if (operationError.message && operationError.message.includes('not found')) {
        statusCode = 404;
      } else if (operationError.message && operationError.message.includes('disabled')) {
        statusCode = 400;
      }
      
      // Return structured error response
      return res.status(statusCode).json({
        success: false,
        message: operationError.message || 'Unknown error occurred',
        error: operationError.message || 'Unknown error occurred',
        errorType: 'BATCH_COIL_CONTROL_ERROR',
        deviceId
      });
    }
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[coilControlController] Critical error:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[coilControlController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the batch coil control request',
      error: error.message
    });
  }
};

// @desc    Read coil registers from a device
// @route   GET /api/devices/:id/coil-read
// @access  Private (Admin/Engineer/Operator/Viewer)
export const readDeviceCoils = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[coilControlController] Starting coil read operation'));
    
    const deviceId = req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[coilControlController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get query parameters
    const startAddress = req.query.startAddress !== undefined 
      ? Number(req.query.startAddress) 
      : 0;
    
    const count = req.query.count !== undefined 
      ? Number(req.query.count) 
      : 10; // Default to reading 10 coils
    
    const coilType = ((req.query.type as string) || 'control').toLowerCase();
    
    // Validate coil type - case insensitive
    if (!['control', 'schedule', 'status'].includes(coilType)) {
      console.error(`[coilControlController] Invalid coil type: ${req.query.type}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid coil type. Must be one of: control, schedule, status (case-insensitive)'
      });
    }
    
    // Process user permissions (can be expanded based on your auth system)
    if (req.user) {
      const hasPermission = req.user.roles?.some(role => 
        ['admin', 'engineer', 'operator', 'viewer'].includes(role.toLowerCase())
      );
      
      if (!hasPermission) {
        console.error(`[coilControlController] User ${req.user.username || req.user.email} does not have read permission`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to read device data'
        });
      }
      
      // Add audit info
      console.log(chalk.blue(`[coilControlController] Coil read request by user: ${req.user.username || req.user.email}`));
    }
    
    try {
      // Call the service to perform the read operation
      const result = await coilControlService.readCoilRegisters(
        deviceId, 
        startAddress, 
        count, 
        coilType as 'control' | 'schedule' | 'status', 
        req
      );
      
      console.log(chalk.green(`[coilControlController] Coil read operation completed successfully`));
      
      // Return the result
      return res.status(200).json({
        success: result.success,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        timestamp: result.timestamp,
        coilType: result.coilType,
        startAddress: result.startAddress,
        count: result.count,
        coils: result.coils,
        message: result.message
      });
    } catch (operationError: any) {
      // This handles any errors from the service layer
      console.error(chalk.red('[coilControlController] Coil read operation error:'), operationError);
      
      // Determine the appropriate status code
      let statusCode = 500;
      if (operationError.message && operationError.message.includes('not found')) {
        statusCode = 404;
      } else if (operationError.message && operationError.message.includes('disabled')) {
        statusCode = 400;
      }
      
      // Return structured error response
      return res.status(statusCode).json({
        success: false,
        message: operationError.message || 'Unknown error occurred',
        error: operationError.message || 'Unknown error occurred',
        errorType: 'COIL_READ_ERROR',
        deviceId
      });
    }
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[coilControlController] Critical error:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[coilControlController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the coil read request',
      error: error.message
    });
  }
};