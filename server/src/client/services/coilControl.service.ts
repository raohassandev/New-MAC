/**
 * Coil Register Control Service
 * This service provides functions for controlling and reading coil registers
 */

import mongoose from 'mongoose';
import ModbusRTU from 'modbus-serial';
import chalk from 'chalk';
import { IDevice, IConnectionSetting } from '../models/device.model';
import { 
  safeCloseModbusClient, 
  writeCoilWithTimeout, 
  writeMultipleCoilsWithTimeout,
  readCoilsWithTimeout
} from '../utils/modbusHelper';
import { DatabaseModelManager } from '../utils/databaseModelManager';
import { ModbusConnectionManager } from '../utils/modbusConnectionManager';

/**
 * Control coil register for a device
 * @param deviceId Device ID to control
 * @param coilAddress Coil address to write to
 * @param value Boolean value to write (true = ON, false = OFF)
 * @param requestContext Express request context
 * @param coilType Type of coil register (control, schedule, status)
 * @returns Result of the operation
 */
export const controlCoilRegister = async (
  deviceId: string,
  coilAddress: number,
  value: boolean,
  requestContext: any,
  coilType: 'control' | 'schedule' | 'status' = 'control'
) => {
  let connection: any = null;
  let deviceName = '';
  
  try {
    console.log(chalk.cyan(`[coilControlService] Starting coil register control operation for device ${deviceId}`));
    console.log(chalk.cyan(`[coilControlService] Setting ${coilType} coil at address ${coilAddress} to ${value}`));
    
    // Validate deviceId
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      throw new Error('Invalid device ID format');
    }
    
    // Use the helper to get the correct device model
    const DeviceModel = await DatabaseModelManager.getDeviceModel(requestContext);
    
    // Find the device
    const device = await DeviceModel.findById(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    deviceName = device.name || 'Unknown Device';
    
    // Check if device is enabled
    if (!device.enabled) {
      throw new Error(`Device "${deviceName}" is currently disabled`);
    }
    
    // Use the unified connection manager
    connection = await ModbusConnectionManager.connectLegacy(device);
    const client = connection.client;
    
    // Write to the coil
    const success = await writeCoilWithTimeout(client, coilAddress, value);
    
    if (!success) {
      throw new Error(`Failed to write coil at address ${coilAddress}`);
    }
    
    // Create result object
    const result = {
      success: true,
      deviceId,
      deviceName,
      timestamp: new Date(),
      coilType,
      coilAddress,
      value,
      message: `Successfully set ${coilType} coil at address ${coilAddress} to ${value}`
    };

    // Emit WebSocket event for real-time updates
    try {
      const websocketManager = (global as any).websocketManager;
      if (websocketManager && websocketManager.isAvailable()) {
        const success = websocketManager.emitCoilUpdate({
          deviceId,
          deviceName,
          coilAddress,
          coilType,
          value,
          timestamp: result.timestamp
        });
        
        if (success) {
          console.log(chalk.green(`[WebSocket] Emitted coil update for device ${deviceId}, coil ${coilAddress}`));
        }
      } else {
        console.warn(chalk.yellow(`[WebSocket] WebSocket manager not available for coil update ${deviceId}:${coilAddress}`));
      }
    } catch (wsError) {
      console.warn(chalk.yellow('[WebSocket] Failed to emit coil update:', wsError));
    }
    
    // Create event log entry
    try {
      const eventMessage = `User turned ${coilType === 'schedule' ? 'Schedule' : `coil ${coilAddress}`} ${value ? 'ON' : 'OFF'}`;
      
      // Get EventLog model from request context
      const EventLogModel = requestContext.app?.locals?.clientModels?.EventLog;
      if (EventLogModel) {
        const eventLog = new EventLogModel({
          type: 'info',
          message: eventMessage,
          deviceId: device._id,
          deviceName: deviceName,
          userId: requestContext.user?.id || requestContext.user?._id,
          userName: requestContext.user?.name || requestContext.user?.username || requestContext.user?.email,
          timestamp: new Date()
        });
        await eventLog.save();
        console.log(chalk.green('[coilControlService] Event log created:', eventMessage));
      } else {
        console.warn(chalk.yellow('[coilControlService] EventLog model not available in request context'));
      }
    } catch (eventError) {
      console.error(chalk.yellow('[coilControlService] Failed to create event log:', eventError));
      // Don't throw error, just log it - the coil operation was successful
    }
    
    // Handle Schedule coil state changes (on/off)
    // Handle case-insensitive comparison for 'schedule' type
    if (coilType.toLowerCase() === 'schedule') {
      console.log(chalk.yellow(`[coilControlService] Schedule coil state changed to ${value}, updating device schedule`));
      try {
        // Import schedule service 
        const { ScheduleService } = await import('./schedule.service');
        
        if (value === false) {
          // Schedule bit turned OFF - deactivate the schedule
          await ScheduleService.deactivateDeviceSchedule(deviceId, requestContext);
          console.log(chalk.green(`[coilControlService] Device schedule deactivated successfully`));
          result.message += '. Device schedule has been deactivated.';
        } else {
          // Schedule bit turned ON - reactivate the schedule if one exists
          console.log(chalk.blue(`[coilControlService] Checking for existing schedule for device ${deviceId}`));
          const existingSchedule = await ScheduleService.getDeviceSchedule(deviceId, requestContext);
          console.log(chalk.blue(`[coilControlService] Existing schedule:`, existingSchedule ? `Found (active: ${existingSchedule.active})` : 'Not found'));
          
          if (existingSchedule) {
            // Add bypassScheduleBitCheck flag to the request object directly
            (requestContext as any).bypassScheduleBitCheck = true;
            const updates = { active: true };
            // Use system user ID for coil-triggered updates
            const systemUserId = '000000000000000000000000';
            console.log(chalk.blue(`[coilControlService] Attempting to reactivate schedule for device ${deviceId}`));
            const updated = await ScheduleService.updateDeviceSchedule(deviceId, updates, systemUserId, requestContext);
            console.log(chalk.green(`[coilControlService] Device schedule reactivated successfully. Updated:`, updated ? 'Yes' : 'No'));
            result.message += '. Device schedule has been reactivated.';
          } else {
            console.log(chalk.yellow(`[coilControlService] No existing schedule to reactivate for device ${deviceId}`));
            result.message += '. No existing schedule to reactivate.';
          }
        }
      } catch (scheduleError) {
        console.error(chalk.red(`[coilControlService] Failed to update schedule state: ${scheduleError instanceof Error ? scheduleError.message : String(scheduleError)}`));
        // Don't throw error, just log it - the coil operation was successful
      }
    }
    
    return result;
  } catch (error) {
    console.error(chalk.red(`[coilControlService] Coil control error: ${error instanceof Error ? error.message : String(error)}`));
    
    // Return error result
    const errorResult = {
      success: false,
      deviceId,
      deviceName,
      timestamp: new Date(),
      coilType,
      coilAddress,
      value,
      error: error instanceof Error ? error.message : String(error),
      message: `Failed to set ${coilType} coil at address ${coilAddress}: ${error instanceof Error ? error.message : String(error)}`
    };
    
    throw errorResult;
  } finally {
    // Always close the connection
    if (connection) {
      try {
        await ModbusConnectionManager.disconnect(connection);
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};

/**
 * Control multiple coil registers for a device
 * @param deviceId Device ID to control
 * @param coilData Array of coil configuration objects
 * @param requestContext Express request context
 * @returns Result of the operation
 */
export const controlMultipleCoilRegisters = async (
  deviceId: string,
  coilData: Array<{
    address: number;
    value: boolean;
    type: 'control' | 'schedule' | 'status';
  }>,
  requestContext: any
) => {
  let connection: any = null;
  let deviceName = '';
  
  try {
    console.log(chalk.cyan(`[coilControlService] Starting multiple coil register control operation for device ${deviceId}`));
    
    // Validate deviceId
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      throw new Error('Invalid device ID format');
    }
    
    // Validate coil data
    if (!coilData || !Array.isArray(coilData) || coilData.length === 0) {
      throw new Error('No coil data provided');
    }
    
    // Use the helper to get the correct device model
    const DeviceModel = await DatabaseModelManager.getDeviceModel(requestContext);
    
    // Find the device
    const device = await DeviceModel.findById(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    deviceName = device.name || 'Unknown Device';
    
    // Check if device is enabled
    if (!device.enabled) {
      throw new Error(`Device "${deviceName}" is currently disabled`);
    }
    
    // Use the unified connection manager
    connection = await ModbusConnectionManager.connectLegacy(device);
    const client = connection.client;
    
    // Process each coil
    const results = [];
    
    for (const coil of coilData) {
      try {
        console.log(chalk.cyan(`[coilControlService] Setting ${coil.type} coil at address ${coil.address} to ${coil.value}`));
        
        // Write to the coil
        const success = await writeCoilWithTimeout(client, coil.address, coil.value);
        
        if (!success) {
          throw new Error(`Failed to write coil at address ${coil.address}`);
        }
        
        // Add to results
        results.push({
          success: true,
          coilType: coil.type,
          coilAddress: coil.address,
          value: coil.value,
          message: `Successfully set ${coil.type} coil at address ${coil.address} to ${coil.value}`
        });
      } catch (coilError) {
        // Add error to results but continue with other coils
        results.push({
          success: false,
          coilType: coil.type,
          coilAddress: coil.address,
          value: coil.value,
          error: coilError instanceof Error ? coilError.message : String(coilError),
          message: `Failed to set ${coil.type} coil at address ${coil.address}: ${coilError instanceof Error ? coilError.message : String(coilError)}`
        });
      }
    }
    
    // Create result object
    const result = {
      success: results.some(r => r.success), // Success if at least one coil was set successfully
      allSuccess: results.every(r => r.success), // All success if all coils were set successfully
      deviceId,
      deviceName,
      timestamp: new Date(),
      results
    };
    
    // Check if any Schedule coils were changed, and update schedule state accordingly
    // Use case-insensitive comparison for coil type
    const scheduleCoilChanges = results.filter(r => 
      r.success && r.coilType.toLowerCase() === 'schedule'
    );
    
    if (scheduleCoilChanges.length > 0) {
      console.log(chalk.yellow(`[coilControlService] Schedule coil state changed in batch, updating device schedule`));
      try {
        // Import schedule service
        const { ScheduleService } = await import('./schedule.service');
        
        // Process schedule state changes (take the last value if multiple)
        const lastScheduleChange = scheduleCoilChanges[scheduleCoilChanges.length - 1];
        
        if (lastScheduleChange.value === false) {
          // Schedule bit turned OFF - deactivate the schedule
          await ScheduleService.deactivateDeviceSchedule(deviceId, requestContext);
          console.log(chalk.green(`[coilControlService] Device schedule deactivated successfully`));
          // Update the relevant result messages
          results.forEach(r => {
            if (r.coilType.toLowerCase() === 'schedule' && r.value === false && r.success) {
              r.message += '. Device schedule has been deactivated.';
            }
          });
        } else {
          // Schedule bit turned ON - reactivate the schedule if one exists
          console.log(chalk.blue(`[coilControlService] Batch: Checking for existing schedule for device ${deviceId}`));
          const existingSchedule = await ScheduleService.getDeviceSchedule(deviceId, requestContext);
          console.log(chalk.blue(`[coilControlService] Batch: Existing schedule:`, existingSchedule ? `Found (active: ${existingSchedule.active})` : 'Not found'));
          
          if (existingSchedule) {
            // Add bypassScheduleBitCheck flag to the request object directly
            (requestContext as any).bypassScheduleBitCheck = true;
            const updates = { active: true };
            // Use system user ID for coil-triggered updates
            const systemUserId = '000000000000000000000000';
            console.log(chalk.blue(`[coilControlService] Batch: Attempting to reactivate schedule for device ${deviceId}`));
            const updated = await ScheduleService.updateDeviceSchedule(deviceId, updates, systemUserId, requestContext);
            console.log(chalk.green(`[coilControlService] Batch: Device schedule reactivated successfully. Updated:`, updated ? 'Yes' : 'No'));
            // Update the relevant result messages
            results.forEach(r => {
              if (r.coilType.toLowerCase() === 'schedule' && r.value === true && r.success) {
                r.message += '. Device schedule has been reactivated.';
              }
            });
          } else {
            console.log(chalk.yellow(`[coilControlService] Batch: No existing schedule to reactivate for device ${deviceId}`));
            results.forEach(r => {
              if (r.coilType.toLowerCase() === 'schedule' && r.value === true && r.success) {
                r.message += '. No existing schedule to reactivate.';
              }
            });
          }
        }
      } catch (scheduleError) {
        console.error(chalk.red(`[coilControlService] Failed to update schedule state: ${scheduleError instanceof Error ? scheduleError.message : String(scheduleError)}`));
        // Don't throw error, just log it - the coil operations were successful
      }
    }
    
    return result;
  } catch (error) {
    console.error(chalk.red(`[coilControlService] Multiple coil control error: ${error instanceof Error ? error.message : String(error)}`));
    
    // Return error result
    const errorResult = {
      success: false,
      deviceId,
      deviceName,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : String(error),
      message: `Failed to control multiple coils: ${error instanceof Error ? error.message : String(error)}`
    };
    
    throw errorResult;
  } finally {
    // Always close the connection
    if (connection) {
      try {
        await ModbusConnectionManager.disconnect(connection);
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};

/**
 * Read coil registers from a device
 * @param deviceId Device ID to read from
 * @param startAddress Starting coil address to read from
 * @param count Number of coils to read
 * @param coilType Type of coil register (control, schedule, status)
 * @param requestContext Express request context
 * @returns Result of the operation with coil values
 */
export const readCoilRegisters = async (
  deviceId: string,
  startAddress: number,
  count: number,
  coilType: 'control' | 'schedule' | 'status' = 'control',
  requestContext: any
) => {
  let connection: any = null;
  let deviceName = '';
  
  try {
    console.log(chalk.cyan(`[coilControlService] Starting coil register read operation for device ${deviceId}`));
    console.log(chalk.cyan(`[coilControlService] Reading ${count} ${coilType} coils starting at address ${startAddress}`));
    
    // Validate deviceId
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      throw new Error('Invalid device ID format');
    }
    
    // Use the helper to get the correct device model
    const DeviceModel = await DatabaseModelManager.getDeviceModel(requestContext);
    
    // Find the device
    const device = await DeviceModel.findById(deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    deviceName = device.name || 'Unknown Device';
    
    // Check if device is enabled
    if (!device.enabled) {
      throw new Error(`Device "${deviceName}" is currently disabled`);
    }
    
    // Use the unified connection manager
    connection = await ModbusConnectionManager.connectLegacy(device);
    const client = connection.client;
    
    // Read the coils
    const response = await readCoilsWithTimeout(client, startAddress, count);
    
    if (!response || !response.data) {
      throw new Error(`Failed to read coils starting at address ${startAddress}`);
    }
    
    // Process the result
    const coilValues = response.data as boolean[];
    
    // Map results to include address information
    const coilResults = coilValues.map((value, index) => ({
      address: startAddress + index,
      value,
      type: coilType
    }));
    
    // Create result object
    const result = {
      success: true,
      deviceId,
      deviceName,
      timestamp: new Date(),
      coilType,
      startAddress,
      count,
      coils: coilResults,
      message: `Successfully read ${count} ${coilType} coils starting at address ${startAddress}`
    };
    
    return result;
  } catch (error) {
    console.error(chalk.red(`[coilControlService] Coil read error: ${error instanceof Error ? error.message : String(error)}`));
    
    // Return error result
    const errorResult = {
      success: false,
      deviceId,
      deviceName,
      timestamp: new Date(),
      coilType,
      startAddress,
      count,
      error: error instanceof Error ? error.message : String(error),
      message: `Failed to read ${coilType} coils starting at address ${startAddress}: ${error instanceof Error ? error.message : String(error)}`
    };
    
    throw errorResult;
  } finally {
    // Always close the connection
    if (connection) {
      try {
        await ModbusConnectionManager.disconnect(connection);
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};