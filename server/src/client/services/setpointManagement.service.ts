/**
 * Setpoint Management Service
 * This service handles the logic for selecting between schedule setpoints and manual setpoints
 * based on the schedule bit state.
 */

import mongoose from 'mongoose';
import chalk from 'chalk';
import * as dataPollingService from './polling.service';
import { getDeviceModel } from './device.service';
import EventLog, { IEventLog } from '../models/eventLog.model';

// Interface for setpoint configuration
export interface SetpointConfig {
  address: number;
  value: number;
  name: string;
  dataType?: string;
  source: 'schedule' | 'manual' | 'fallback';
}

// Cache to store last known setpoint values for comparison
const setpointCache = new Map<string, Map<number, SetpointConfig>>();

// Keep track of active transitions
const activeTransitions = new Map<string, Map<number, {
  startTime: number;
  startValue: number;
  targetValue: number;
  duration: number;
}>>();

/**
 * Get the appropriate setpoint based on schedule status
 * @param deviceId Device ID
 * @param address Register address to get setpoint for
 * @param scheduleSetpoint The setpoint from the schedule (if available)
 * @param manualSetpoint The manually configured setpoint
 * @param scheduleActive Whether schedule mode is active (true) or manual mode (false)
 * @param gradualTransition Whether to use gradual transition for this setpoint
 * @param transitionDuration Duration in ms for gradual transition (default 60000 = 1 minute)
 * @returns The appropriate setpoint value
 */
export async function getActiveSetpoint(
  deviceId: string,
  address: number,
  scheduleSetpoint: number | null,
  manualSetpoint: number,
  scheduleActive: boolean,
  requestContext: any,
  gradualTransition = false,
  transitionDuration = 60000
): Promise<SetpointConfig> {
  try {
    // Create device-specific cache if it doesn't exist
    if (!setpointCache.has(deviceId)) {
      setpointCache.set(deviceId, new Map<number, SetpointConfig>());
    }
    
    const deviceCache = setpointCache.get(deviceId)!;
    
    // Get parameter name from device configuration if available
    let parameterName = `Parameter at address ${address}`;
    
    try {
      const DeviceModel = await getDeviceModel(requestContext);
      const device = await DeviceModel.findById(deviceId);
      
      if (device && device.dataPoints) {
        // Look for the parameter in data points
        for (const dataPoint of device.dataPoints) {
          if (dataPoint.parser && dataPoint.parser.parameters) {
            const found = dataPoint.parser.parameters.find((p: any) => 
              (p.address === address || p.registerIndex === address)
            );
            if (found) {
              parameterName = found.name || parameterName;
              break;
            }
          }
        }
      }
    } catch (nameError) {
      console.warn(chalk.yellow(`[setpointManagement] Error getting parameter name: ${nameError}`));
      // Continue with default name
    }
    
    // Determine which setpoint to use based on schedule status
    let targetSetpoint: number;
    let source: 'schedule' | 'manual' | 'fallback';
    
    if (scheduleActive && scheduleSetpoint !== null) {
      // Use schedule setpoint
      targetSetpoint = scheduleSetpoint;
      source = 'schedule';
      console.log(chalk.blue(`[setpointManagement] Using SCHEDULE setpoint for ${parameterName}: ${targetSetpoint}`));
    } else if (scheduleActive && scheduleSetpoint === null) {
      // Fallback to manual if schedule is active but no schedule setpoint available
      targetSetpoint = manualSetpoint;
      source = 'fallback';
      console.log(chalk.yellow(`[setpointManagement] FALLBACK to manual setpoint for ${parameterName} (no schedule value): ${targetSetpoint}`));
    } else {
      // Use manual setpoint
      targetSetpoint = manualSetpoint;
      source = 'manual';
      console.log(chalk.blue(`[setpointManagement] Using MANUAL setpoint for ${parameterName}: ${targetSetpoint}`));
    }
    
    // Check if a transition is needed for this setpoint
    if (gradualTransition) {
      const now = Date.now();
      
      // Create transitions map for device if it doesn't exist
      if (!activeTransitions.has(deviceId)) {
        activeTransitions.set(deviceId, new Map());
      }
      
      const deviceTransitions = activeTransitions.get(deviceId)!;
      
      // Check if there's an existing cached value
      if (deviceCache.has(address)) {
        const cachedSetpoint = deviceCache.get(address)!;
        
        // If there's a significant change, create a transition
        if (Math.abs(cachedSetpoint.value - targetSetpoint) > 0.01) {
          console.log(chalk.blue(`[setpointManagement] Starting transition for ${parameterName} from ${cachedSetpoint.value} to ${targetSetpoint}`));
          
          // Record the transition start
          deviceTransitions.set(address, {
            startTime: now,
            startValue: cachedSetpoint.value,
            targetValue: targetSetpoint,
            duration: transitionDuration
          });
          
          // Log the transition
          logTransition(deviceId, parameterName, source, cachedSetpoint.value, targetSetpoint, requestContext);
        }
      }
      
      // Check if there's an active transition for this address
      if (deviceTransitions.has(address)) {
        const transition = deviceTransitions.get(address)!;
        const elapsed = now - transition.startTime;
        
        if (elapsed < transition.duration) {
          // Calculate the interpolated value
          const progress = elapsed / transition.duration;
          const interpolatedValue = transition.startValue + (transition.targetValue - transition.startValue) * progress;
          
          console.log(chalk.blue(`[setpointManagement] Transition progress ${Math.round(progress * 100)}% for ${parameterName}: ${interpolatedValue.toFixed(2)}`));
          
          // Use the interpolated value for now
          const setpointConfig: SetpointConfig = {
            address,
            value: interpolatedValue,
            name: parameterName,
            source: source,
          };
          
          // Store in cache
          deviceCache.set(address, setpointConfig);
          
          return setpointConfig;
        } else {
          // Transition is complete, remove it
          deviceTransitions.delete(address);
        }
      }
    }
    
    // Create the setpoint config
    const setpointConfig: SetpointConfig = {
      address,
      value: targetSetpoint,
      name: parameterName,
      source: source,
    };
    
    // Check if this is a new value and log if it changed
    if (deviceCache.has(address)) {
      const previousSetpoint = deviceCache.get(address)!;
      if (Math.abs(previousSetpoint.value - targetSetpoint) > 0.01 || previousSetpoint.source !== source) {
        logSetpointChange(deviceId, parameterName, source, previousSetpoint.value, targetSetpoint, requestContext);
      }
    } else {
      // First time seeing this setpoint, log it
      logSetpointChange(deviceId, parameterName, source, null, targetSetpoint, requestContext);
    }
    
    // Store in cache
    deviceCache.set(address, setpointConfig);
    
    return setpointConfig;
  } catch (error) {
    console.error(chalk.red(`[setpointManagement] Error determining active setpoint: ${error}`));
    
    // Return the manual setpoint as a fallback in case of error
    return {
      address,
      value: manualSetpoint,
      name: `Parameter at address ${address}`,
      source: 'fallback'
    };
  }
}

/**
 * Get the currently active setpoint mode for a device
 * @param deviceId Device ID
 * @param requestContext Request context
 * @returns Whether schedule mode is active (true) or manual mode (false)
 */
export async function isScheduleModeActive(deviceId: string, requestContext: any): Promise<boolean> {
  try {
    // Get the latest control and schedule bit status
    const deviceReading = await dataPollingService.getRealtimeData(deviceId);
    
    if (!deviceReading || !deviceReading.readings) {
      console.warn(chalk.yellow(`[setpointManagement] No realtime data available for device ${deviceId}`));
      return false; // Default to manual mode if no data
    }
    
    // Find control bit and schedule bit
    const controlBitReading = deviceReading.readings.find(r => 
      r.name && typeof r.name === 'string' && 
      r.name.toLowerCase().includes('control')
    );
    
    const scheduleBitReading = deviceReading.readings.find(r => 
      r.name && typeof r.name === 'string' && 
      r.name.toLowerCase().includes('schedule')
    );
    
    // Schedule mode is active when both control bit and schedule bit are ON
    if (controlBitReading && scheduleBitReading) {
      const isControlCentral = Boolean(controlBitReading.value);
      const isScheduleOn = Boolean(scheduleBitReading.value);
      
      const isActive = isControlCentral && isScheduleOn;
      console.log(chalk.blue(
        `[setpointManagement] Schedule mode active check: ` +
        `Control=${isControlCentral}, Schedule=${isScheduleOn}, Active=${isActive}`
      ));
      
      return isActive;
    }
    
    console.warn(chalk.yellow(`[setpointManagement] Control or schedule bit not found for device ${deviceId}`));
    return false; // Default to manual mode if bits not found
  } catch (error) {
    console.error(chalk.red(`[setpointManagement] Error checking schedule mode: ${error}`));
    return false; // Default to manual mode on error
  }
}

/**
 * Apply the appropriate setpoint based on schedule status
 * @param deviceId Device ID
 * @param address Register address to set
 * @param scheduleSetpoint The setpoint from the schedule (if available)
 * @param manualSetpoint The manually configured setpoint
 * @param requestContext Request context for API access
 * @param gradualTransition Whether to use gradual transition
 * @returns Result of the operation
 */
export async function applySetpoint(
  deviceId: string,
  address: number,
  scheduleSetpoint: number | null,
  manualSetpoint: number,
  requestContext: any,
  gradualTransition = false
): Promise<{success: boolean, message: string, value: number, source: string}> {
  try {
    // Determine if schedule mode is active
    const scheduleActive = await isScheduleModeActive(deviceId, requestContext);
    
    // Get the appropriate setpoint
    const setpointConfig = await getActiveSetpoint(
      deviceId,
      address,
      scheduleSetpoint,
      manualSetpoint,
      scheduleActive,
      requestContext,
      gradualTransition
    );
    
    // Apply the setpoint via the device.service
    try {
      // Dynamic import to avoid circular dependencies
      const deviceService = await import('./device.service');
      
      // Get device details for parameter name
      const DeviceModel = await getDeviceModel(requestContext);
      const device = await DeviceModel.findById(deviceId);
      
      // Find the parameter name
      let parameterName = `Parameter at address ${address}`;
      let dataType = 'FLOAT32';
      
      if (device && device.dataPoints) {
        // Look for the parameter in data points
        for (const dataPoint of device.dataPoints) {
          if (dataPoint.parser && dataPoint.parser.parameters) {
            const found = dataPoint.parser.parameters.find((p: any) => 
              (p.address === address || p.registerIndex === address)
            );
            if (found) {
              parameterName = found.name || parameterName;
              dataType = found.dataType || dataType;
              break;
            }
          }
        }
      }
      
      // Prepare parameter object for write function
      // Connect to the Modbus device
      const { connectToModbusDevice } = await import('./device.service');
      
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }
      
      const connectionInfo = await connectToModbusDevice(device);
      
      try {
        // Create parameter object
        const parameter = {
          name: parameterName,
          registerIndex: address,
          value: setpointConfig.value,
          dataType: dataType
        };
        
        // Write the value
        const result = await deviceService.writeParameterValue(connectionInfo.client, parameter);
      
        if (result.success) {
          console.log(chalk.green(
            `[setpointManagement] Successfully applied ${setpointConfig.source.toUpperCase()} ` +
            `setpoint to ${parameterName}: ${setpointConfig.value}`
          ));
          
          return {
            success: true,
            message: `Applied ${setpointConfig.source} setpoint successfully`,
            value: setpointConfig.value,
            source: setpointConfig.source
          };
        } else {
          throw new Error(result.message || 'Unknown error applying setpoint');
        }
      } catch (writeError) {
        console.error(chalk.red(`[setpointManagement] Error writing setpoint: ${writeError}`));
        throw writeError;
      } finally {
        // Close the client connection
        try {
          if (connectionInfo && connectionInfo.client && connectionInfo.client.close) {
            await connectionInfo.client.close();
          }
        } catch (closeError) {
          console.error(`[setpointManagement] Error closing Modbus client: ${closeError}`);
        }
      }
    } catch (error) {
      console.error(chalk.red(`[setpointManagement] Error applying setpoint: ${error}`));
      throw error;
    }
  } catch (error) {
    console.error(chalk.red(`[setpointManagement] Error applying setpoint: ${error}`));
    
    return {
      success: false,
      message: `Error applying setpoint: ${error instanceof Error ? error.message : String(error)}`,
      value: manualSetpoint, // Return manual setpoint on error
      source: 'error'
    };
  }
}

/**
 * Log a setpoint change to the event log
 */
async function logSetpointChange(
  deviceId: string,
  parameterName: string,
  source: string,
  oldValue: number | null,
  newValue: number,
  requestContext: any
): Promise<void> {
  try {
    // Get the appropriate EventLog model
    let EventLogModel = EventLog;
    if (requestContext?.app?.locals?.clientModels?.EventLog) {
      EventLogModel = requestContext.app.locals.clientModels.EventLog;
    }
    
    // Create message based on type of change
    let message = '';
    if (oldValue === null) {
      message = `Initial ${source} setpoint for ${parameterName}: ${newValue}`;
    } else {
      message = `${parameterName} setpoint changed from ${oldValue} to ${newValue} (${source} mode)`;
    }
    
    // Create the event log
    const eventLog: Partial<IEventLog> = {
      type: 'info',
      message,
      deviceId: parseInt(deviceId, 10) || undefined,
      timestamp: new Date(),
      userId: requestContext?.user?._id || requestContext?.user?.id
    };
    
    // Save to database
    await new EventLogModel(eventLog).save();
    
    console.log(chalk.blue(`[setpointManagement] Logged setpoint change: ${message}`));
  } catch (error) {
    console.warn(chalk.yellow(`[setpointManagement] Error logging setpoint change: ${error}`));
    // Don't throw, just log the warning
  }
}

/**
 * Log a transition between setpoint modes
 */
async function logTransition(
  deviceId: string,
  parameterName: string,
  source: string,
  startValue: number,
  targetValue: number,
  requestContext: any
): Promise<void> {
  try {
    // Get the appropriate EventLog model
    let EventLogModel = EventLog;
    if (requestContext?.app?.locals?.clientModels?.EventLog) {
      EventLogModel = requestContext.app.locals.clientModels.EventLog;
    }
    
    // Create the message
    const message = `Starting gradual transition for ${parameterName} from ${startValue} to ${targetValue} (${source} mode)`;
    
    // Create the event log
    const eventLog: Partial<IEventLog> = {
      type: 'info',
      message,
      deviceId: parseInt(deviceId, 10) || undefined,
      timestamp: new Date(),
      userId: requestContext?.user?._id || requestContext?.user?.id
    };
    
    // Save to database
    await new EventLogModel(eventLog).save();
    
    console.log(chalk.blue(`[setpointManagement] Logged transition start: ${message}`));
  } catch (error) {
    console.warn(chalk.yellow(`[setpointManagement] Error logging transition: ${error}`));
    // Don't throw, just log the warning
  }
}

/**
 * Initialize a periodic task to update in-progress transitions
 * This ensures setpoints continue to adjust even without API calls
 */
export function initializeTransitionUpdater(): void {
  // Run every 5 seconds
  setInterval(async () => {
    try {
      for (const [deviceId, transitions] of activeTransitions.entries()) {
        if (transitions.size > 0) {
          console.log(chalk.blue(`[setpointManagement] Processing ${transitions.size} active transitions for device ${deviceId}`));
          
          // Get the device cache
          const deviceCache = setpointCache.get(deviceId);
          if (!deviceCache) continue;
          
          // Process each transition
          for (const [address, transition] of transitions.entries()) {
            const now = Date.now();
            const elapsed = now - transition.startTime;
            
            if (elapsed < transition.duration) {
              // Calculate interpolated value
              const progress = elapsed / transition.duration;
              const currentValue = transition.startValue + (transition.targetValue - transition.startValue) * progress;
              
              // Update cache
              const existingConfig = deviceCache.get(address);
              if (existingConfig) {
                deviceCache.set(address, {
                  ...existingConfig,
                  value: currentValue
                });
              }
              
              // TODO: Apply the new value to the device
              // This requires additional infrastructure we'll implement later
            } else {
              // Transition complete, remove from active transitions
              transitions.delete(address);
            }
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`[setpointManagement] Error in transition updater: ${error}`));
    }
  }, 5000);
  
  console.log(chalk.green(`[setpointManagement] Transition updater initialized`));
}

// Export the service
export default {
  getActiveSetpoint,
  isScheduleModeActive,
  applySetpoint,
  initializeTransitionUpdater
};