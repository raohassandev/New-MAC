import { Request, Response } from 'express';
import mongoose from 'mongoose';
import chalk from 'chalk';

import * as deviceService from '../services/device.service';

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

// @desc    Control a device by setting parameter values
// @route   POST /api/devices/:id/control
// @access  Private (Admin/Engineer/Operator)
export const controlDevice = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[deviceControlController] Starting device control operation'));
    
    const deviceId = req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceControlController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get control parameters from request body
    const { parameters } = req.body;
    
    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      console.error('[deviceControlController] No control parameters provided');
      return res.status(400).json({
        success: false,
        message: 'No control parameters provided'
      });
    }
    
    // Validate each parameter
    for (const param of parameters) {
      if (!param.name || param.value === undefined || param.value === null || param.registerIndex === undefined) {
        console.error('[deviceControlController] Invalid parameter structure:', param);
        return res.status(400).json({
          success: false,
          message: 'Invalid parameter structure. Each parameter must have name, value, and registerIndex.'
        });
      }
      
      if (!param.dataType) {
        console.error('[deviceControlController] No dataType specified for parameter:', param.name);
        return res.status(400).json({
          success: false,
          message: `No dataType specified for parameter: ${param.name}`
        });
      }
    }
    
    // Log the control request
    console.log(chalk.cyan(`[deviceControlController] Control request for device ${deviceId}:`));
    console.log(chalk.cyan(`Parameters: ${JSON.stringify(parameters, null, 2)}`));
    
    // Process user permissions (can be expanded based on your auth system)
    if (req.user) {
      const hasPermission = req.user.roles?.some(role => 
        ['admin', 'engineer', 'operator'].includes(role.toLowerCase())
      );
      
      if (!hasPermission) {
        console.error(`[deviceControlController] User ${req.user.username || req.user.email} does not have control permission`);
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to control devices'
        });
      }
      
      // Add audit info
      console.log(chalk.blue(`[deviceControlController] Control request by user: ${req.user.username || req.user.email}`));
    }
    
    try {
      // Call the service to perform the control operation
      const result = await deviceService.controlDevice(deviceId, parameters, req);
      
      // Log the result summary
      const successCount = result.results.filter(r => r.success).length;
      const totalCount = result.results.length;
      
      console.log(chalk.green(`[deviceControlController] Control operation completed: ${successCount}/${totalCount} parameters set successfully`));
      
      // Return the result
      return res.status(200).json({
        success: result.success,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        timestamp: result.timestamp,
        summary: `${successCount}/${totalCount} parameters set successfully`,
        results: result.results
      });
    } catch (operationError: any) {
      // This handles any errors from the service layer
      console.error(chalk.red('[deviceControlController] Control operation error:'), operationError);
      
      // Determine the appropriate status code
      let statusCode = 500;
      if (operationError.message.includes('not found')) {
        statusCode = 404;
      } else if (operationError.message.includes('disabled')) {
        statusCode = 400;
      }
      
      // Return structured error response
      return res.status(statusCode).json({
        success: false,
        message: operationError.message,
        error: operationError.message,
        errorType: 'CONTROL_ERROR',
        deviceId
      });
    }
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[deviceControlController] Critical error:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[deviceControlController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the control request',
      error: error.message
    });
  }
};