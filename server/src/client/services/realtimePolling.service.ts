/**
 * Real-time Polling Service for Critical Data
 * Polls critical registers every 1-2 seconds for near real-time updates
 */

import chalk from 'chalk';
import { DatabaseModelManager } from '../utils/databaseModelManager';
import { ModbusConnectionManager } from '../utils/modbusConnectionManager';
import * as pollingService from './polling.service';

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
          const result = await client.readHoldingRegisters(register.address, 1);
          const currentValue = result.data[0];

          // Check for significant change
          if (this.hasSignificantChange(register, currentValue)) {
            register.lastValue = currentValue;
            hasChanges = true;
            
            console.log(chalk.yellow(`[RealtimePolling] Critical change detected: ${register.name} = ${currentValue}`));
          }
          
        } catch (regError) {
          console.warn(chalk.yellow(`[RealtimePolling] Failed to read register ${register.address}:`, regError));
        }
      }

      await ModbusConnectionManager.disconnect(connection);
      return hasChanges;
      
    } catch (error) {
      console.error(chalk.red(`[RealtimePolling] Critical polling error:`, error));
      return false;
    }
  }

  /**
   * Check if value change is significant enough to trigger update
   */
  private hasSignificantChange(register: CriticalRegister, newValue: any): boolean {
    if (register.lastValue === undefined) {
      return true; // First reading
    }

    // For alarm/critical types, any change is significant
    if (register.type === 'alarm' || register.type === 'critical') {
      return register.lastValue !== newValue;
    }

    // For process data, check threshold
    if (register.threshold && typeof newValue === 'number' && typeof register.lastValue === 'number') {
      const change = Math.abs(newValue - register.lastValue);
      return change >= register.threshold;
    }

    // Default: any change
    return register.lastValue !== newValue;
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
            // Identify critical registers by name patterns
            const name = dataPoint.name?.toLowerCase() || '';
            
            if (this.isCriticalRegister(name)) {
              this.addCriticalRegister({
                deviceId: device._id.toString(),
                address: dataPoint.address || dataPoint.registerIndex,
                name: dataPoint.name || `Register ${dataPoint.address}`,
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
   */
  private isCriticalRegister(name: string): boolean {
    const criticalPatterns = [
      'alarm', 'alert', 'emergency', 'fault', 'error',
      'pressure', 'temperature', 'level', 'flow',
      'status', 'state', 'mode', 'control'
    ];
    
    return criticalPatterns.some(pattern => name.includes(pattern));
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