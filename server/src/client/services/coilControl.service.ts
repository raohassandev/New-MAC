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
  readCoilsWithTimeout,
  connectRTUBuffered
} from '../utils/modbusHelper';
import { getDeviceModel } from './device.service';

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
  const client: ModbusRTU | null = new ModbusRTU();
  let deviceName = '';
  
  try {
    console.log(chalk.cyan(`[coilControlService] Starting coil register control operation for device ${deviceId}`));
    console.log(chalk.cyan(`[coilControlService] Setting ${coilType} coil at address ${coilAddress} to ${value}`));
    
    // Validate deviceId
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      throw new Error('Invalid device ID format');
    }
    
    // Use the helper to get the correct device model
    const DeviceModel = await getDeviceModel(requestContext);
    
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
    
    // Get connection settings
    let connectionType: string | undefined;
    let connectionParams: any = {};
    
    // Try the new structure first
    if (device.connectionSetting) {
      const connSetting = device.connectionSetting as IConnectionSetting;
      connectionType = connSetting.connectionType;
      
      if (connectionType === 'tcp' && connSetting.tcp) {
        connectionParams = connSetting.tcp;
      } else if (connectionType === 'rtu' && connSetting.rtu) {
        connectionParams = connSetting.rtu;
      }
    } 
    // Fall back to legacy fields if needed
    else {
      connectionType = device.connectionType;
      connectionParams = {
        ip: device.ip,
        port: device.port,
        slaveId: device.slaveId,
        serialPort: device.serialPort,
        baudRate: device.baudRate,
        dataBits: device.dataBits,
        stopBits: device.stopBits,
        parity: device.parity
      };
    }
    
    if (!connectionType) {
      throw new Error(`Device "${deviceName}" has no connection type defined`);
    }
    
    // Set up connection based on type
    if (connectionType === 'rtu') {
      // RTU Connection
      const { serialPort, baudRate, dataBits, stopBits, parity, slaveId } = connectionParams;
      
      if (!serialPort) {
        throw new Error(`Device "${deviceName}" has no serial port defined`);
      }
      
      // Connect to the device with RTU
      console.log(chalk.yellow(`[coilControlService] Connecting to device via RTU on port ${serialPort}`));
      
      await connectRTUBuffered(client, serialPort as string, {
        baudRate: parseInt(baudRate as string, 10) || 9600,
        dataBits: parseInt(dataBits as string, 10) as 5 | 6 | 7 | 8 || 8,
        stopBits: parseInt(stopBits as string, 10) as 1 | 2 || 1,
        parity: parity as 'none' | 'even' | 'odd' || 'none',
        unitId: parseInt(slaveId as string, 10) || 1,
      });
    } else if (connectionType === 'tcp') {
      // TCP Connection
      const { ip, port, slaveId } = connectionParams;
      
      if (!ip || !port) {
        throw new Error(`Device "${deviceName}" has incomplete TCP connection settings`);
      }
      
      // Connect to the device with TCP
      console.log(chalk.yellow(`[coilControlService] Connecting to device via TCP at ${ip}:${port}`));
      
      await client.connectTCP(ip as string, { port: parseInt(port as string, 10) });
      client.setID(parseInt(slaveId as string, 10) || 1);
    } else {
      throw new Error(`Unknown connection type: ${connectionType}`);
    }
    
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
    // Always close the client
    await safeCloseModbusClient(client);
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
  const client: ModbusRTU | null = new ModbusRTU();
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
    const DeviceModel = await getDeviceModel(requestContext);
    
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
    
    // Get connection settings
    let connectionType: string | undefined;
    let connectionParams: any = {};
    
    // Try the new structure first
    if (device.connectionSetting) {
      const connSetting = device.connectionSetting as IConnectionSetting;
      connectionType = connSetting.connectionType;
      
      if (connectionType === 'tcp' && connSetting.tcp) {
        connectionParams = connSetting.tcp;
      } else if (connectionType === 'rtu' && connSetting.rtu) {
        connectionParams = connSetting.rtu;
      }
    } 
    // Fall back to legacy fields if needed
    else {
      connectionType = device.connectionType;
      connectionParams = {
        ip: device.ip,
        port: device.port,
        slaveId: device.slaveId,
        serialPort: device.serialPort,
        baudRate: device.baudRate,
        dataBits: device.dataBits,
        stopBits: device.stopBits,
        parity: device.parity
      };
    }
    
    if (!connectionType) {
      throw new Error(`Device "${deviceName}" has no connection type defined`);
    }
    
    // Set up connection based on type
    if (connectionType === 'rtu') {
      // RTU Connection
      const { serialPort, baudRate, dataBits, stopBits, parity, slaveId } = connectionParams;
      
      if (!serialPort) {
        throw new Error(`Device "${deviceName}" has no serial port defined`);
      }
      
      // Connect to the device with RTU
      console.log(chalk.yellow(`[coilControlService] Connecting to device via RTU on port ${serialPort}`));
      
      await connectRTUBuffered(client, serialPort as string, {
        baudRate: parseInt(baudRate as string, 10) || 9600,
        dataBits: parseInt(dataBits as string, 10) as 5 | 6 | 7 | 8 || 8,
        stopBits: parseInt(stopBits as string, 10) as 1 | 2 || 1,
        parity: parity as 'none' | 'even' | 'odd' || 'none',
        unitId: parseInt(slaveId as string, 10) || 1,
      });
    } else if (connectionType === 'tcp') {
      // TCP Connection
      const { ip, port, slaveId } = connectionParams;
      
      if (!ip || !port) {
        throw new Error(`Device "${deviceName}" has incomplete TCP connection settings`);
      }
      
      // Connect to the device with TCP
      console.log(chalk.yellow(`[coilControlService] Connecting to device via TCP at ${ip}:${port}`));
      
      await client.connectTCP(ip as string, { port: parseInt(port as string, 10) });
      client.setID(parseInt(slaveId as string, 10) || 1);
    } else {
      throw new Error(`Unknown connection type: ${connectionType}`);
    }
    
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
    // Always close the client
    await safeCloseModbusClient(client);
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
  const client: ModbusRTU | null = new ModbusRTU();
  let deviceName = '';
  
  try {
    console.log(chalk.cyan(`[coilControlService] Starting coil register read operation for device ${deviceId}`));
    console.log(chalk.cyan(`[coilControlService] Reading ${count} ${coilType} coils starting at address ${startAddress}`));
    
    // Validate deviceId
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      throw new Error('Invalid device ID format');
    }
    
    // Use the helper to get the correct device model
    const DeviceModel = await getDeviceModel(requestContext);
    
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
    
    // Get connection settings
    let connectionType: string | undefined;
    let connectionParams: any = {};
    
    // Try the new structure first
    if (device.connectionSetting) {
      const connSetting = device.connectionSetting as IConnectionSetting;
      connectionType = connSetting.connectionType;
      
      if (connectionType === 'tcp' && connSetting.tcp) {
        connectionParams = connSetting.tcp;
      } else if (connectionType === 'rtu' && connSetting.rtu) {
        connectionParams = connSetting.rtu;
      }
    } 
    // Fall back to legacy fields if needed
    else {
      connectionType = device.connectionType;
      connectionParams = {
        ip: device.ip,
        port: device.port,
        slaveId: device.slaveId,
        serialPort: device.serialPort,
        baudRate: device.baudRate,
        dataBits: device.dataBits,
        stopBits: device.stopBits,
        parity: device.parity
      };
    }
    
    if (!connectionType) {
      throw new Error(`Device "${deviceName}" has no connection type defined`);
    }
    
    // Set up connection based on type
    if (connectionType === 'rtu') {
      // RTU Connection
      const { serialPort, baudRate, dataBits, stopBits, parity, slaveId } = connectionParams;
      
      if (!serialPort) {
        throw new Error(`Device "${deviceName}" has no serial port defined`);
      }
      
      // Connect to the device with RTU
      console.log(chalk.yellow(`[coilControlService] Connecting to device via RTU on port ${serialPort}`));
      
      await connectRTUBuffered(client, serialPort as string, {
        baudRate: parseInt(baudRate as string, 10) || 9600,
        dataBits: parseInt(dataBits as string, 10) as 5 | 6 | 7 | 8 || 8,
        stopBits: parseInt(stopBits as string, 10) as 1 | 2 || 1,
        parity: parity as 'none' | 'even' | 'odd' || 'none',
        unitId: parseInt(slaveId as string, 10) || 1,
      });
    } else if (connectionType === 'tcp') {
      // TCP Connection
      const { ip, port, slaveId } = connectionParams;
      
      if (!ip || !port) {
        throw new Error(`Device "${deviceName}" has incomplete TCP connection settings`);
      }
      
      // Connect to the device with TCP
      console.log(chalk.yellow(`[coilControlService] Connecting to device via TCP at ${ip}:${port}`));
      
      await client.connectTCP(ip as string, { port: parseInt(port as string, 10) });
      client.setID(parseInt(slaveId as string, 10) || 1);
    } else {
      throw new Error(`Unknown connection type: ${connectionType}`);
    }
    
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
    // Always close the client
    await safeCloseModbusClient(client);
  }
};