/**
 * Schedule Processor Service
 * This service handles the automatic processing of schedules
 */

import ModbusRTU from 'modbus-serial';
import { getDeviceModel } from './device.service';
import ScheduleService from './schedule.service';
import { Request } from 'express';

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
    
    // Determine the value to set
    const valueToSet = action === 'start' ? rule.setpoint : (rule.defaultSetpoint || 0);
    
    // Find the SetPoint parameter in device dataPoints
    let setpointInfo = null;
    for (const dataPoint of device.dataPoints || []) {
      if (dataPoint.parser && dataPoint.parser.parameters) {
        const setpointParam = dataPoint.parser.parameters.find((param: any) => 
          param.name && param.name.toLowerCase() === 'setpoint'
        );
        if (setpointParam) {
          setpointInfo = {
            address: dataPoint.range.startAddress,
            functionCode: dataPoint.range.fc || 3,
            dataType: setpointParam.dataType || 'FLOAT32'
          };
          break;
        }
      }
    }
    
    if (!setpointInfo) {
      throw new Error('SetPoint parameter not found on device');
    }
    
    // Write to the device using Modbus
    const client = new ModbusRTU();
    
    try {
      // Check if connection settings exist
      if (!device.connectionSetting) {
        throw new Error('Device connection settings not found');
      }
      
      // Connect to device
      if (device.connectionSetting.connectionType === 'tcp') {
        const tcpSettings = device.connectionSetting.tcp;
        if (!tcpSettings) {
          throw new Error('TCP connection settings not found');
        }
        // Add timeout to TCP connection to prevent hanging
        const connectPromise = client.connectTCP(
          tcpSettings.ip,
          { port: tcpSettings.port }
        );
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TCP connection timeout after 10 seconds')), 10000)
        );
        
        try {
          await Promise.race([connectPromise, timeoutPromise]);
        } catch (error) {
          console.error(`[scheduleProcessor] TCP connection failed: ${error}`);
          throw error;
        }
        client.setID(tcpSettings.slaveId);
      } else {
        const rtuSettings = device.connectionSetting.rtu;
        if (!rtuSettings) {
          throw new Error('RTU connection settings not found');
        }
        const { connectRTUBuffered } = await import('../utils/modbusHelper');
        await connectRTUBuffered(client, rtuSettings.serialPort, {
          baudRate: rtuSettings.baudRate,
          dataBits: rtuSettings.dataBits as 5 | 6 | 7 | 8,
          stopBits: rtuSettings.stopBits as 1 | 2,
          parity: rtuSettings.parity as 'none' | 'even' | 'odd'
        });
        client.setID(rtuSettings.slaveId);
      }
      
      // Write the value
      console.log(`[ScheduleProcessor] Writing value ${valueToSet} to address ${setpointInfo.address}`);
      
      // For FLOAT32, we need to write two registers
      if (setpointInfo.dataType === 'FLOAT32') {
        // Convert float to two 16-bit registers
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeFloatBE(valueToSet, 0);
        const registers = [
          buffer.readUInt16BE(0),
          buffer.readUInt16BE(2)
        ];
        
        // Write multiple registers (FC16)
        await client.writeRegisters(setpointInfo.address, registers);
      } else {
        // Write single register (FC6)
        await client.writeRegister(setpointInfo.address, valueToSet);
      }
      
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
      client.close();
    }
  }
}

export default ScheduleProcessorService;