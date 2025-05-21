/**
 * Schedule Processor Service
 * This service handles the automatic processing of schedules
 */

import ModbusRTU from 'modbus-serial';
import mongoose from 'mongoose';
import { getDeviceModel } from './device.service';
import ScheduleService from './schedule.service';
import { Request } from 'express';
import { getDeviceControlStatus } from '../utils/controlBitHelper';
import { getScheduleBitStatus } from '../utils/scheduleBitHelper';
import * as setpointManagement from './setpointManagement.service';

export class ScheduleProcessorService {
  private static isProcessing = false;
  private static processingInterval: NodeJS.Timeout | null = null;

  /**
   * Start the schedule processor
   */
  static start(req: Request) {
    console.log('[ScheduleProcessor] Starting schedule processor service');
    
    // Process schedules every minute
    this.processingInterval = setInterval(() => {
      this.processSchedules(req);
    }, 60000); // 60 seconds
    
    // Also process immediately on start
    this.processSchedules(req);
  }
  
  /**
   * Stop the schedule processor
   */
  static stop() {
    console.log('[ScheduleProcessor] Stopping schedule processor service');
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
  
  /**
   * Process all active schedules
   */
  private static async processSchedules(req: Request) {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('[ScheduleProcessor] Already processing, skipping this cycle');
      return;
    }
    
    try {
      this.isProcessing = true;
      console.log('[ScheduleProcessor] Processing schedules...');
      
      // Get schedules that need processing
      const schedulesToProcess = await ScheduleService.getSchedulesToProcess(req);
      console.log(`[ScheduleProcessor] Found ${schedulesToProcess.length} schedules to process`);
      
      if (schedulesToProcess.length > 0) {
        console.log('[ScheduleProcessor] Processing schedules:', schedulesToProcess.map(s => ({
          deviceId: s.schedule.deviceId,
          action: s.action,
          time: s.rule.startTime + '-' + s.rule.endTime,
          setpoint: s.rule.setpoint
        })));
      }
      
      for (const { schedule, action, rule } of schedulesToProcess) {
        try {
          await this.applyScheduleRule(schedule, action, rule, req);
        } catch (error) {
          console.error(`[ScheduleProcessor] Failed to process schedule for device ${schedule.deviceId}:`, error);
        }
      }
      
    } catch (error) {
      console.error('[ScheduleProcessor] Error processing schedules:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Apply a schedule rule to a device
   */
  private static async applyScheduleRule(schedule: any, action: 'start' | 'end', rule: any, req: Request) {
    console.log(`[ScheduleProcessor] Applying ${action} rule for device ${schedule.deviceId}`);
    
    // Get the device
    const DeviceModel = await getDeviceModel(req);
    const device = await DeviceModel.findById(schedule.deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Check both control bit and schedule switch status
    const { isControlCentral, isScheduleOn } = await getDeviceControlStatus(schedule.deviceId.toString(), req);
    
    // Skip if control is not central
    if (!isControlCentral) {
      console.log(`[ScheduleProcessor] Skipping schedule for device ${device.name} (${schedule.deviceId}) - device is in LOCAL control mode`);
      return;
    }
    
    // Also skip if schedule switch is OFF
    const scheduleOn = await getScheduleBitStatus(schedule.deviceId.toString(), req);
    if (!scheduleOn) {
      console.log(`[ScheduleProcessor] Skipping schedule for device ${device.name} (${schedule.deviceId}) - schedule switch is OFF`);
      return;
    }
    
    console.log(`[ScheduleProcessor] Device ${device.name} is in CENTRAL control mode with schedule ON, proceeding with schedule`);
    
    
    // If device has a device driver, fetch the latest configuration
    if (device.deviceDriverId) {
      let deviceDriver;
      
      if (req?.app?.locals?.libraryDB) {
        const templatesCollection = req.app.locals.libraryDB.collection('templates');
        const objectId = new mongoose.Types.ObjectId(device.deviceDriverId);
        deviceDriver = await templatesCollection.findOne({ _id: objectId });
      } else if (req?.app?.locals?.libraryModels?.DeviceDriver) {
        const DeviceDriverModel = req.app.locals.libraryModels.DeviceDriver;
        deviceDriver = await DeviceDriverModel.findById(device.deviceDriverId);
      }
      
      if (deviceDriver) {
        device.dataPoints = deviceDriver.dataPoints || [];
        device.writableRegisters = deviceDriver.writableRegisters || [];
        device.controlParameters = deviceDriver.controlParameters || [];
      }
    }
    
    // Determine the value to set from the schedule
    const scheduleSetpoint = action === 'start' ? rule.setpoint : (rule.defaultSetpoint || null);
    
    // Find the parameter information from device dataPoints
    let setpointInfo = null;
    for (const dataPoint of device.dataPoints || []) {
      if (dataPoint.parser && dataPoint.parser.parameters) {
        const setpointParam = dataPoint.parser.parameters.find((param: any) => 
          param.name && param.name.toLowerCase() === rule.parameter?.toLowerCase() || param.name?.toLowerCase() === 'setpoint'
        );
        if (setpointParam) {
          setpointInfo = {
            address: dataPoint.range.startAddress,
            functionCode: dataPoint.range.fc || 3,
            dataType: setpointParam.dataType || 'FLOAT32',
            name: setpointParam.name || 'Setpoint',
            defaultValue: (setpointParam as any).defaultValue !== undefined ? (setpointParam as any).defaultValue : 0
          };
          break;
        }
      }
    }
    
    if (!setpointInfo) {
      throw new Error(`Parameter "${rule.parameter || 'Setpoint'}" not found on device`);
    }
    
    console.log(`[ScheduleProcessor] Found parameter ${setpointInfo.name} at address ${setpointInfo.address}`);
    
    // Use the new setpoint management service to handle the setpoint logic
    try {
      console.log(`[ScheduleProcessor] Using setpoint management service for ${action} action`);
      
      // Get the manual setpoint to use as fallback
      const manualSetpoint = setpointInfo.defaultValue || 0;
      
      // Apply the setpoint using our setpoint management service
      // This handles selection between schedule and manual setpoints based on control mode
      const result = await setpointManagement.applySetpoint(
        schedule.deviceId.toString(),
        setpointInfo.address,
        scheduleSetpoint, // Schedule setpoint - can be null for end action
        manualSetpoint,   // Manual setpoint as fallback
        req,
        true             // Use gradual transition for comfort parameters
      );
      
      console.log(`[ScheduleProcessor] Setpoint management result: ${JSON.stringify(result)}`);
      
      if (!result.success) {
        throw new Error(`Failed to apply setpoint: ${result.message}`);
      }
      
      console.log(`[ScheduleProcessor] Successfully applied ${result.source} setpoint: ${result.value}`);
      
      // The value being used (which might be schedule or manual depending on mode)
      const valueToSet = result.value;
      
      // Update the schedule's last applied time
      await ScheduleService.updateDeviceSchedule(
        schedule.deviceId.toString(),
        { 
          lastApplied: new Date(),
          currentActiveRule: action === 'start' ? {
            startTime: rule.startTime,
            endTime: rule.endTime,
            setpoint: rule.setpoint,
            parameter: rule.parameter || 'Temperature',
            registerAddress: setpointInfo.address
          } : undefined
        },
        '000000000000000000000000', // System user ID
        req
      );
      
      console.log(`[ScheduleProcessor] Successfully applied ${action} rule for device ${device.name}`);
      
    } finally {
      // No client to close here - it's managed inside the services
    }
  }
}

export default ScheduleProcessorService;