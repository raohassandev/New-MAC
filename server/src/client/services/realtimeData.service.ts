/**
 * Realtime Data Service
 * This service provides functions for updating and managing realtime data collection
 */

import mongoose from 'mongoose';
import chalk from 'chalk';
import * as dataPollingService from './polling.service';
import { getDeviceModel } from './device.service';

/**
 * Updates the realtime data collection for a device after a control operation
 * @param deviceId Device ID that was controlled
 * @param requestContext Express request context (needed for model access)
 * @returns Success status and updated data
 */
export const updateRealtimeDataAfterControl = async (
  deviceId: string,
  requestContext: any
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    console.log(chalk.cyan(`[realtimeDataService] Updating realtime data after control operation for device ${deviceId}`));
    
    // Validate deviceId
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[realtimeDataService] Invalid device ID format: ${deviceId}`);
      return {
        success: false,
        message: 'Invalid device ID format'
      };
    }

    // Get the device model
    const DeviceModel = await getDeviceModel(requestContext);
    
    // Look up the device
    const device = await DeviceModel.findById(deviceId);
    
    // Get the device name from the device or fallback to the ID
    const deviceName = device ? device.name : `Device ${deviceId}`;

    // Poll the device directly to get fresh data
    console.log(chalk.cyan(`[realtimeDataService] Polling device ${deviceId} for fresh data`));
    let realtimeData;
    try {
      realtimeData = await dataPollingService.pollDevice(deviceId, requestContext);
      
      if (!realtimeData || !realtimeData.readings || realtimeData.readings.length === 0) {
        console.warn(chalk.yellow(`[realtimeDataService] No data returned from device poll`));
        return {
          success: false,
          message: 'No data available for device after polling'
        };
      }
      
      // Check for control bit and ensure schedule bit consistency
      // This is critical to make sure schedule bits are properly synced with control bits
      console.log(chalk.cyan(`[realtimeDataService] Checking for control/schedule bit sync in readings`));
      const readings = realtimeData.readings;
      
      // Find control bit (looking for any variation of "control" in the name, case insensitive)
      const controlBitReading = readings.find(r => 
        r.name && typeof r.name === 'string' && 
        r.name.toLowerCase().includes('control')
      );
      
      // Find schedule bit (looking for any variation of "schedule" in the name, case insensitive)
      const scheduleBitReading = readings.find(r => 
        r.name && typeof r.name === 'string' && 
        r.name.toLowerCase().includes('schedule')
      );
      
      // If we found both control and schedule bits, enforce the rule:
      // If control bit is OFF (false), schedule bit MUST be OFF (false) too
      if (controlBitReading && scheduleBitReading) {
        console.log(chalk.cyan(
          `[realtimeDataService] Found control bit (${controlBitReading.value}) and ` +
          `schedule bit (${scheduleBitReading.value})`
        ));
        
        // Force schedule bit to OFF if control bit is OFF
        if (controlBitReading.value === false && scheduleBitReading.value === true) {
          console.log(chalk.yellow(
            `[realtimeDataService] Inconsistency detected: Control bit is OFF but schedule bit is ON. ` +
            `Forcing schedule bit to OFF for consistency.`
          ));
          scheduleBitReading.value = false;
          
          // Also attempt a physical device write to ensure consistency
          // This is done asynchronously and we don't wait for it
          try {
            // Dynamic import to avoid circular dependencies
            import('../services/coilControl.service').then(coilControlService => {
              const scheduleAddress = 
                typeof scheduleBitReading.address === 'number' ? 
                scheduleBitReading.address : 
                (typeof scheduleBitReading.registerIndex === 'number' ? 
                scheduleBitReading.registerIndex : null);
                
              if (scheduleAddress !== null) {
                console.log(chalk.cyan(`[realtimeDataService] Writing schedule bit OFF to device at address ${scheduleAddress}`));
                coilControlService.controlCoilRegister(
                  deviceId,
                  scheduleAddress,
                  false,
                  requestContext,
                  'schedule'
                ).catch(writeError => {
                  console.error(chalk.red(`[realtimeDataService] Error writing schedule bit: ${writeError}`));
                });
              }
            }).catch(importError => {
              console.error(chalk.red(`[realtimeDataService] Error importing coilControl service: ${importError}`));
            });
          } catch (syncError) {
            console.error(chalk.red(`[realtimeDataService] Error during control/schedule sync: ${syncError}`));
            // Continue anyway - we've already fixed the in-memory value
          }
        }
      }
    } catch (pollError) {
      console.error(chalk.red(`[realtimeDataService] Error polling device: ${pollError}`));
      return {
        success: false,
        message: `Error polling device: ${pollError instanceof Error ? pollError.message : String(pollError)}`
      };
    }

    // Get the appropriate RealtimeData model
    let RealtimeDataModel;
    if (requestContext.app?.locals?.clientModels?.RealtimeData) {
      RealtimeDataModel = requestContext.app.locals.clientModels.RealtimeData;
    } else {
      // Dynamic import to avoid circular dependencies
      const { default: RealtimeData } = await import('../models/realtimeData.model');
      RealtimeDataModel = RealtimeData;
    }
    
    // Use findOneAndUpdate with upsert to handle both creation and updates atomically
    console.log(chalk.cyan(`[realtimeDataService] Updating realtime data in database for device ${deviceId}`));
    
    const result = await RealtimeDataModel.findOneAndUpdate(
      { deviceId },
      { 
        $set: {
          deviceName,
          readings: realtimeData.readings,
          timestamp: realtimeData.timestamp || new Date(),
          lastUpdated: new Date()
        }
      },
      { 
        upsert: true,      // Create document if it doesn't exist
        new: true,         // Return the updated document
        runValidators: true // Ensure data meets schema validation
      }
    );
    
    const isNewRecord = !result._id || result.isNew;
    
    console.log(chalk.green(
      `[realtimeDataService] Realtime data ${isNewRecord ? 'created' : 'updated'} successfully for device ${deviceId}`
    ));
    
    return {
      success: true,
      message: `Realtime data ${isNewRecord ? 'created' : 'updated'} successfully`,
      data: result
    };
  } catch (error) {
    console.error(chalk.red(`[realtimeDataService] Error updating realtime data: ${error}`));
    return {
      success: false,
      message: `Error updating realtime data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Export the service functions
export default {
  updateRealtimeDataAfterControl
};