import { Request, Response } from 'express';
import mongoose from 'mongoose';
import chalk from 'chalk';

import * as deviceService from '../services/device.service';
import * as setpointManagement from '../services/setpointManagement.service';

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
    // if (req.user) {
    //   const hasPermission = req.user.roles?.some(role => 
    //     ['admin', 'engineer', 'operator'].includes(role.toLowerCase())
    //   );
      
    //   if (!hasPermission) {
    //     console.error(`[deviceControlController] User ${req.user.username || req.user.email} does not have control permission`);
    //     return res.status(403).json({
    //       success: false,
    //       message: 'You do not have permission to control devices'
    //     });
    //   }
      
      // Add audit info
    //   console.log(chalk.blue(`[deviceControlController] Control request by user: ${req.user.username || req.user.email}`));
    // }
    
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



// @desc    Set a specific parameter value for a device
// @route   PUT /api/devices/:id/setpoint/:parameter
// @access  Private (Admin/Engineer/Operator)
export const setDeviceParameter = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[deviceController] Starting device parameter set operation'));
    
    const deviceId = req.params.id;
    const parameterName = req.params.parameter;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    if (!parameterName) {
      return res.status(400).json({ message: 'Parameter name is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get parameter value from request body
    const { value, dataType, registerIndex, byteOrder } = req.body;
    
    if (value === undefined || value === null) {
      console.error('[deviceController] No value provided');
      return res.status(400).json({
        success: false,
        message: 'No value provided for parameter'
      });
    }
    
    if (!dataType) {
      console.error('[deviceController] No dataType specified for parameter');
      return res.status(400).json({
        success: false,
        message: 'No dataType specified for parameter'
      });
    }
    
    if (registerIndex === undefined) {
      console.error('[deviceController] No registerIndex specified for parameter');
      return res.status(400).json({
        success: false,
        message: 'No registerIndex specified for parameter'
      });
    }
    
    // Create a control parameter
    const parameter = {
      name: parameterName,
      value,
      registerIndex,
      dataType,
      byteOrder
    };
    
    // Check if a schedule is active for this device and prevent manual setpoint changes
    try {
      const isScheduleActive = await setpointManagement.isScheduleModeActive(deviceId.toString(), req);
      
      if (isScheduleActive) {
        console.log(chalk.yellow(`[deviceController] Rejecting setpoint change because schedule is active for device ${deviceId}`));
        return res.status(403).json({
          success: false,
          message: 'Cannot modify setpoint while schedule is active. Disable schedule first to make manual changes.',
          isScheduleActive: true
        });
      }
    } catch (scheduleCheckError) {
      console.warn(chalk.yellow(`[deviceController] Error checking schedule status: ${scheduleCheckError}`));
      // Continue with the operation even if we couldn't check schedule status
    }
    
    console.log(chalk.cyan(`[deviceController] Setting parameter "${parameterName}" to ${value} for device ${deviceId}`));
    
    // Process user permissions (can be expanded based on your auth system)
    // if (req.user) {
    //   // Add audit info
    //   console.log(chalk.blue(`[deviceController] Parameter set request by user: ${req.user.username || req.user.email || req.user.id}`));
    // }
    
    try {
      // Call the service to perform the control operation
      // We reuse the existing controlDevice function but with a single parameter
      const result = await deviceService.controlDevice(deviceId, [parameter], req);
      
      // Get the specific result for our parameter
      const paramResult = result.results[0];
      
      if (paramResult.success) {
        console.log(chalk.green(`[deviceController] Successfully set parameter "${parameterName}" to ${value}`));
        
        return res.status(200).json({
          success: true,
          deviceId: result.deviceId,
          deviceName: result.deviceName,
          parameter: parameterName,
          value: value,
          message: paramResult.message || `Successfully set parameter "${parameterName}"`
        });
      } else {
        console.error(chalk.red(`[deviceController] Failed to set parameter "${parameterName}": ${paramResult.error}`));
        
        return res.status(400).json({
          success: false,
          deviceId: result.deviceId,
          deviceName: result.deviceName,
          parameter: parameterName,
          value: value,
          error: paramResult.error || 'Failed to set parameter',
          message: paramResult.message
        });
      }
    } catch (operationError: any) {
      // This handles any errors from the service layer
      console.error(chalk.red('[deviceController] Parameter set operation error:'), operationError);
      
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
        errorType: 'PARAMETER_SET_ERROR',
        deviceId,
        parameter: parameterName
      });
    }
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[deviceController] Critical error in setDeviceParameter:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the parameter set request',
      error: error.message
    });
  }
};





// @desc    Control multiple devices with a single request
// @route   POST /api/devices/batch-control
// @access  Private (Admin/Engineer/Operator)
export const batchControlDevices = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[deviceController] Starting batch device control operation'));
    
    // Get batch control commands from request body
    const { commands } = req.body;
    
    if (!commands || !Array.isArray(commands) || commands.length === 0) {
      console.error('[deviceController] No control commands provided');
      return res.status(400).json({
        success: false,
        message: 'No control commands provided'
      });
    }
    
    // Validate each command has a deviceId and parameters
    for (const command of commands) {
      if (!command.deviceId || !mongoose.Types.ObjectId.isValid(command.deviceId)) {
        console.error('[deviceController] Invalid device ID:', command.deviceId);
        return res.status(400).json({
          success: false,
          message: `Invalid device ID: ${command.deviceId}`
        });
      }
      
      if (!command.parameters || !Array.isArray(command.parameters) || command.parameters.length === 0) {
        console.error('[deviceController] No parameters provided for device:', command.deviceId);
        return res.status(400).json({
          success: false,
          message: `No parameters provided for device: ${command.deviceId}`
        });
      }
      
      // Validate each parameter
      for (const param of command.parameters) {
        if (!param.name || param.value === undefined || param.value === null || param.registerIndex === undefined) {
          console.error('[deviceController] Invalid parameter structure for device:', command.deviceId);
          return res.status(400).json({
            success: false,
            message: `Invalid parameter structure for device: ${command.deviceId}. Each parameter must have name, value, and registerIndex.`
          });
        }
        
        if (!param.dataType) {
          console.error(`[deviceController] No dataType specified for parameter ${param.name} of device ${command.deviceId}`);
          return res.status(400).json({
            success: false,
            message: `No dataType specified for parameter: ${param.name} of device ${command.deviceId}`
          });
        }
      }
    }
    
    // Log the control request
    console.log(chalk.cyan(`[deviceController] Batch control request for ${commands.length} devices`));
    
    // Process user permissions (can be expanded based on your auth system)
    if (req.user) {
      // Add audit info
      console.log(chalk.blue(`[deviceController] Batch control request by user: ${req.user.username || req.user.email || req.user.id}`));
    }
    
    // Process each command
    const results = [];
    
    for (const command of commands) {
      try {
        // Call the service to perform the control operation for each device
        const result = await deviceService.controlDevice(command.deviceId, command.parameters, req);
        
        // Add to results array
        results.push({
          deviceId: command.deviceId,
          deviceName: result.deviceName,
          success: result.success,
          results: result.results
        });
        
        console.log(chalk.green(`[deviceController] Successfully processed control command for device ${command.deviceId}`));
      } catch (deviceError: any) {
        console.error(chalk.red(`[deviceController] Error processing device ${command.deviceId}:`), deviceError);
        
        // Add error result
        results.push({
          deviceId: command.deviceId,
          deviceName: 'Unknown',
          success: false,
          error: deviceError.message,
          message: `Failed to process control command for device ${command.deviceId}: ${deviceError.message}`
        });
      }
    }
    
    // Calculate overall success
    const allSuccess = results.every(r => r.success);
    const anySuccess = results.some(r => r.success);
    
    // Create summary statistics
    const summary = {
      totalDevices: commands.length,
      successfulDevices: results.filter(r => r.success).length,
      failedDevices: results.filter(r => !r.success).length
    };
    
    // Return the results
    return res.status(200).json({
      success: anySuccess,
      allSuccess: allSuccess,
      summary,
      timestamp: new Date(),
      results
    });
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[deviceController] Critical error in batch control:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the batch control request',
      error: error.message
    });
  }
};

// New endpoint: Check if schedule is active for a device
// @desc    Check if a device has an active schedule
// @route   GET /api/devices/:id/schedule-status
// @access  Private (any authenticated user)
export const checkScheduleStatus = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[deviceControlController] Checking schedule status'));
    
    const deviceId = req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ 
        success: false,
        message: 'Device ID is required',
        isScheduleActive: false 
      });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceControlController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format',
        isScheduleActive: false
      });
    }
    
    // Get schedule status from setpointManagement service
    try {
      const isScheduleActive = await setpointManagement.isScheduleModeActive(deviceId.toString(), req);
      
      console.log(chalk.cyan(`[deviceControlController] Schedule status for device ${deviceId}: ${isScheduleActive ? 'ACTIVE' : 'INACTIVE'}`));
      
      // Return the schedule status
      return res.status(200).json({
        success: true,
        deviceId,
        isScheduleActive,
        timestamp: new Date()
      });
    } catch (scheduleCheckError: any) {
      console.warn(chalk.yellow(`[deviceControlController] Error checking schedule status: ${scheduleCheckError}`));
      
      // If we can't determine the schedule status, assume it's not active for safety
      return res.status(200).json({
        success: true,
        deviceId,
        isScheduleActive: false,
        warning: 'Could not accurately determine schedule status',
        timestamp: new Date()
      });
    }
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[deviceControlController] Critical error checking schedule status:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[deviceControlController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error checking schedule status',
      error: error.message,
      isScheduleActive: false // Default to not active for safety
    });
  }
};