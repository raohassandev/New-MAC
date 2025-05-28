/**
 * Real-time Polling Service for Critical Data
 * Polls critical registers every 1-2 seconds for near real-time updates
 */

import chalk from 'chalk';
import { DatabaseModelManager } from '../utils/databaseModelManager';
import { ModbusConnectionManager } from '../utils/modbusConnectionManager';
import * as pollingService from './polling.service';
import { readHoldingRegistersWithTimeout } from '../utils/modbusHelper';

interface CriticalRegister {
  deviceId: string;
  address: number;
  name: string;
  type: 'alarm' | 'critical' | 'process';
  lastValue?: any;
  threshold?: number; // For change detection
}

class RealtimePollingService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private criticalRegisters: CriticalRegister[] = [];
  private isRunning = false;

  /**
   * Start real-time polling for critical registers
   */
  async start(pollInterval = 1000) { // 1 second default
    if (this.isRunning) {
      console.log(chalk.yellow('[RealtimePolling] Already running'));
      return;
    }

    console.log(chalk.green(`[RealtimePolling] Starting with ${pollInterval}ms interval`));
    this.isRunning = true;

    // Load critical registers configuration
    await this.loadCriticalRegisters();

    // Start polling for each device
    for (const register of this.criticalRegisters) {
      this.startDevicePolling(register.deviceId, pollInterval);
    }
  }

  /**
   * Stop all real-time polling
   */
  stop() {
    console.log(chalk.yellow('[RealtimePolling] Stopping all intervals'));
    
    for (const [deviceId, interval] of this.intervals) {
      clearInterval(interval);
      console.log(chalk.gray(`[RealtimePolling] Stopped polling for device ${deviceId}`));
    }
    
    this.intervals.clear();
    this.isRunning = false;
  }

  /**
   * Add critical register for monitoring
   */
  addCriticalRegister(register: CriticalRegister) {
    const existing = this.criticalRegisters.find(r => 
      r.deviceId === register.deviceId && r.address === register.address
    );
    
    if (!existing) {
      this.criticalRegisters.push(register);
      console.log(chalk.cyan(`[RealtimePolling] Added critical register: ${register.name} (${register.address})`));
    }
  }

  /**
   * Start polling for a specific device
   */
  private startDevicePolling(deviceId: string, interval: number) {
    if (this.intervals.has(deviceId)) {
      return; // Already polling this device
    }

    const pollDevice = async () => {
      try {
        // Get device critical registers
        const deviceRegisters = this.criticalRegisters.filter(r => r.deviceId === deviceId);
        
        if (deviceRegisters.length === 0) {
          return;
        }

        // Quick poll just the critical registers
        const hasChanges = await this.pollCriticalRegisters(deviceId, deviceRegisters);
        
        if (hasChanges) {
          // Trigger full device poll and WebSocket broadcast
          await this.triggerFullDeviceUpdate(deviceId);
        }
        
      } catch (error) {
        console.error(chalk.red(`[RealtimePolling] Error polling device ${deviceId}:`, error));
      }
    };

    // Start interval
    const intervalId = setInterval(pollDevice, interval);
    this.intervals.set(deviceId, intervalId);
    
    console.log(chalk.green(`[RealtimePolling] Started polling device ${deviceId} every ${interval}ms`));
  }

  /**
   * Poll only critical registers for change detection
   */
  private async pollCriticalRegisters(deviceId: string, registers: CriticalRegister[]): Promise<boolean> {
    try {
      const DeviceModel = await DatabaseModelManager.getDeviceModel();
      const device = await DeviceModel.findById(deviceId);
      
      if (!device || !device.enabled) {
        return false;
      }

      const connection = await ModbusConnectionManager.connectLegacy(device);
      const client = connection.client;

      let hasChanges = false;

      for (const register of registers) {
        try {
          // Read single register (optimize for speed)
          const result = await readHoldingRegistersWithTimeout(client, register.address, 1);
          const currentValue = result.data[0];

          // Check for significant change
          if (this.hasSignificantChange(register, currentValue)) {
            const oldValue = register.lastValue;
            register.lastValue = currentValue;
            hasChanges = true;
            
            console.log(chalk.yellow(`🔥 [RealtimePolling] CRITICAL CHANGE: ${register.name} ${oldValue} → ${currentValue}`));
            
            // Fire immediate event for this change
            await this.fireChangeEvent(deviceId, register, oldValue, currentValue);
          }
          
        } catch (regError) {
          console.warn(chalk.yellow(`[RealtimePolling] Failed to read register ${register.address}:`, regError));
        }
      }

      try {
        // Handle legacy connection format from connectLegacy
        if (connection && connection.client) {
          connection.client.close();
        }
      } catch (disconnectError) {
        console.warn(chalk.yellow('[RealtimePolling] Error disconnecting:', disconnectError));
      }
      return hasChanges;
      
    } catch (error) {
      console.error(chalk.red(`[RealtimePolling] Critical polling error:`, error));
      return false;
    }
  }

  /**
   * Fire immediate change event with all updates
   */
  private async fireChangeEvent(deviceId: string, register: CriticalRegister, oldValue: any, newValue: any) {
    try {
      console.log(chalk.green(`🔥 [EVENT FIRED] ${register.name}: ${oldValue} → ${newValue}`));
      
      const eventData = {
        deviceId,
        registerAddress: register.address,
        registerName: register.name,
        registerType: register.type,
        oldValue,
        newValue,
        timestamp: new Date(),
        changeDetected: true
      };

      // Emit WebSocket event immediately
      const websocketManager = (global as any).websocketManager;
      if (websocketManager && websocketManager.isAvailable()) {
        const success = websocketManager.emitCriticalValueChanged(eventData);
        
        if (success) {
          console.log(chalk.green(`📡 [WebSocket] Broadcasted critical change for ${register.name}`));
        }
      } else {
        console.warn(chalk.yellow(`📡 [WebSocket] WebSocket manager not available for critical change ${register.name}`));
      }

      // Log the critical change event
      try {
        const appLocals = (global as any).appLocals;
        if (appLocals?.clientModels?.EventLog) {
          const EventLogModel = appLocals.clientModels.EventLog;
          const eventLog = new EventLogModel({
            type: register.type === 'alarm' ? 'error' : 'info',
            message: `Critical change detected: ${register.name} changed from ${oldValue} to ${newValue}`,
            deviceId: deviceId,
            deviceName: `Device ${deviceId}`,
            timestamp: new Date(),
            metadata: {
              registerAddress: register.address,
              registerName: register.name,
              oldValue,
              newValue,
              changeType: 'critical'
            }
          });
          
          await eventLog.save();
          console.log(chalk.green(`📝 [EventLog] Critical change logged`));
        }
      } catch (logError) {
        console.warn(chalk.yellow('[RealtimePolling] Failed to log event:', logError));
      }

    } catch (eventError) {
      console.error(chalk.red('[RealtimePolling] Failed to fire change event:', eventError));
    }
  }

  /**
   * Check if value change is significant enough to trigger update
   * FOR REAL-TIME DETECTION: Any change is significant to catch external modifications
   */
  private hasSignificantChange(register: CriticalRegister, newValue: any): boolean {
    if (register.lastValue === undefined) {
      return true; // First reading
    }

    // FOR REAL-TIME EXTERNAL CHANGE DETECTION:
    // Any change is significant to ensure ModSlave changes are caught immediately
    return register.lastValue !== newValue;

    // Original threshold-based logic (commented for reference):
    // if (register.type === 'alarm' || register.type === 'critical') {
    //   return register.lastValue !== newValue;
    // }
    // if (register.threshold && typeof newValue === 'number' && typeof register.lastValue === 'number') {
    //   const change = Math.abs(newValue - register.lastValue);
    //   return change >= register.threshold;
    // }
    // return register.lastValue !== newValue;
  }

  /**
   * Trigger full device poll and WebSocket update
   */
  private async triggerFullDeviceUpdate(deviceId: string) {
    try {
      console.log(chalk.cyan(`[RealtimePolling] Triggering full update for device ${deviceId}`));
      
      // Use existing polling service for full update
      const mockReq = { app: { locals: (global as any).appLocals } };
      await pollingService.pollDevice(deviceId, mockReq);
      
    } catch (error) {
      console.error(chalk.red(`[RealtimePolling] Failed to trigger full update:`, error));
    }
  }

  /**
   * Load critical registers from device configurations
   */
  private async loadCriticalRegisters() {
    try {
      const DeviceModel = await DatabaseModelManager.getDeviceModel();
      const devices = await DeviceModel.find({ enabled: true });

      for (const device of devices) {
        if (device.dataPoints && Array.isArray(device.dataPoints)) {
          for (const dataPoint of device.dataPoints) {
            // Type assertion to access properties safely
            const dp = dataPoint as any;
            
            // Identify critical registers by name patterns
            const name = dp.name?.toLowerCase() || '';
            
            if (this.isCriticalRegister(name)) {
              this.addCriticalRegister({
                deviceId: device._id.toString(),
                address: dp.address || dp.registerIndex || 0,
                name: dp.name || `Register ${dp.address || dp.registerIndex}`,
                type: this.getCriticalType(name),
                threshold: this.getChangeThreshold(name)
              });
            }
          }
        }
      }

      console.log(chalk.green(`[RealtimePolling] Loaded ${this.criticalRegisters.length} critical registers`));
      
    } catch (error) {
      console.error(chalk.red('[RealtimePolling] Failed to load critical registers:', error));
    }
  }

  /**
   * Determine if register is critical based on name
   * FOR REAL-TIME DETECTION: Monitor ALL registers to catch external changes
   */
  private isCriticalRegister(name: string): boolean {
    // Monitor ALL registers for real-time external changes detection
    // This ensures ModSlave or other external changes are detected immediately
    return true;
    
    // Original critical patterns (commented for reference):
    // const criticalPatterns = [
    //   'alarm', 'alert', 'emergency', 'fault', 'error',
    //   'pressure', 'temperature', 'level', 'flow',
    //   'status', 'state', 'mode', 'control'
    // ];
    // return criticalPatterns.some(pattern => name.includes(pattern));
  }

  /**
   * Get critical type based on name
   */
  private getCriticalType(name: string): 'alarm' | 'critical' | 'process' {
    if (name.includes('alarm') || name.includes('fault') || name.includes('emergency')) {
      return 'alarm';
    }
    if (name.includes('pressure') || name.includes('temperature')) {
      return 'critical';
    }
    return 'process';
  }

  /**
   * Get change threshold for register
   */
  private getChangeThreshold(name: string): number {
    if (name.includes('temperature')) return 1; // 1 degree change
    if (name.includes('pressure')) return 0.5;  // 0.5 unit change
    if (name.includes('level')) return 2;       // 2% change
    return 0; // Any change for others
  }
}

// Export singleton instance
export const realtimePollingService = new RealtimePollingService();
export default realtimePollingService;