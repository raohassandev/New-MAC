import { Request, Express } from 'express';
import mongoose from 'mongoose';
import { ScheduleTemplate, DeviceSchedule, IScheduleTemplate, IDeviceSchedule, IScheduleRule } from '../models/schedule.model';
import ModbusRTU from 'modbus-serial';

/**
 * Schedule Service - Handles business logic for schedule management
 */
export class ScheduleService {
  /**
   * Get the correct schedule template model for the request
   */
  static async getScheduleTemplateModel(req: Request): Promise<typeof ScheduleTemplate> {
    // Check if client-specific models are available
    if (req.app.locals.clientModels && req.app.locals.clientModels.ScheduleTemplate) {
      return req.app.locals.clientModels.ScheduleTemplate;
    }
    
    // Fall back to default model
    return ScheduleTemplate;
  }

  /**
   * Get the correct device schedule model for the request
   */
  static async getDeviceScheduleModel(req: Request): Promise<typeof DeviceSchedule> {
    // Check if client-specific models are available
    if (req.app.locals.clientModels && req.app.locals.clientModels.DeviceSchedule) {
      return req.app.locals.clientModels.DeviceSchedule;
    }
    
    // Fall back to default model
    return DeviceSchedule;
  }

  /**
   * Get the correct device model for the request
   */
  static async getDeviceModel(req: Request): Promise<any> {
    // Check if client-specific models are available
    if (req.app.locals.clientModels && req.app.locals.clientModels.Device) {
      return req.app.locals.clientModels.Device;
    }
    
    // If no model available, throw an error
    throw new Error('Device model not available');
  }

  /**
   * Create a new schedule template
   */
  static async createScheduleTemplate(data: Partial<IScheduleTemplate>, userId: string, req: Request): Promise<IScheduleTemplate> {
    const TemplateModel = await this.getScheduleTemplateModel(req);
    
    // Add creator information
    const templateData = {
      ...data,
      createdBy: {
        userId,
        username: data.createdBy?.username || 'Unknown',
        email: data.createdBy?.email
      }
    };
    
    return await TemplateModel.create(templateData);
  }

  /**
   * Get all schedule templates (user's own + public ones)
   */
  static async getScheduleTemplates(userId: string, req: Request, includePrivate: boolean = true): Promise<IScheduleTemplate[]> {
    const TemplateModel = await this.getScheduleTemplateModel(req);
    
    const query: any = {
      $or: [
        { isPublic: true },
        ...(includePrivate ? [{ 'createdBy.userId': userId }] : [])
      ]
    };
    
    return await TemplateModel.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get schedule template by ID
   */
  static async getScheduleTemplateById(templateId: string, req: Request): Promise<IScheduleTemplate | null> {
    const TemplateModel = await this.getScheduleTemplateModel(req);
    
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new Error('Invalid template ID format');
    }
    
    return await TemplateModel.findById(templateId);
  }

  /**
   * Update schedule template
   */
  static async updateScheduleTemplate(
    templateId: string, 
    updates: Partial<IScheduleTemplate>, 
    userId: string, 
    req: Request
  ): Promise<IScheduleTemplate | null> {
    const TemplateModel = await this.getScheduleTemplateModel(req);
    
    // Ensure user can only update their own templates
    const filter: any = {
      _id: templateId,
      'createdBy.userId': userId
    };
    
    return await TemplateModel.findOneAndUpdate(filter, updates, { new: true });
  }

  /**
   * Delete schedule template
   */
  static async deleteScheduleTemplate(templateId: string, userId: string, req: Request): Promise<boolean> {
    const TemplateModel = await this.getScheduleTemplateModel(req);
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    
    // Check if template is in use by any device
    const devicesUsingTemplate = await DeviceScheduleModel.countDocuments({ templateId });
    if (devicesUsingTemplate > 0) {
      throw new Error(`Cannot delete template. It is currently used by ${devicesUsingTemplate} device(s).`);
    }
    
    // Ensure user can only delete their own templates
    const result = await TemplateModel.deleteOne({
      _id: templateId,
      'createdBy.userId': userId
    });
    
    return result.deletedCount > 0;
  }

  /**
   * Apply schedule template to device
   */
  static async applyTemplateToDevice(
    deviceId: string,
    templateId: string,
    customRules: IScheduleRule[] = [],
    startDate: Date | undefined,
    endDate: Date | undefined,
    userId: string,
    req: Request
  ): Promise<IDeviceSchedule> {
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    const DeviceModel = await this.getDeviceModel(req);
    
    // Validate device and template IDs
    if (!mongoose.Types.ObjectId.isValid(deviceId) || !mongoose.Types.ObjectId.isValid(templateId)) {
      throw new Error('Invalid device or template ID format');
    }
    
    // Check if device exists
    const device = await DeviceModel.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Check if Schedule bit is enabled on the device
    const scheduleEnabled = await this.checkScheduleBitEnabled(device, req);
    if (!scheduleEnabled) {
      throw new Error('Schedule bit is not enabled on the device. Please enable the Schedule parameter on the device before applying a schedule.');
    }
    
    // Check if schedule already exists for this device
    const existingSchedule = await DeviceScheduleModel.findOne({ deviceId });
    
    const scheduleData = {
      deviceId,
      templateId,
      customRules,
      startDate,
      endDate,
      active: true,
      createdBy: {
        userId,
        username: 'User' // This should be passed from the controller
      }
    };
    
    let schedule: IDeviceSchedule;
    
    if (existingSchedule) {
      // Update existing schedule
      Object.assign(existingSchedule, scheduleData);
      schedule = await existingSchedule.save();
    } else {
      // Create new schedule
      schedule = await DeviceScheduleModel.create(scheduleData);
    }
    
    // Update the device's activeScheduleId
    await DeviceModel.findByIdAndUpdate(deviceId, {
      activeScheduleId: schedule._id
    });
    
    return schedule;
  }

  /**
   * Get device schedule
   */
  static async getDeviceSchedule(deviceId: string, req: Request): Promise<IDeviceSchedule | null> {
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      throw new Error('Invalid device ID format');
    }
    
    return await DeviceScheduleModel.findOne({ deviceId })
      .populate('templateId');
  }

  /**
   * Update device schedule
   */
  static async updateDeviceSchedule(
    deviceId: string,
    updates: Partial<IDeviceSchedule>,
    userId: string,
    req: Request
  ): Promise<IDeviceSchedule | null> {
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    const DeviceModel = await this.getDeviceModel(req);
    
    // If updating to active state, check if Schedule bit is enabled
    if (updates.active === true) {
      const device = await DeviceModel.findById(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }
      
      const scheduleEnabled = await this.checkScheduleBitEnabled(device, req);
      if (!scheduleEnabled) {
        throw new Error('Cannot activate schedule: Schedule bit is not enabled on the device. Please enable the Schedule parameter on the device before activating the schedule.');
      }
    }
    
    const updatedSchedule = await DeviceScheduleModel.findOneAndUpdate(
      { deviceId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (updatedSchedule) {
      // Update the device's activeScheduleId based on the schedule's active status
      await DeviceModel.findByIdAndUpdate(deviceId, {
        activeScheduleId: updatedSchedule.active ? updatedSchedule._id : null
      });
    }
    
    return updatedSchedule;
  }

  /**
   * Deactivate device schedule
   */
  static async deactivateDeviceSchedule(deviceId: string, req: Request): Promise<boolean> {
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    
    const result = await DeviceScheduleModel.updateOne(
      { deviceId },
      { active: false, updatedAt: new Date() }
    );
    
    if (result.modifiedCount > 0) {
      // Clear the activeScheduleId from the device
      const DeviceModel = await this.getDeviceModel(req);
      await DeviceModel.findByIdAndUpdate(deviceId, {
        activeScheduleId: null
      });
      return true;
    }
    
    return false;
  }

  /**
   * Get schedules that need to be applied now
   */
  static async getSchedulesToApply(req: Request): Promise<IDeviceSchedule[]> {
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    const currentDate = now.toISOString().split('T')[0];
    
    // Find active schedules that match current time
    return await DeviceScheduleModel.find({
      active: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $exists: false } },
        { startDate: { $exists: false } }
      ]
    }).populate('templateId');
  }

  /**
   * Calculate next scheduled change for a device
   */
  static async calculateNextScheduledChange(
    deviceSchedule: IDeviceSchedule,
    req: Request
  ): Promise<{ startTime: string; endTime: string; setpoint: number; parameter?: string; registerAddress?: number; returnToDefault?: boolean; defaultSetpoint?: number } | null> {
    if (!deviceSchedule.active) return null;
    
    const template = await this.getScheduleTemplateById(deviceSchedule.templateId.toString(), req);
    if (!template) return null;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    
    // Combine template rules with custom rules
    const allRules = [...template.rules, ...(deviceSchedule.customRules || [])];
    
    // Filter enabled rules that apply to current day
    const todayRules = allRules
      .filter(rule => rule.enabled)
      .filter(rule => {
        return rule.days.includes(currentDay) || 
               rule.days.includes('All') ||
               (currentDay >= 'Mon' && currentDay <= 'Fri' && rule.days.includes('Weekday')) ||
               ((currentDay === 'Sat' || currentDay === 'Sun') && rule.days.includes('Weekend'));
      });
    
    // Find current active rule (we're within its time range)
    const activeRule = todayRules.find(rule => 
      currentTime >= rule.startTime && currentTime < rule.endTime
    );
    
    if (activeRule) {
      return {
        startTime: activeRule.startTime,
        endTime: activeRule.endTime,
        setpoint: activeRule.setpoint,
        parameter: activeRule.parameter,
        registerAddress: activeRule.registerAddress,
        returnToDefault: activeRule.returnToDefault,
        defaultSetpoint: activeRule.defaultSetpoint
      };
    }
    
    // Find next rule to apply today
    const nextRule = todayRules
      .filter(rule => rule.startTime > currentTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    
    if (nextRule) {
      return {
        startTime: nextRule.startTime,
        endTime: nextRule.endTime,
        setpoint: nextRule.setpoint,
        parameter: nextRule.parameter,
        registerAddress: nextRule.registerAddress,
        returnToDefault: nextRule.returnToDefault,
        defaultSetpoint: nextRule.defaultSetpoint
      };
    }
    
    // If no rule found for today, get the first rule tomorrow
    const tomorrowDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(now.getDay() + 1) % 7];
    const tomorrowRules = allRules
      .filter(rule => rule.enabled)
      .filter(rule => {
        return rule.days.includes(tomorrowDay) || 
               rule.days.includes('All') ||
               (tomorrowDay >= 'Mon' && tomorrowDay <= 'Fri' && rule.days.includes('Weekday')) ||
               ((tomorrowDay === 'Sat' || tomorrowDay === 'Sun') && rule.days.includes('Weekend'));
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    const firstTomorrowRule = tomorrowRules[0];
    if (firstTomorrowRule) {
      return {
        startTime: firstTomorrowRule.startTime,
        endTime: firstTomorrowRule.endTime,
        setpoint: firstTomorrowRule.setpoint,
        parameter: firstTomorrowRule.parameter,
        registerAddress: firstTomorrowRule.registerAddress,
        returnToDefault: firstTomorrowRule.returnToDefault,
        defaultSetpoint: firstTomorrowRule.defaultSetpoint
      };
    }
    
    return null;
  }
  
  /**
   * Get schedules that should start or end now
   */
  static async getSchedulesToProcess(req: Request): Promise<Array<{schedule: IDeviceSchedule, action: 'start' | 'end', rule: IScheduleRule}>> {
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    
    // Find all active schedules
    const activeSchedules = await DeviceScheduleModel.find({
      active: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $exists: false } },
        { startDate: { $exists: false } }
      ]
    }).populate('templateId');
    
    const schedulesToProcess: Array<{schedule: IDeviceSchedule, action: 'start' | 'end', rule: IScheduleRule}> = [];
    
    for (const schedule of activeSchedules) {
      const template = await this.getScheduleTemplateById(schedule.templateId.toString(), req);
      if (!template) continue;
      
      // Combine template rules with custom rules
      const allRules = [...template.rules, ...(schedule.customRules || [])];
      
      // Check each rule
      for (const rule of allRules) {
        if (!rule.enabled) continue;
        
        // Check if rule applies to current day
        const appliesToday = rule.days.includes(currentDay) || 
                           rule.days.includes('All') ||
                           (currentDay >= 'Mon' && currentDay <= 'Fri' && rule.days.includes('Weekday')) ||
                           ((currentDay === 'Sat' || currentDay === 'Sun') && rule.days.includes('Weekend'));
        
        if (!appliesToday) continue;
        
        // Check if we're at start time
        if (rule.startTime === currentTime) {
          schedulesToProcess.push({ schedule, action: 'start', rule });
        }
        
        // Check if we're at end time and should return to default
        if (rule.endTime === currentTime && rule.returnToDefault) {
          schedulesToProcess.push({ schedule, action: 'end', rule });
        }
      }
    }
    
    return schedulesToProcess;
  }

  /**
   * Get device schedules by template
   */
  static async getDeviceSchedulesByTemplate(templateId: string, req: Request): Promise<IDeviceSchedule[]> {
    const DeviceScheduleModel = await this.getDeviceScheduleModel(req);
    
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new Error('Invalid template ID format');
    }
    
    return await DeviceScheduleModel.find({ templateId }).populate('deviceId');
  }

  /**
   * Check if Schedule bit is enabled on the device
   */
  private static async checkScheduleBitEnabled(device: any, req: Request): Promise<boolean> {
    try {
      // Create Modbus client
      const client = new ModbusRTU();
      
      // Set appropriate timeout
      client.setTimeout(5000);

      // Connect based on device connection type
      if (device.connectionSetting.connectionType === 'tcp') {
        await client.connectTCP(
          device.connectionSetting.tcp.ip,
          { port: device.connectionSetting.tcp.port }
        );
      } else {
        await client.connectRTUBuffered(
          device.connectionSetting.rtu.serialPort,
          {
            baudRate: device.connectionSetting.rtu.baudRate,
            dataBits: device.connectionSetting.rtu.dataBits,
            stopBits: device.connectionSetting.rtu.stopBits,
            parity: device.connectionSetting.rtu.parity
          }
        );
      }

      // Set slave ID
      const slaveId = device.connectionSetting.connectionType === 'tcp' 
        ? device.connectionSetting.tcp.slaveId 
        : device.connectionSetting.rtu.slaveId;
      client.setID(slaveId);

      // Read all device registers to find Schedule parameter
      const registers = device.registers || [];
      let scheduleParameterFound = false;
      let scheduleValue = false;

      for (const register of registers) {
        // Check for Schedule parameter (case insensitive)
        if (register.parameters && Array.isArray(register.parameters)) {
          const scheduleParam = register.parameters.find((param: any) => 
            param.name && param.name.toLowerCase() === 'schedule'
          );

          if (scheduleParam) {
            scheduleParameterFound = true;
            
            // Read the register value
            const startAddress = parseInt(register.startAddress) || 0;
            const readCount = parseInt(register.readCount) || 1;
            
            let result;
            if (register.registerType === 'Input Register' || register.registerType === 'input') {
              result = await client.readInputRegisters(startAddress, readCount);
            } else if (register.registerType === 'Holding Register' || register.registerType === 'holding') {
              result = await client.readHoldingRegisters(startAddress, readCount);
            } else if (register.registerType === 'Coil' || register.registerType === 'coil') {
              result = await client.readCoils(startAddress, readCount);
            } else if (register.registerType === 'Discrete Input' || register.registerType === 'discrete') {
              result = await client.readDiscreteInputs(startAddress, readCount);
            }

            if (result && result.data) {
              // Check if the parameter indicates bit position
              if (scheduleParam.bitPosition !== undefined && typeof scheduleParam.bitPosition === 'number') {
                const registerValue: number = Number(result.data[0]);
                const bitPosition: number = Number(scheduleParam.bitPosition);
                const mask: number = Math.pow(2, bitPosition);
                scheduleValue = Boolean(registerValue & mask);
              } else {
                // Treat as boolean value (non-zero = true)
                scheduleValue = Boolean(result.data[0]);
              }
            }
            break;
          }
        }
      }

      // Close the connection
      client.close();

      if (!scheduleParameterFound) {
        console.log(`Schedule parameter not found for device ${device.name}`);
        // If Schedule parameter doesn't exist, we allow schedule activation
        return true;
      }

      return scheduleValue;

    } catch (error) {
      console.error('Error checking Schedule bit:', error);
      // If we can't read the device, we'll allow schedule activation
      // This prevents blocking schedule functionality due to connection issues
      return true;
    }
  }
}

export default ScheduleService;