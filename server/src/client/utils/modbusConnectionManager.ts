/**
 * Universal Modbus Connection Manager
 * Replaces all duplicate connection logic across the application
 * Maintains 100% compatibility with existing functionality
 */

import ModbusRTU from 'modbus-serial';
import chalk from 'chalk';
import { IDevice } from '../models/device.model';
import { 
  createModbusClient,
  safeCloseModbusClient 
} from './modbusHelper';

export interface ModbusConnectionOptions {
  device: IDevice;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  logPrefix?: string;
}

export interface ModbusConnection {
  client: ModbusRTU;
  connectionType: 'tcp' | 'rtu';
  slaveId: number;
  settings: {
    ip?: string;
    port?: number;
    serialPort?: string;
    baudRate?: number;
    dataBits?: number;
    stopBits?: number;
    parity?: string;
  };
  isConnected: boolean;
  connectedAt: Date;
}

/**
 * Universal Modbus Connection Manager
 * Centralizes all Modbus connection logic with full validation
 */
export class ModbusConnectionManager {
  
  /**
   * Connect to a Modbus device with full validation and error handling
   * Replaces connectToModbusDevice() and similar functions across the app
   */
  static async connect(options: ModbusConnectionOptions): Promise<ModbusConnection> {
    const { device, timeout = 10000, logPrefix = '[ModbusConnectionManager]' } = options;
    
    console.log(chalk.blue(`${logPrefix} Connecting to device: ${device.name || device._id}`));
    
    // Create new Modbus client using existing helper (maintains compatibility)
    const client = createModbusClient();
    
    // Parse connection settings (support both new and legacy format - EXACT same logic)
    const connectionType = device.connectionSetting?.connectionType || device.connectionType || 'tcp';
    
    // Get TCP settings (EXACT same extraction logic)
    const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip || device.ip : '';
    const port = connectionType === 'tcp' ? device.connectionSetting?.tcp?.port || device.port : 0;
    const tcpSlaveId = connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;
    
    // Get RTU settings (EXACT same extraction logic)
    const serialPort = connectionType === 'rtu' 
      ? device.connectionSetting?.rtu?.serialPort || device.serialPort 
      : '';
    const baudRate = connectionType === 'rtu' 
      ? device.connectionSetting?.rtu?.baudRate || device.baudRate 
      : 0;
    const dataBits = connectionType === 'rtu' 
      ? device.connectionSetting?.rtu?.dataBits || device.dataBits 
      : 0;
    const stopBits = connectionType === 'rtu' 
      ? device.connectionSetting?.rtu?.stopBits || device.stopBits 
      : 0;
    const parity = connectionType === 'rtu' 
      ? device.connectionSetting?.rtu?.parity || device.parity 
      : '';
    const rtuSlaveId = connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;
    
    // Combined slaveId (EXACT same logic as original)
    const slaveId = connectionType === 'tcp' ? tcpSlaveId : rtuSlaveId || device.slaveId || 1;
    
    // Apply advanced settings if available (EXACT same logic)
    if (device.advancedSettings?.connectionOptions?.timeout) {
      const advancedTimeout = Number(device.advancedSettings.connectionOptions.timeout);
      if (!isNaN(advancedTimeout) && advancedTimeout > 0) {
        console.log(`${logPrefix} Setting timeout to ${advancedTimeout}ms from advanced settings`);
        client.setTimeout(advancedTimeout);
      }
    }
    
    // Connect based on connection type (EXACT same logic)
    try {
      if (connectionType === 'tcp' && ip && port) {
        console.log(chalk.cyan(`${logPrefix} Connecting via TCP: ${ip}:${port}, SlaveID: ${slaveId}`));
        
        // Add timeout to TCP connection to prevent hanging (EXACT same implementation)
        const connectPromise = client.connectTCP(ip, { port });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TCP connection timeout after 10 seconds')), timeout)
        );
        
        await Promise.race([connectPromise, timeoutPromise]);
        
      } else if (connectionType === 'rtu' && serialPort) {
        console.log(chalk.cyan(`${logPrefix} Connecting via RTU: ${serialPort}, Baud: ${baudRate}, SlaveID: ${slaveId}`));
        
        const rtuOptions: any = {};
        if (baudRate) rtuOptions.baudRate = baudRate;
        if (dataBits) rtuOptions.dataBits = dataBits;
        if (stopBits) rtuOptions.stopBits = stopBits;
        if (parity) rtuOptions.parity = parity;
        
        // Use the actual serial port from the device configuration (EXACT same implementation)
        await client.connectRTUBuffered(serialPort, rtuOptions);
        
      } else {
        throw new Error(`Invalid connection configuration: type=${connectionType}, ip=${ip}, port=${port}, serialPort=${serialPort}`);
      }
      
      // Set slave ID (EXACT same logic)
      if (slaveId !== undefined) {
        client.setID(Number(slaveId));
      } else {
        client.setID(1); // Default slave ID
      }
      
      console.log(chalk.green(`${logPrefix} Successfully connected to ${device.name || device._id}`));
      
      // Return connection object with all details
      const connection: ModbusConnection = {
        client,
        connectionType,
        slaveId: Number(slaveId),
        settings: {
          ip: connectionType === 'tcp' ? ip : undefined,
          port: connectionType === 'tcp' ? port : undefined,
          serialPort: connectionType === 'rtu' ? serialPort : undefined,
          baudRate: connectionType === 'rtu' ? baudRate : undefined,
          dataBits: connectionType === 'rtu' ? dataBits : undefined,
          stopBits: connectionType === 'rtu' ? stopBits : undefined,
          parity: connectionType === 'rtu' ? parity : undefined,
        },
        isConnected: true,
        connectedAt: new Date()
      };
      
      return connection;
      
    } catch (error) {
      console.error(chalk.red(`${logPrefix} Connection failed: ${error instanceof Error ? error.message : String(error)}`));
      
      // Ensure client is cleaned up on failure
      try {
        await safeCloseModbusClient(client);
      } catch (cleanupError) {
        console.warn(chalk.yellow(`${logPrefix} Cleanup warning: ${cleanupError}`));
      }
      
      throw error;
    }
  }
  
  /**
   * Connect with retry logic
   * Used by services that need retry capability
   */
  static async connectWithRetries(options: ModbusConnectionOptions): Promise<ModbusConnection> {
    const { retries = 0, retryDelay = 500, logPrefix = '[ModbusConnectionManager]' } = options;
    
    let attempts = 0;
    let lastError: Error;
    
    while (attempts <= retries) {
      try {
        console.log(chalk.blue(`${logPrefix} Connection attempt ${attempts + 1}/${retries + 1}`));
        
        const connection = await this.connect({
          ...options,
          logPrefix: `${logPrefix}[Attempt${attempts + 1}]`
        });
        
        if (attempts > 0) {
          console.log(chalk.green(`${logPrefix} Connection succeeded after ${attempts + 1} attempts`));
        }
        
        return connection;
        
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts > retries) {
          console.log(chalk.red(`${logPrefix} Connection failed after ${attempts} attempts: ${lastError.message}`));
          throw lastError;
        }
        
        console.log(chalk.yellow(`${logPrefix} Attempt ${attempts} failed, retrying in ${retryDelay}ms: ${lastError.message}`));
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw lastError!;
  }
  
  /**
   * Safely disconnect from Modbus device
   * Uses existing safeCloseModbusClient for compatibility
   */
  static async disconnect(connection: ModbusConnection, logPrefix = '[ModbusConnectionManager]'): Promise<void> {
    if (!connection || !connection.client) {
      console.warn(chalk.yellow(`${logPrefix} No connection to disconnect`));
      return;
    }
    
    console.log(chalk.cyan(`${logPrefix} Disconnecting from device`));
    
    try {
      await safeCloseModbusClient(connection.client);
      connection.isConnected = false;
      console.log(chalk.green(`${logPrefix} Successfully disconnected`));
    } catch (error) {
      console.error(chalk.red(`${logPrefix} Disconnect error: ${error instanceof Error ? error.message : String(error)}`));
      throw error;
    }
  }
  
  /**
   * Validate if connection is still active
   */
  static validateConnection(connection: ModbusConnection): boolean {
    if (!connection || !connection.client) {
      return false;
    }
    
    try {
      // Check if client has isOpen property and it's true
      const isOpen = typeof connection.client.isOpen === 'boolean' && connection.client.isOpen;
      return isOpen && connection.isConnected;
    } catch (error) {
      console.warn(chalk.yellow(`[ModbusConnectionManager] Connection validation failed: ${error}`));
      return false;
    }
  }
  
  /**
   * Get connection info for logging/debugging
   */
  static getConnectionInfo(connection: ModbusConnection): string {
    if (!connection) return 'No connection';
    
    const { connectionType, slaveId, settings } = connection;
    
    if (connectionType === 'tcp') {
      return `TCP ${settings.ip}:${settings.port} (Slave ${slaveId})`;
    } else {
      return `RTU ${settings.serialPort} @${settings.baudRate} (Slave ${slaveId})`;
    }
  }
  
  /**
   * Legacy compatibility function
   * Maintains the exact same return format as the original connectToModbusDevice
   */
  static async connectLegacy(device: IDevice): Promise<{ client: ModbusRTU; connectionType: string; slaveId: number }> {
    const connection = await this.connect({ device });
    
    return {
      client: connection.client,
      connectionType: connection.connectionType,
      slaveId: connection.slaveId
    };
  }
}

export default ModbusConnectionManager;