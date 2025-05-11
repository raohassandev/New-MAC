import mongoose from 'mongoose';
import ModbusRTU from 'modbus-serial';
import chalk from 'chalk';
import { IDevice } from '../models/device.model';
import { safeCloseModbusClient } from '../utils/modbusHelper';
import { Device } from '../models/index.model';
import { ensureClientDeviceModel } from '../utils/dbHelper';

// Type for connection settings
interface ConnectionSettings {
  connectionType: 'tcp' | 'rtu';
  ip?: string;
  port?: number | string;
  slaveId?: number | string;
  serialPort?: string;
  baudRate?: number | string;
  dataBits?: number | string;
  stopBits?: number | string;
  parity?: string;
}

// Type for register results
interface RegisterResult {
  name: string;
  registerIndex: number;
  address: number;
  value: any;
  unit: string;
  dataType?: string;
  description?: string;
  error?: string;
}

/**
 * Get a Device model that connects to the client database
 */
export const getDeviceModel = async (reqContext: any): Promise<mongoose.Model<IDevice>> => {
  // Try to get from app.locals
  if (reqContext?.app?.locals?.clientModels?.Device) {
    const DeviceModel = reqContext.app.locals.clientModels.Device;
    //console.log('[deviceService] Using client-specific Device model from app.locals');
    
    // Verify the connection is ready (readyState 1 means connected)
    if (DeviceModel.db?.readyState as number === 1) {
      return DeviceModel;
    } else {
      console.log('[deviceService] Device model from app.locals has invalid connection state:', 
                  DeviceModel.db?.readyState);
    }
  }

  // Use the helper function to ensure we have a valid client model
  try {
    const DeviceModel = await ensureClientDeviceModel(reqContext);
    
    // Verify we got a valid model (readyState 1 means connected)
    if (DeviceModel && DeviceModel.db?.readyState as number === 1) {
      return DeviceModel;
    }
  } catch (error) {
    console.error('[deviceService] Error ensuring client device model:', error);
  }
  
  // If we get here, neither approach worked - use the default Device model as fallback
  // But first, check if the default model's connection is ready (readyState 1 means connected)
  if (Device.db?.readyState as number === 1) {
    //console.log('[deviceService] Using default Device model as fallback');
    return Device;
  }
  
  // If we get here, all approaches failed - attempt to repair the mongoose connection
  try {
    console.warn('[deviceService] All connection attempts failed, attempting to recreate default connection');
    
    // Check if we need to recreate the connection - readyState 1 means connected
    if (mongoose.connection.readyState as number !== 1) {
      // Wait for connection to finish if connecting (readyState 2 means connecting)
      if (mongoose.connection.readyState as number === 2) {
        console.log('[deviceService] Mongoose is connecting, waiting for completion...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // If still not connected, try to reconnect
      if (mongoose.connection.readyState as number !== 1) {
        const clientDbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
        await mongoose.connect(clientDbUri);
        console.log('[deviceService] Reconnected to database');
      }
    }
    
    return Device;
  } catch (reconnectError) {
    console.error('[deviceService] Failed to reconnect to database:', reconnectError);
    
    // At this point, we've tried everything - just return Device and hope for the best
    return Device;
  }
};

/**
 * Connect to a Modbus device based on its connection settings
 */
export const connectToModbusDevice = async (
  device: IDevice
): Promise<{ client: ModbusRTU; connectionType: string; slaveId: number }> => {
  const client = new ModbusRTU();

  // Get connection settings (support both new and legacy format)
  const connectionType =
    device.connectionSetting?.connectionType || device.connectionType || 'tcp';

  // Get TCP settings
  const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : device.ip || '';
  const port = connectionType === 'tcp' ? device.connectionSetting?.tcp?.port : device.port || 0;
  const tcpSlaveId =
    connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;

  // Get RTU settings
  const serialPort =
    connectionType === 'rtu'
      ? device.connectionSetting?.rtu?.serialPort
      : device.serialPort || '';
  const baudRate =
    connectionType === 'rtu' ? device.connectionSetting?.rtu?.baudRate : device.baudRate || 0;
  const dataBits =
    connectionType === 'rtu' ? device.connectionSetting?.rtu?.dataBits : device.dataBits || 0;
  const stopBits =
    connectionType === 'rtu' ? device.connectionSetting?.rtu?.stopBits : device.stopBits || 0;
  const parity =
    connectionType === 'rtu' ? device.connectionSetting?.rtu?.parity : device.parity || '';
  const rtuSlaveId =
    connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;

  // Combined slaveId (prefer the one from the matching connection type)
  const slaveId = connectionType === 'tcp' ? tcpSlaveId : rtuSlaveId || device.slaveId || 1;

  // Apply advanced settings if available
  if (device.advancedSettings) {
    // Set timeout from advanced settings
    if (device.advancedSettings.connectionOptions?.timeout) {
      const timeout = Number(device.advancedSettings.connectionOptions.timeout);
      if (!isNaN(timeout) && timeout > 0) {
        console.log(`[deviceService] Setting timeout to ${timeout}ms from advanced settings`);
        client.setTimeout(timeout);
      }
    }
  }

  // Connect based on connection type
  if (connectionType === 'tcp' && ip && port) {
    await client.connectTCP(ip, { port });
  } else if (connectionType === 'rtu' && serialPort) {
    const rtuOptions: any = {};
    if (baudRate) rtuOptions.baudRate = baudRate;
    if (dataBits) rtuOptions.dataBits = dataBits;
    if (stopBits) rtuOptions.stopBits = stopBits;
    if (parity) rtuOptions.parity = parity;

    // Use the actual serial port from the device configuration
    await client.connectRTUBuffered(serialPort, rtuOptions);
  } else {
    throw new Error('Invalid connection configuration');
  }

  // Set slave ID
  if (slaveId !== undefined) {
    client.setID(Number(slaveId));
  } else {
    client.setID(1); // Default slave ID
  }

  return { client, connectionType, slaveId: Number(slaveId) };
};

/**
 * Get the start address and count for a data point range, with device-specific adjustments
 */
export const getAdjustedAddressAndCount = (
  device: IDevice,
  range: { startAddress: number; count: number }
): { startAddress: number; count: number } => {
  let startAddress = range.startAddress;
  let adjustedCount = range.count;

  // Handle different register addressing conventions based on device make
  if (
    device.make?.toLowerCase().includes('china') ||
    device.make?.toLowerCase().includes('energy analyzer')
  ) {
    // Some Chinese Energy Analyzers use 1-based addressing while Modbus is 0-based
    // No adjustment needed - already uses absolute addressing
    //console.log('[deviceService] Using standard register addressing for Chinese Energy Analyzer');
  } else if (device.advancedSettings?.connectionOptions?.retries === 0) {
    // This is a trick - we're using the retries=0 as a flag for devices that need -1 adjustment
    startAddress = startAddress - 1;
    //console.log(
    //  `[deviceService] Using 0-based register addressing (adjusted from ${range.startAddress} to ${startAddress})`
    //);
  }

  // Always use full register count for all devices
  //console.log(`[deviceService] Using full register count ${adjustedCount} for all devices`);
  
  // We previously limited non-Energy Analyzer devices to 2 registers,
  // but that prevented proper reading of multiple consecutive registers

  return { startAddress, count: adjustedCount };
};

/**
 * Read registers from a Modbus device
 */
export const readModbusRegisters = async (
  client: ModbusRTU,
  fc: number,
  startAddress: number,
  count: number,
  device?: IDevice
): Promise<any> => {
  console.log(chalk.yellow(`[deviceService] Reading ${count} registers using FC${fc} from address ${startAddress}`));
  
  // Get retry settings from device advanced settings if available
  let maxRetries = 0; // Default to no retries
  if (device?.advancedSettings?.connectionOptions?.retries !== undefined) {
    maxRetries = Number(device.advancedSettings.connectionOptions.retries);
    if (isNaN(maxRetries) || maxRetries < 0) {
      maxRetries = 0;
    }
    console.log(`[deviceService] Using retry setting from advanced settings: ${maxRetries}`);
  }

  let retryDelay = 500; // Default retry delay in ms
  if (device?.advancedSettings?.connectionOptions?.retryInterval !== undefined) {
    retryDelay = Number(device.advancedSettings.connectionOptions.retryInterval);
    if (isNaN(retryDelay) || retryDelay < 0) {
      retryDelay = 500;
    }
    console.log(`[deviceService] Using retry delay from advanced settings: ${retryDelay}ms`);
  }
  
  // Function to attempt the read operation with retries
  const attemptReadWithRetries = async (): Promise<any> => {
    let attempts = 0;
    let lastError;
    
    while (attempts <= maxRetries) {
      try {
        let result;
        switch (fc) {
          case 1:
            result = await client.readCoils(startAddress, count);
            break;
          case 2:
            result = await client.readDiscreteInputs(startAddress, count);
            break;
          case 3:
            console.log(chalk.blue(`=== Reading Holding Registers (attempt ${attempts + 1}/${maxRetries + 1}) ===`));
            result = await client.readHoldingRegisters(startAddress, count);
            break;
          case 4:
            result = await client.readInputRegisters(startAddress, count);
            break;
          default:
            result = await client.readHoldingRegisters(startAddress, count);
        }
        
        // Log success and return the result
        if (result && Array.isArray(result.data)) {
          console.log(chalk.green(`[deviceService] Successfully read ${result.data.length} registers from address ${startAddress} using FC${fc}`));
          console.log(chalk.bgGreen.black(`[deviceService] Register values: [${result.data.join(', ')}]`));
          
          if (result.buffer) {
            console.log(chalk.cyan(`[deviceService] Raw buffer: ${result.buffer.toString('hex')}`));
          }
        } else {
          console.log(chalk.red(`[deviceService] Unexpected result format: ${JSON.stringify(result)}`));
        }
        
        return result;
      } catch (error) {
        lastError = error;
        attempts++;
        
        // If we've reached max retries, throw the last error
        if (attempts > maxRetries) {
          console.log(chalk.red(`[deviceService] Failed after ${attempts} attempts: ${(error as Error).message}`));
          throw error;
        }
        
        // Log the retry attempt
        console.log(chalk.yellow(`[deviceService] Read failed (attempt ${attempts}/${maxRetries + 1}), retrying in ${retryDelay}ms: ${(error as Error).message}`));
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // This should never be reached, but TypeScript needs a return value
    throw lastError;
  };
  
  // Execute the read operation with retries
  return attemptReadWithRetries();
};

/**
 * Calculate the relative index of a parameter within a range
 */
export const calculateRelativeIndex = (
  param: any,
  range: { startAddress: number; count: number }
): number => {
  // Check if the parameter's registerIndex is within the range's bounds
  const isWithinRange =
    param.registerIndex >= range.startAddress &&
    param.registerIndex < range.startAddress + range.count;

  // If registerIndex is within the range's bounds, it's likely an absolute address
  if (isWithinRange) {
    const relativeIndex = param.registerIndex - range.startAddress;
    //console.log(
    //  `[deviceService] Using absolute addressing mode: ${param.registerIndex} - ${range.startAddress} = ${relativeIndex}`
    //);
    return relativeIndex;
  }
  
  // If registerIndex is very small, it's likely a direct offset (relative)
  if (param.registerIndex < range.count) {
    //console.log(
    //  `[deviceService] Using relative addressing mode with direct offset: ${param.registerIndex}`
    //);
    return param.registerIndex;
  }
  
  // If none of the above, guess based on whether it's closer to a direct offset or an absolute address
  const asRelative = param.registerIndex;
  const asAbsolute = param.registerIndex - range.startAddress;

  // Choose the one that makes more sense (is in range)
  if (asAbsolute >= 0 && asAbsolute < range.count) {
    //console.log(
    //  `[deviceService] Inferred absolute addressing mode: ${param.registerIndex} - ${range.startAddress} = ${asAbsolute}`
    //);
    return asAbsolute;
  } else {
    // Fallback to treating it as a direct offset but warn about potential issues
    //console.log(
    //  `[deviceService] WARNING: Register index ${param.registerIndex} doesn't align with range ${range.startAddress}-${range.startAddress + range.count - 1}. Using as direct offset.`
    //);
    return asRelative;
  }
};

/**
 * Determine the byte order to use for a given parameter and device
 */
export const getByteOrder = (param: any, device: IDevice): string => {
  // Use the parameter's byte order if specified
  if (param.byteOrder) {
    return param.byteOrder;
  }
  
  // Handle specific manufacturers' defaults
  if (
    device.make?.toLowerCase().includes('china') ||
    device.make?.toLowerCase().includes('energy analyzer')
  ) {
    // China Energy Analyzer typically uses CDAB format
    //console.log('[deviceService] Applying China Energy Analyzer default byte order: CDAB');
    return 'CDAB';
  } else if (device.make?.toLowerCase().includes('schneider')) {
    // Schneider Electric typically uses ABCD format
    //console.log('[deviceService] Applying Schneider Electric default byte order: ABCD');
    return 'ABCD';
  } else if (device.make?.toLowerCase().includes('siemens')) {
    // Siemens typically uses BADC format
    //console.log('[deviceService] Applying Siemens default byte order: BADC');
    return 'BADC';
  } else {
    // Default to ABCD if no specific match
    //console.log('[deviceService] No device-specific byte order found, using default: ABCD');
    return 'ABCD';
  }
};

/**
 * Process a FLOAT32 value from two registers
 */
export const processFloat32 = (reg1: number, reg2: number, byteOrder: string): number | null => {
  // Validate registers are numbers
  if (typeof reg1 !== 'number' || typeof reg2 !== 'number') {
    //console.log(
    //  `[deviceService] Invalid register values: reg1=${reg1}, reg2=${reg2}. Both must be numbers.`
    //);
    
    // Make sure reg1 and reg2 are valid numbers before processing
    const validReg1 = typeof reg1 === 'number' ? reg1 : 0;
    const validReg2 = typeof reg2 === 'number' ? reg2 : 0;
    
    //console.log(`[deviceService] Using fallback values: reg1=${validReg1}, reg2=${validReg2}`);
    
    try {
      const value = processValidRegistersAsFloat(validReg1, validReg2, byteOrder);
      return value;
    } catch (error) {
      console.error('[deviceService] Error processing float value:', error);
      return null;
    }
  } else {
    // Both registers are valid numbers, proceed normally
    try {
      const value = processValidRegistersAsFloat(reg1, reg2, byteOrder);
      return value;
    } catch (error) {
      console.error('[deviceService] Error processing float value:', error);
      return null;
    }
  }
};

/**
 * Process an INT32 value from two registers
 */
export const processInt32 = (reg1: number, reg2: number, byteOrder: string): number | null => {
  // Validate registers are numbers
  if (typeof reg1 !== 'number' || typeof reg2 !== 'number') {
    // Make sure reg1 and reg2 are valid numbers before processing
    const validReg1 = typeof reg1 === 'number' ? reg1 : 0;
    const validReg2 = typeof reg2 === 'number' ? reg2 : 0;
    
    try {
      const value = processValidRegistersAsInt32(validReg1, validReg2, byteOrder);
      return value;
    } catch (error) {
      console.error('[deviceService] Error processing INT32 value:', error);
      return null;
    }
  } else {
    // Both registers are valid numbers, proceed normally
    try {
      const value = processValidRegistersAsInt32(reg1, reg2, byteOrder);
      return value;
    } catch (error) {
      console.error('[deviceService] Error processing INT32 value:', error);
      return null;
    }
  }
};

/**
 * Process a UINT32 value from two registers
 */
export const processUInt32 = (reg1: number, reg2: number, byteOrder: string): number | null => {
  // Validate registers are numbers
  if (typeof reg1 !== 'number' || typeof reg2 !== 'number') {
    // Make sure reg1 and reg2 are valid numbers before processing
    const validReg1 = typeof reg1 === 'number' ? reg1 : 0;
    const validReg2 = typeof reg2 === 'number' ? reg2 : 0;
    
    try {
      const value = processValidRegistersAsUInt32(validReg1, validReg2, byteOrder);
      return value;
    } catch (error) {
      console.error('[deviceService] Error processing UINT32 value:', error);
      return null;
    }
  } else {
    // Both registers are valid numbers, proceed normally
    try {
      const value = processValidRegistersAsUInt32(reg1, reg2, byteOrder);
      return value;
    } catch (error) {
      console.error('[deviceService] Error processing UINT32 value:', error);
      return null;
    }
  }
};

/**
 * Helper function to process valid registers as float
 */
export const processValidRegistersAsFloat = (
  reg1: number,
  reg2: number,
  byteOrder: string
): number | null => {
  try {
    // Log the input values
    console.log(`[processValidRegistersAsFloat] Processing registers: reg1=${reg1} (0x${reg1.toString(16).padStart(4, '0')}), reg2=${reg2} (0x${reg2.toString(16).padStart(4, '0')}), byteOrder=${byteOrder}`);
    
    // Ensure the registers are valid numbers between 0-65535 (16-bit values)
    const validReg1 = typeof reg1 === 'number' && isFinite(reg1) ? 
      Math.max(0, Math.min(65535, Math.floor(reg1))) : 0;
    const validReg2 = typeof reg2 === 'number' && isFinite(reg2) ? 
      Math.max(0, Math.min(65535, Math.floor(reg2))) : 0;
    
    // Report if we had to adjust the register values
    if (validReg1 !== reg1 || validReg2 !== reg2) {
      console.log(`[processValidRegistersAsFloat] Adjusted register values: reg1=${reg1}->${validReg1}, reg2=${reg2}->${validReg2}`);
    }
    
    // Create buffer to store the values
    const buffer = Buffer.alloc(4);
    
    // Normalize byte order to uppercase and ensure valid value
    let mappedByteOrder: string;
    switch ((byteOrder || 'ABCD').toUpperCase()) {
      case 'ABCD': mappedByteOrder = 'ABCD'; break;
      case 'CDAB': mappedByteOrder = 'CDAB'; break;
      case 'BADC': mappedByteOrder = 'BADC'; break;
      case 'DCBA': mappedByteOrder = 'DCBA'; break;
      default: 
        console.log(`[processValidRegistersAsFloat] Unknown byte order '${byteOrder}', using default ABCD`);
        mappedByteOrder = 'ABCD';
    }
    
    console.log(`[processValidRegistersAsFloat] Using byte order: ${mappedByteOrder}`);
    
    // Write the registers to buffer based on byte order
    // We use explicit logic for each byte ordering pattern to ensure correctness
    if (mappedByteOrder === 'ABCD') {
      // ABCD: High word first, high byte first (Big-endian)
      // Reg1: bytes 0-1, Reg2: bytes 2-3
      buffer.writeUInt16BE(validReg1, 0);
      buffer.writeUInt16BE(validReg2, 2);
      console.log(`[processValidRegistersAsFloat] ABCD: Written reg1(0x${validReg1.toString(16).padStart(4, '0')}) at bytes 0-1, reg2(0x${validReg2.toString(16).padStart(4, '0')}) at bytes 2-3`);
    } else if (mappedByteOrder === 'CDAB') {
      // CDAB: Low word first, high byte first (Mixed-endian)
      // Reg2: bytes 0-1, Reg1: bytes 2-3
      buffer.writeUInt16BE(validReg2, 0);
      buffer.writeUInt16BE(validReg1, 2);
      console.log(`[processValidRegistersAsFloat] CDAB: Written reg2(0x${validReg2.toString(16).padStart(4, '0')}) at bytes 0-1, reg1(0x${validReg1.toString(16).padStart(4, '0')}) at bytes 2-3`);
    } else if (mappedByteOrder === 'BADC') {
      // BADC: High word first, low byte first (Mixed-endian)
      // Reg1 with bytes swapped: bytes 0-1, Reg2 with bytes swapped: bytes 2-3
      buffer.writeUInt16LE(validReg1, 0);
      buffer.writeUInt16LE(validReg2, 2);
      console.log(`[processValidRegistersAsFloat] BADC: Written reg1(0x${validReg1.toString(16).padStart(4, '0')}) byte-swapped at bytes 0-1, reg2(0x${validReg2.toString(16).padStart(4, '0')}) byte-swapped at bytes 2-3`);
    } else if (mappedByteOrder === 'DCBA') {
      // DCBA: Low word first, low byte first (Little-endian)
      // Reg2 with bytes swapped: bytes 0-1, Reg1 with bytes swapped: bytes 2-3
      buffer.writeUInt16LE(validReg2, 0);
      buffer.writeUInt16LE(validReg1, 2);
      console.log(`[processValidRegistersAsFloat] DCBA: Written reg2(0x${validReg2.toString(16).padStart(4, '0')}) byte-swapped at bytes 0-1, reg1(0x${validReg1.toString(16).padStart(4, '0')}) byte-swapped at bytes 2-3`);
    }
    
    // Log the buffer content in hexadecimal
    console.log(`[processValidRegistersAsFloat] Buffer hex: ${buffer.toString('hex')}`);
    
    // Reading the float depends on the overall endianness pattern
    let value: number;
    
    // For ABCD and CDAB, the bytes within each 16-bit word are in big-endian order,
    // so we should read the entire 32-bits as big-endian
    if (mappedByteOrder === 'ABCD' || mappedByteOrder === 'CDAB') {
      value = buffer.readFloatBE(0);
      console.log(`[processValidRegistersAsFloat] Reading as BigEndian float: ${value}`);
    } 
    // For BADC and DCBA, the bytes within each 16-bit word are in little-endian order,
    // so we should read the entire 32-bits as little-endian
    else {
      value = buffer.readFloatLE(0);
      console.log(`[processValidRegistersAsFloat] Reading as LittleEndian float: ${value}`);
    }
    
    // Check for NaN, Infinity, or extremely small values close to zero
    if (!isFinite(value)) {
      console.log(`[processValidRegistersAsFloat] Value is not finite (${value}), returning 0`);
      return 0; // Return 0 instead of null for invalid values
    }
    
    // Handle extremely small values that are likely precision errors
    if (Math.abs(value) < 1e-30) {
      console.log(`[processValidRegistersAsFloat] Value is too small (${value}), returning 0`);
      return 0;
    }
    
    // Round to 6 decimal places to avoid potential JSON serialization issues
    // For most industrial sensors, 6 decimal places is more than enough precision
    const roundedValue = Number(value.toFixed(6));
    console.log(`[processValidRegistersAsFloat] Final rounded value (6 decimals): ${roundedValue}`);
    return roundedValue;
  } catch (error) {
    console.error('[deviceService] Buffer operation error:', error);
    return null;
  }
};

/**
 * Helper function to process valid registers as INT32
 */
export const processValidRegistersAsInt32 = (
  reg1: number,
  reg2: number,
  byteOrder: string
): number | null => {
  try {
    // Log the input values
    console.log(`[processValidRegistersAsInt32] Processing registers: reg1=${reg1} (0x${reg1.toString(16).padStart(4, '0')}), reg2=${reg2} (0x${reg2.toString(16).padStart(4, '0')}), byteOrder=${byteOrder}`);
    
    // Ensure the registers are valid numbers between 0-65535 (16-bit values)
    const validReg1 = typeof reg1 === 'number' && isFinite(reg1) ? 
      Math.max(0, Math.min(65535, Math.floor(reg1))) : 0;
    const validReg2 = typeof reg2 === 'number' && isFinite(reg2) ? 
      Math.max(0, Math.min(65535, Math.floor(reg2))) : 0;
    
    // Report if we had to adjust the register values
    if (validReg1 !== reg1 || validReg2 !== reg2) {
      console.log(`[processValidRegistersAsInt32] Adjusted register values: reg1=${reg1}->${validReg1}, reg2=${reg2}->${validReg2}`);
    }
    
    const buffer = Buffer.alloc(4);
    
    // Normalize byte order to uppercase and ensure valid value
    let mappedByteOrder: string;
    switch ((byteOrder || 'ABCD').toUpperCase()) {
      case 'ABCD': mappedByteOrder = 'ABCD'; break;
      case 'CDAB': mappedByteOrder = 'CDAB'; break;
      case 'BADC': mappedByteOrder = 'BADC'; break;
      case 'DCBA': mappedByteOrder = 'DCBA'; break;
      default: 
        console.log(`[processValidRegistersAsInt32] Unknown byte order '${byteOrder}', using default ABCD`);
        mappedByteOrder = 'ABCD';
    }
    
    console.log(`[processValidRegistersAsInt32] Using byte order: ${mappedByteOrder}`);
    
    // Write the registers to buffer based on byte order
    // We use explicit logic for each byte ordering pattern to ensure correctness
    if (mappedByteOrder === 'ABCD') {
      // ABCD: High word first, high byte first (Big-endian)
      buffer.writeUInt16BE(validReg1, 0);
      buffer.writeUInt16BE(validReg2, 2);
      console.log(`[processValidRegistersAsInt32] ABCD: Written reg1(0x${validReg1.toString(16).padStart(4, '0')}) at bytes 0-1, reg2(0x${validReg2.toString(16).padStart(4, '0')}) at bytes 2-3`);
    } else if (mappedByteOrder === 'CDAB') {
      // CDAB: Low word first, high byte first (Mixed-endian)
      buffer.writeUInt16BE(validReg2, 0);
      buffer.writeUInt16BE(validReg1, 2);
      console.log(`[processValidRegistersAsInt32] CDAB: Written reg2(0x${validReg2.toString(16).padStart(4, '0')}) at bytes 0-1, reg1(0x${validReg1.toString(16).padStart(4, '0')}) at bytes 2-3`);
    } else if (mappedByteOrder === 'BADC') {
      // BADC: High word first, low byte first (Mixed-endian)
      buffer.writeUInt16LE(validReg1, 0);
      buffer.writeUInt16LE(validReg2, 2);
      console.log(`[processValidRegistersAsInt32] BADC: Written reg1(0x${validReg1.toString(16).padStart(4, '0')}) byte-swapped at bytes 0-1, reg2(0x${validReg2.toString(16).padStart(4, '0')}) byte-swapped at bytes 2-3`);
    } else if (mappedByteOrder === 'DCBA') {
      // DCBA: Low word first, low byte first (Little-endian)
      buffer.writeUInt16LE(validReg2, 0);
      buffer.writeUInt16LE(validReg1, 2);
      console.log(`[processValidRegistersAsInt32] DCBA: Written reg2(0x${validReg2.toString(16).padStart(4, '0')}) byte-swapped at bytes 0-1, reg1(0x${validReg1.toString(16).padStart(4, '0')}) byte-swapped at bytes 2-3`);
    }
    
    // Log the buffer content in hexadecimal
    console.log(`[processValidRegistersAsInt32] Buffer hex: ${buffer.toString('hex')}`);
    
    // Reading the int32 depends on the overall endianness pattern
    let value: number;
    
    // For ABCD and CDAB, read as big-endian
    if (mappedByteOrder === 'ABCD' || mappedByteOrder === 'CDAB') {
      value = buffer.readInt32BE(0);
      console.log(`[processValidRegistersAsInt32] Reading as BigEndian Int32: ${value}`);
    } 
    // For BADC and DCBA, read as little-endian
    else {
      value = buffer.readInt32LE(0);
      console.log(`[processValidRegistersAsInt32] Reading as LittleEndian Int32: ${value}`);
    }
    
    return value;
  } catch (error) {
    console.error('[deviceService] Buffer operation error:', error);
    return null;
  }
};

/**
 * Helper function to process valid registers as UINT32
 */
export const processValidRegistersAsUInt32 = (
  reg1: number,
  reg2: number,
  byteOrder: string
): number | null => {
  try {
    // Log the input values
    console.log(`[processValidRegistersAsUInt32] Processing registers: reg1=${reg1} (0x${reg1.toString(16).padStart(4, '0')}), reg2=${reg2} (0x${reg2.toString(16).padStart(4, '0')}), byteOrder=${byteOrder}`);
    
    // Ensure the registers are valid numbers between 0-65535 (16-bit values)
    const validReg1 = typeof reg1 === 'number' && isFinite(reg1) ? 
      Math.max(0, Math.min(65535, Math.floor(reg1))) : 0;
    const validReg2 = typeof reg2 === 'number' && isFinite(reg2) ? 
      Math.max(0, Math.min(65535, Math.floor(reg2))) : 0;
    
    // Report if we had to adjust the register values
    if (validReg1 !== reg1 || validReg2 !== reg2) {
      console.log(`[processValidRegistersAsUInt32] Adjusted register values: reg1=${reg1}->${validReg1}, reg2=${reg2}->${validReg2}`);
    }
    
    const buffer = Buffer.alloc(4);
    
    // Normalize byte order to uppercase and ensure valid value
    let mappedByteOrder: string;
    switch ((byteOrder || 'ABCD').toUpperCase()) {
      case 'ABCD': mappedByteOrder = 'ABCD'; break;
      case 'CDAB': mappedByteOrder = 'CDAB'; break;
      case 'BADC': mappedByteOrder = 'BADC'; break;
      case 'DCBA': mappedByteOrder = 'DCBA'; break;
      default: 
        console.log(`[processValidRegistersAsUInt32] Unknown byte order '${byteOrder}', using default ABCD`);
        mappedByteOrder = 'ABCD';
    }
    
    console.log(`[processValidRegistersAsUInt32] Using byte order: ${mappedByteOrder}`);
    
    // Write the registers to buffer based on byte order
    // We use explicit logic for each byte ordering pattern to ensure correctness
    if (mappedByteOrder === 'ABCD') {
      // ABCD: High word first, high byte first (Big-endian)
      buffer.writeUInt16BE(validReg1, 0);
      buffer.writeUInt16BE(validReg2, 2);
      console.log(`[processValidRegistersAsUInt32] ABCD: Written reg1(0x${validReg1.toString(16).padStart(4, '0')}) at bytes 0-1, reg2(0x${validReg2.toString(16).padStart(4, '0')}) at bytes 2-3`);
    } else if (mappedByteOrder === 'CDAB') {
      // CDAB: Low word first, high byte first (Mixed-endian)
      buffer.writeUInt16BE(validReg2, 0);
      buffer.writeUInt16BE(validReg1, 2);
      console.log(`[processValidRegistersAsUInt32] CDAB: Written reg2(0x${validReg2.toString(16).padStart(4, '0')}) at bytes 0-1, reg1(0x${validReg1.toString(16).padStart(4, '0')}) at bytes 2-3`);
    } else if (mappedByteOrder === 'BADC') {
      // BADC: High word first, low byte first (Mixed-endian)
      buffer.writeUInt16LE(validReg1, 0);
      buffer.writeUInt16LE(validReg2, 2);
      console.log(`[processValidRegistersAsUInt32] BADC: Written reg1(0x${validReg1.toString(16).padStart(4, '0')}) byte-swapped at bytes 0-1, reg2(0x${validReg2.toString(16).padStart(4, '0')}) byte-swapped at bytes 2-3`);
    } else if (mappedByteOrder === 'DCBA') {
      // DCBA: Low word first, low byte first (Little-endian)
      buffer.writeUInt16LE(validReg2, 0);
      buffer.writeUInt16LE(validReg1, 2);
      console.log(`[processValidRegistersAsUInt32] DCBA: Written reg2(0x${validReg2.toString(16).padStart(4, '0')}) byte-swapped at bytes 0-1, reg1(0x${validReg1.toString(16).padStart(4, '0')}) byte-swapped at bytes 2-3`);
    }
    
    // Log the buffer content in hexadecimal
    console.log(`[processValidRegistersAsUInt32] Buffer hex: ${buffer.toString('hex')}`);
    
    // Reading the uint32 depends on the overall endianness pattern
    let value: number;
    
    // For ABCD and CDAB, read as big-endian
    if (mappedByteOrder === 'ABCD' || mappedByteOrder === 'CDAB') {
      value = buffer.readUInt32BE(0);
      console.log(`[processValidRegistersAsUInt32] Reading as BigEndian UInt32: ${value}`);
    } 
    // For BADC and DCBA, read as little-endian
    else {
      value = buffer.readUInt32LE(0);
      console.log(`[processValidRegistersAsUInt32] Reading as LittleEndian UInt32: ${value}`);
    }
    
    return value;
  } catch (error) {
    console.error('[deviceService] Buffer operation error:', error);
    return null;
  }
};

/**
 * Process and format a raw value according to parameter specifications
 */
export const processAndFormatValue = (
  value: any,
  param: any
): any => {
  if (value === null || value === undefined) {
    console.log(`[deviceService] Skipping scaling/formatting for "${param.name}" because value is ${value}`);
    return value;
  }
  
  // Make sure value is a number before applying scaling
  if (typeof value !== 'number') {
    console.log(
      `[deviceService] Warning: Value for "${param.name}" is not a number (${typeof value}: ${value}), attempting to convert`
    );
    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
      value = numericValue;
      console.log(`[deviceService] Successfully converted value for "${param.name}" to number: ${value}`);
    } else {
      console.log(`[deviceService] Could not convert value for "${param.name}" to number, setting to null`);
      return null;
    }
  }
  
  // Check for invalid values early
  if (!isFinite(value)) {
    console.log(`[deviceService] Value for "${param.name}" is not finite (${value}), returning null`);
    return null;
  }
  
  let originalValue = value;
  let appliedOperations = [];
  
  // Apply scaling factor if defined
  if (param.scalingFactor !== undefined && param.scalingFactor !== 1 && isFinite(param.scalingFactor)) {
    try {
      originalValue = value;
      const scalingFactor = Number(param.scalingFactor);
      
      if (!isNaN(scalingFactor) && isFinite(scalingFactor) && scalingFactor !== 0) {
        value = value * scalingFactor;
        console.log(`[deviceService] Applied scaling factor for "${param.name}": ${originalValue} * ${scalingFactor} = ${value}`);
        appliedOperations.push('scaling factor');
        
        // Check for invalid results
        if (!isFinite(value)) {
          console.log(`[deviceService] Warning: Scaling factor for "${param.name}" resulted in ${value}, reverting to original value`);
          value = originalValue;
          appliedOperations.pop(); // Remove the last operation
        }
      } else {
        console.log(`[deviceService] Warning: Invalid scaling factor for "${param.name}": ${param.scalingFactor}, skipping`);
      }
    } catch (error) {
      console.error(`[deviceService] Error applying scaling factor for "${param.name}":`, error);
      value = originalValue; // Revert to original value on error
    }
  }
  
  // Apply scaling equation if defined
  if (param.scalingEquation && typeof param.scalingEquation === 'string' && param.scalingEquation.trim() !== '') {
    try {
      originalValue = value;
      
      // Simple equation evaluation (x is the value)
      const x = value;
      
      // Verify this looks like a mathematical equation
      const equationPattern = /^[0-9x\s\+\-\*\/\(\)\.\,\^\%\&\|]+$/;
      if (equationPattern.test(param.scalingEquation)) {
        // Use Function constructor to safely evaluate the equation
        value = new Function('x', `return ${param.scalingEquation}`)(x);
        console.log(`[deviceService] Applied scaling equation for "${param.name}": ${param.scalingEquation} with x=${originalValue}, result=${value}`);
        appliedOperations.push('scaling equation');
        
        // Check for invalid results
        if (!isFinite(value)) {
          console.log(`[deviceService] Warning: Equation for "${param.name}" resulted in ${value}, reverting to original value`);
          value = originalValue;
          appliedOperations.pop(); // Remove the last operation
        }
      } else {
        console.log(`[deviceService] Warning: Scaling equation for "${param.name}" contains disallowed characters, skipping: ${param.scalingEquation}`);
      }
    } catch (error) {
      console.error(`[deviceService] Scaling equation error for "${param.name}":`, error);
      value = originalValue; // Keep the original value if the equation fails
    }
  }
  
  // Format decimal places if defined
  if (param.decimalPoint !== undefined && isFinite(param.decimalPoint)) {
    try {
      originalValue = value;
      const decimalPoints = Number(param.decimalPoint);
      
      if (!isNaN(decimalPoints) && isFinite(decimalPoints) && decimalPoints >= 0) {
        // Check if value is extremely small before formatting
        if (Math.abs(value) < Math.pow(10, -decimalPoints)) {
          // For very small values, preserve scientific notation or original value
          console.log(`[deviceService] Value ${value} for "${param.name}" is too small for ${decimalPoints} decimal places, preserving original`);
        } else {
          // For normal values, format decimal places - use Number to avoid trailing zeros
          value = Number(value.toFixed(decimalPoints));
          console.log(`[deviceService] Formatted decimal places for "${param.name}": ${originalValue} to ${decimalPoints} places = ${value}`);
          appliedOperations.push('decimal formatting');
        }
      } else {
        console.log(`[deviceService] Warning: Invalid decimalPoint for "${param.name}": ${param.decimalPoint}, skipping`);
      }
    } catch (error) {
      console.error(`[deviceService] Error formatting decimal places for "${param.name}":`, error);
      value = originalValue; // Revert to original on error
    }
  }
  
  // Apply min/max constraints if defined
  if (typeof value === 'number') {
    originalValue = value;
    
    // Apply maximum constraint if defined and valid
    if (param.maxValue !== undefined && isFinite(param.maxValue)) {
      const maxValue = Number(param.maxValue);
      if (!isNaN(maxValue) && isFinite(maxValue) && value > maxValue) {
        console.log(`[deviceService] Value ${value} for "${param.name}" exceeds maxValue ${maxValue}, clamping`);
        value = maxValue;
        appliedOperations.push('max constraint');
      }
    }
    
    // Apply minimum constraint if defined and valid
    if (param.minValue !== undefined && isFinite(param.minValue)) {
      const minValue = Number(param.minValue);
      if (!isNaN(minValue) && isFinite(minValue) && value < minValue) {
        console.log(`[deviceService] Value ${value} for "${param.name}" below minValue ${minValue}, clamping`);
        value = minValue;
        appliedOperations.push('min constraint');
      }
    }
  }
  
  // Log a summary of all operations applied
  if (appliedOperations.length > 0) {
    console.log(`[deviceService] Summary for "${param.name}": Applied ${appliedOperations.join(', ')} - Final value: ${value}`);
  } else {
    console.log(`[deviceService] No scaling or formatting operations applied for "${param.name}" - Value unchanged: ${value}`);
  }
  
  return value;
};

/**
 * Process a single parameter from Modbus data
 */
export const processParameter = async (
  param: any,
  result: any,
  relativeIndex: number,
  device: IDevice
): Promise<any> => {
  let value: any;
  
  try {
    // Enhanced logging for debugging
    console.log(`[deviceService] Processing parameter "${param.name}" of type ${param.dataType || 'Unknown'} at relative index ${relativeIndex}`);
    
    // Check if result is valid
    if (!result || !result.data || !Array.isArray(result.data)) {
      console.error(`[deviceService] Invalid result data for parameter "${param.name}": `, result);
      return null;
    }
    
    // Log available data for debugging
    console.log(`[deviceService] Available data length: ${result.data.length}, needed index: ${relativeIndex}`);
    
    // Handle data types that span multiple registers
    if ((param.dataType === 'FLOAT32' || 
         param.dataType === 'INT32' || 
         param.dataType === 'UINT32') && 
        (param.wordCount === 2 || !param.wordCount)) { // Make wordCount optional (default to 2 for these types)
      
      // For multi-word data types, we need to read two consecutive registers
      // Check if we have enough data
      if (result.data.length <= relativeIndex || result.data.length <= relativeIndex + 1) {
        console.error(
          `[deviceService] Cannot read ${param.dataType} for "${param.name}" - data too short. Need indices ${relativeIndex} and ${relativeIndex + 1}, but data length is ${result.data.length}`
        );
        return null;
      }
      
      // Get the byte order for this parameter based on device make
      const byteOrder = getByteOrder(param, device);
      
      // Get the two registers needed for multi-register data types
      const reg1 = result.data[relativeIndex];
      const reg2 = result.data[relativeIndex + 1];
      
      console.log(`[deviceService] Processing ${param.dataType} value from registers: [${reg1} (0x${reg1.toString(16).padStart(4, '0')}), ${reg2} (0x${reg2.toString(16).padStart(4, '0')})] with byte order ${byteOrder}`);
      
      // Make sure the registers are valid numbers
      if (typeof reg1 !== 'number' || typeof reg2 !== 'number' || !isFinite(reg1) || !isFinite(reg2)) {
        console.error(`[deviceService] Invalid register values for "${param.name}": reg1=${reg1}, reg2=${reg2}`);
        return null;
      }
      
      // Process based on data type with improved error handling
      try {
        if (param.dataType === 'FLOAT32') {
          value = processFloat32(reg1, reg2, byteOrder);
          
          // Additional validation for FLOAT32 values
          if (value !== null && (!isFinite(value) || Math.abs(value) > 3.4e38)) {
            console.error(`[deviceService] Invalid FLOAT32 value for "${param.name}": ${value} (out of range)`);
            value = null;
          }
        } else if (param.dataType === 'INT32') {
          value = processInt32(reg1, reg2, byteOrder);
          
          // Additional validation for INT32 values
          if (value !== null && (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)) {
            console.error(`[deviceService] Invalid INT32 value for "${param.name}": ${value} (out of range)`);
            value = null;
          }
        } else if (param.dataType === 'UINT32') {
          value = processUInt32(reg1, reg2, byteOrder);
          
          // Additional validation for UINT32 values
          if (value !== null && (!Number.isInteger(value) || value < 0 || value > 4294967295)) {
            console.error(`[deviceService] Invalid UINT32 value for "${param.name}": ${value} (out of range)`);
            value = null;
          }
        }
        
        if (value !== null) {
          console.log(`[deviceService] Successfully processed ${param.dataType} value for "${param.name}": ${value}`);
        } else {
          console.error(`[deviceService] Failed to process ${param.dataType} value for "${param.name}"`);
        }
      } catch (processingError) {
        console.error(`[deviceService] Error processing ${param.dataType} for "${param.name}":`, processingError);
        value = null;
      }
    } else {
      // Standard single register processing for UINT16, INT16, etc.
      if (result.data.length <= relativeIndex) {
        console.error(
          `[deviceService] Cannot read register for "${param.name}" at index ${relativeIndex} - data too short.`
        );
        return null;
      }
      
      // Get the raw register value
      value = result.data[relativeIndex];
      
      // Validate the register value
      if (typeof value !== 'number' || !isFinite(value)) {
        console.error(`[deviceService] Invalid register value for "${param.name}": ${value}`);
        return null;
      }
      
      // Process single register values based on data type
      if (param.dataType === 'INT16') {
        // Convert from unsigned 16-bit to signed 16-bit
        if (value > 32767) {
          value = value - 65536;
        }
        console.log(`[deviceService] Converted UINT16 (${result.data[relativeIndex]}) to INT16: ${value}`);
      } else {
        console.log(`[deviceService] Using raw register value for "${param.name}": ${value}`);
      }
    }
    
    // Apply additional processing (scaling, equations, etc.)
    if (value !== null) {
      value = processAndFormatValue(value, param);
      console.log(`[deviceService] Final value for "${param.name}" after formatting: ${value}${param.unit ? ' ' + param.unit : ''}`);
    }
    
    return value;
  } catch (error) {
    console.error(`[deviceService] Unhandled error processing parameter "${param.name}":`, error);
    return null;
  }
};

/**
 * Read registers from a Modbus device based on its configuration
 */
export const readDeviceRegistersData = async (device: IDevice): Promise<RegisterResult[]> => {
  const readings: RegisterResult[] = [];
  let client: ModbusRTU | null = null;
  
  try {
    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;
    
    if (!hasNewConfig && !hasLegacyConfig) {
      throw new Error('No data points or registers configured for this device');
    }
    
    // Connect to the device
    const connection = await connectToModbusDevice(device);
    client = connection.client;
    
    // NEW STRUCTURE: Read each data point
    if (hasNewConfig && device.dataPoints) {
      //console.log(`[deviceService] Reading from device data points: ${device.dataPoints.length} points`);
      
      for (const dataPoint of device.dataPoints) {
        try {
          const range = dataPoint.range;
          const parser = dataPoint.parser;
          
          // Get adjusted address and count
          const { startAddress, count } = getAdjustedAddressAndCount(device, range);
          
          // Read registers with device context for advanced settings
          const result = await readModbusRegisters(client, range.fc, startAddress, count, device);
          
          // Process the result based on parser configuration
          if (parser && parser.parameters) {
            //console.log(`[deviceService] Processing parser with ${parser.parameters.length} parameters`);
            
            for (const param of parser.parameters) {
              try {
                //console.log(
                //  `[deviceService] Processing parameter: ${param.name}, registerIndex: ${param.registerIndex}, dataType: ${param.dataType}`
                //);
                
                // Calculate relative index
                const relativeIndex = calculateRelativeIndex(param, range);
                
                if (relativeIndex < 0 || relativeIndex >= count) {
                  //console.log(
                  //  `[deviceService] Parameter ${param.name} index out of range: ${relativeIndex} not in [0-${count - 1}]`
                  //);
                  continue; // Skip if out of range
                }
                
                // Process the parameter value
                const value = await processParameter(param, result, relativeIndex, device);
                
                // Add to readings
                readings.push({
                  name: param.name,
                  registerIndex: param.registerIndex,
                  address: param.registerIndex, // Added for frontend compatibility
                  value: value,
                  unit: param.unit || '',
                  dataType: param.dataType,
                  description: param.description || '',
                });
              } catch (paramError: any) {
                console.error(`[deviceService] Error processing parameter ${param.name}:`, paramError);
                readings.push({
                  name: param.name,
                  registerIndex: param.registerIndex,
                  address: param.registerIndex,
                  value: null,
                  unit: param.unit || '',
                  error: paramError.message,
                });
              }
            }
          }
        } catch (rangeError: any) {
          console.error(
            `Error reading range (${dataPoint.range.startAddress}-${dataPoint.range.startAddress + dataPoint.range.count - 1}):`,
            rangeError
          );
          // Continue to next range even if this one fails
        }
      }
    }
    // LEGACY STRUCTURE: Read each configured register
    else if (hasLegacyConfig && device.registers) {
      for (const register of device.registers) {
        try {
          const result = await client.readHoldingRegisters(register.address, register.length);
          
          // Process the result based on register configuration
          let value = result.data[0];
          
          // Apply scale factor if defined
          if (register.scaleFactor && register.scaleFactor !== 1) {
            value = value / register.scaleFactor;
          }
          
          // Format decimal places if defined
          if (register.decimalPoint && register.decimalPoint > 0) {
            value = parseFloat(value.toFixed(register.decimalPoint));
          }
          
          readings.push({
            name: register.name,
            registerIndex: register.address,
            address: register.address,
            value: value,
            unit: register.unit || '',
          });
        } catch (registerError: any) {
          readings.push({
            name: register.name,
            registerIndex: register.address,
            address: register.address,
            value: null,
            unit: register.unit || '',
            error: registerError.message,
          });
        }
      }
    }
    
    // Log the final readings array
    //console.log(
    //  `[deviceService] Final readings results (${readings.length} values):`,
    //  JSON.stringify(readings, null, 1)
    //);
    
    return readings;
  } finally {
    // Always close the client
    if (client) {
      await safeCloseModbusClient(client);
    }
  }
};

/**
 * Main function to read registers from a device by ID
 */
export const readDeviceRegisters = async (
  deviceId: string,
  reqContext: any
): Promise<{ deviceId: string; deviceName: string; timestamp: Date; readings: RegisterResult[] }> => {
  let device: IDevice | null = null;
  
  try {
    // Get the device model
    const DeviceModel = await getDeviceModel(reqContext);
    
    // Find the device
    device = await DeviceModel.findById(deviceId);

    
    if (!device) {
      throw new Error('Device not found');
    }
    
    if (!device.enabled) {
      throw new Error('Device is disabled');
    }
    
    // Read device registers
    const readings = await readDeviceRegistersData(device);
    
    //console.log(chalk.bgGreen.black(JSON.stringify(readings)));
    
    // Update device lastSeen timestamp
    device.lastSeen = new Date();
    await device.save();


    
    
    // Return the result
    return {
      deviceId: device._id.toString(),
      deviceName: device.name,
      timestamp: new Date(),
      readings,
    };
  } catch (error: any) {
    console.error('Read registers error:', error);
    throw error;
  }
};




/**
 * Test connection to a Modbus device
 * This is a modularized version of the testDeviceConnection controller
 */
/**
 * Test function for verifying the register reading and parsing logic
 */
export const testModbusParser = (
  registers: number[],
  dataType: string = 'FLOAT32',
  byteOrder: string = 'ABCD'
): any => {
  try {
    console.log(`=== Testing Modbus Parser for ${dataType} ===`);
    console.log(`Input registers: [${registers.join(', ')}]`);
    console.log(`Byte order: ${byteOrder}`);
    
    let result: any = null;
    
    // Process based on data type
    if (dataType === 'FLOAT32' && registers.length >= 2) {
      result = processFloat32(registers[0], registers[1], byteOrder);
      console.log(`Processed FLOAT32 value: ${result}`);
    } else if (dataType === 'INT32' && registers.length >= 2) {
      result = processInt32(registers[0], registers[1], byteOrder);
      console.log(`Processed INT32 value: ${result}`);
    } else if (dataType === 'UINT32' && registers.length >= 2) {
      result = processUInt32(registers[0], registers[1], byteOrder);
      console.log(`Processed UINT32 value: ${result}`);
    } else {
      console.log(`Single register value: ${registers[0]}`);
      result = registers[0];
    }
    
    return result;
  } catch (error) {
    console.error(`Error testing parser: ${error}`);
    return null;
  }
};

export const testConnection = async (
  deviceId: string, 
  reqContext: any
): Promise<{
  success: boolean;
  message: string;
  deviceInfo?: any;
  error?: string;
  troubleshooting?: string;
  errorType?: string;
  timestamp: string;
  status: string;
}> => {
  let device: IDevice | null = null;
  let client: ModbusRTU | null = null;
  
  try {
    console.log(chalk.bgYellow.white('[deviceService] Starting device connection test'));
    
    // Get the device model
    const DeviceModel = await getDeviceModel(reqContext);
    
    // Find the device
    device = await DeviceModel.findById(deviceId);
    
    if (!device) {
      return {
        success: false,
        message: 'Device not found',
        errorType: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
        status: 'ERROR'
      };
    }
    
    if (!device.enabled) {
      return {
        success: false,
        message: 'Device is disabled',
        errorType: 'DEVICE_DISABLED',
        deviceInfo: {
          name: device.name,
          id: device._id,
        },
        timestamp: new Date().toISOString(),
        status: 'ERROR'
      };
    }
    
    // Get connection timeout from advanced settings or use default
    let connectionTimeout = 10000; // Default: 10 seconds
    
    if (device.advancedSettings?.connectionOptions?.timeout) {
      const configuredTimeout = Number(device.advancedSettings.connectionOptions.timeout);
      if (!isNaN(configuredTimeout) && configuredTimeout > 0) {
        connectionTimeout = configuredTimeout;
        console.log(chalk.cyan(`[deviceService] Using timeout from advanced settings: ${connectionTimeout}ms`));
      }
    }
    
    // Get connection settings (support both new and legacy format)
    const connectionType =
      device.connectionSetting?.connectionType || device.connectionType || 'tcp';
    
    // Get TCP settings
    const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : device.ip || '';
    const port = connectionType === 'tcp' ? device.connectionSetting?.tcp?.port : device.port || 0;
    const tcpSlaveId =
      connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;
    
    // Get RTU settings
    const serialPort =
      connectionType === 'rtu'
        ? device.connectionSetting?.rtu?.serialPort
        : device.serialPort || '';
    const baudRate =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.baudRate : device.baudRate || 0;
    const dataBits =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.dataBits : device.dataBits || 0;
    const stopBits =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.stopBits : device.stopBits || 0;
    const parity =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.parity : device.parity || '';
    const rtuSlaveId =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;
    
    // Combined slaveId (prefer the one from the matching connection type)
    const slaveId = connectionType === 'tcp' ? tcpSlaveId : rtuSlaveId || device.slaveId || 1;
    
    // Log connection details for debugging
    console.log(
      chalk.cyan(
        `[deviceService] Testing connection to ${connectionType.toUpperCase()} device:`,
      ),
    );
    if (connectionType === 'tcp') {
      console.log(chalk.cyan(`[deviceService] IP: ${ip}, Port: ${port}, SlaveID: ${slaveId}`));
    } else {
      console.log(
        chalk.cyan(
          `[deviceService] Serial Port: ${serialPort}, Baud Rate: ${baudRate}, SlaveID: ${slaveId}`,
        ),
      );
    }
    
    // Create a standard client to use existing code
    client = new ModbusRTU();
    
    try {
      // Connect based on connection type
      if (connectionType === 'tcp' && ip && port) {
        // Set a timeout for TCP connection
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error(`Connection timeout after ${connectionTimeout}ms`)),
            connectionTimeout,
          );
        });
        
        // Race the connection and timeout
        await Promise.race([client.connectTCP(ip, { port }), timeoutPromise]);
        
        console.log(
          chalk.green(`[deviceService] Successfully connected to TCP device at ${ip}:${port}`),
        );
      } else if (connectionType === 'rtu' && serialPort) {
        const rtuOptions: any = {};
        if (baudRate) rtuOptions.baudRate = baudRate;
        if (dataBits) rtuOptions.dataBits = dataBits;
        if (stopBits) rtuOptions.stopBits = stopBits;
        if (parity) rtuOptions.parity = parity;
        
        // Use our helper function for RTU connections to avoid port contention
        await safeCloseModbusClient(client); // Close the standard client first
        
        // Import function dynamically to avoid circular dependency
        const { createModbusRTUClient } = await import('../utils/modbusHelper');
        
        client = await createModbusRTUClient(serialPort, {
          baudRate: baudRate || 9600,
          dataBits: (dataBits as 5 | 6 | 7 | 8) || 8,
          stopBits: (stopBits as 1 | 2) || 1,
          parity: (parity as 'none' | 'even' | 'odd') || 'none',
          timeout: connectionTimeout,
          unitId: slaveId,
        });
        
        console.log(
          chalk.green(`[deviceService] Successfully connected to RTU device at ${serialPort}`),
        );
      } else {
        throw new Error('Invalid connection configuration');
      }
    } catch (connectionError: any) {
      // Add more detailed error reporting
      console.error(chalk.red(`[deviceService] Connection error:`), connectionError);
      
      if (connectionError.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: `Connection refused at ${ip}:${port}. The device may be offline or unreachable.`,
          error: connectionError.message,
          errorType: 'CONNECTION_REFUSED',
          troubleshooting: 'Please check:\n• Device is powered on and network is connected\n• IP address and port are correct\n• Any firewalls or network security is allowing the connection\n• The device is properly configured to accept Modbus TCP connections',
          deviceInfo: {
            name: device.name,
            id: device._id,
            connectionType: connectionType,
            address: connectionType === 'tcp' ? `${ip || 'unknown'}:${port || 'unknown'}` : serialPort || 'unknown',
          },
          timestamp: new Date().toISOString(),
          status: 'ERROR',
        };
      } else if (
        connectionError.code === 'ETIMEDOUT' ||
        connectionError.message.includes('timeout')
      ) {
        return {
          success: false,
          message: `Connection timed out. Device at ${ip}:${port} is not responding.`,
          error: connectionError.message,
          errorType: 'CONNECTION_TIMEOUT',
          troubleshooting: 'Please check:\n• Network connectivity to the device\n• Device is powered on and functioning\n• Device is not in a busy state or overloaded\n• Network latency is not too high',
          deviceInfo: {
            name: device.name,
            id: device._id,
            connectionType: connectionType,
            address: connectionType === 'tcp' ? `${ip || 'unknown'}:${port || 'unknown'}` : serialPort || 'unknown',
          },
          timestamp: new Date().toISOString(),
          status: 'ERROR',
        };
      } else if (connectionError.message.includes('Port is opening')) {
        return {
          success: false,
          message: `Serial port ${serialPort} is already in use by another process.`,
          error: connectionError.message,
          errorType: 'PORT_BUSY',
          troubleshooting: 'Please check:\n• Close any other applications that might be using the serial port\n• Restart the device to release any locked port connections\n• On Windows, check Device Manager to see if the port has any conflicts',
          deviceInfo: {
            name: device.name,
            id: device._id,
            connectionType: connectionType,
            address: connectionType === 'tcp' ? `${ip || 'unknown'}:${port || 'unknown'}` : serialPort || 'unknown',
          },
          timestamp: new Date().toISOString(),
          status: 'ERROR',
        };
      } else if (connectionError.message.includes('No such file or directory')) {
        return {
          success: false,
          message: `Serial port ${serialPort} does not exist on this system.`,
          error: connectionError.message,
          errorType: 'PORT_NOT_FOUND',
          troubleshooting: 'Please check:\n• Serial port name is correct (COM ports on Windows, /dev/tty* on Linux/Mac)\n• Serial device is properly connected to the computer\n• Serial-to-USB adapter drivers are installed if applicable\n• The port is not being used by another application',
          deviceInfo: {
            name: device.name,
            id: device._id,
            connectionType: connectionType,
            address: connectionType === 'tcp' ? `${ip || 'unknown'}:${port || 'unknown'}` : serialPort || 'unknown',
          },
          timestamp: new Date().toISOString(),
          status: 'ERROR',
        };
      } else {
        // Re-throw with original error for other cases
        return {
          success: false,
          message: `Connection error: ${connectionError.message}`,
          error: connectionError.message,
          errorType: 'CONNECTION_ERROR',
          troubleshooting: 'Verify your device configuration and try again.',
          deviceInfo: {
            name: device.name,
            id: device._id,
            connectionType: connectionType,
            address: connectionType === 'tcp' ? `${ip || 'unknown'}:${port || 'unknown'}` : serialPort || 'unknown',
          },
          timestamp: new Date().toISOString(),
          status: 'ERROR',
        };
      }
    }
    
    if (slaveId !== undefined) {
      client.setID(slaveId);
    } else {
      client.setID(1); // Default slave ID
    }
    
    // Try to read a register from first dataPoint or legacy register
    let address = 0;
    let functionCode = 3; // Default to readHoldingRegisters
    
    if (device.dataPoints && device.dataPoints.length > 0) {
      address = device.dataPoints[0].range.startAddress;
      functionCode = device.dataPoints[0].range.fc;
    } else if (device.registers && device.registers.length > 0) {
      address = device.registers[0].address;
    }
    
    console.log(
      chalk.yellow(
        `[deviceService] Testing read operation with address ${address} using function code ${functionCode}`,
      ),
    );
    
    // Get retry settings from advanced settings
    let retries = 0;
    let retryDelay = 500; // default 500ms between retries
    
    if (device.advancedSettings?.connectionOptions?.retries !== undefined) {
      retries = Number(device.advancedSettings.connectionOptions.retries);
      if (isNaN(retries) || retries < 0) {
        retries = 0;
      }
      console.log(chalk.cyan(`[deviceService] Using retry setting from advanced settings: ${retries}`));
    }
    
    if (device.advancedSettings?.connectionOptions?.retryInterval !== undefined) {
      retryDelay = Number(device.advancedSettings.connectionOptions.retryInterval);
      if (isNaN(retryDelay) || retryDelay < 0) {
        retryDelay = 500;
      }
      console.log(chalk.cyan(`[deviceService] Using retry delay from advanced settings: ${retryDelay}ms`));
    }
    
    // Try to read a register with retry logic based on advanced settings
    let attempts = 0;
    let lastError: any;
    
    while (attempts <= retries) {
      try {
        console.log(chalk.yellow(`[deviceService] Test read attempt ${attempts + 1}/${retries + 1} using FC${functionCode} address ${address}`));
        
        // Read register based on function code
        switch (functionCode) {
          case 1:
            await client.readCoils(address, 1);
            break;
          case 2:
            await client.readDiscreteInputs(address, 1);
            break;
          case 3:
            await client.readHoldingRegisters(address, 1);
            break;
          case 4:
            await client.readInputRegisters(address, 1);
            break;
          default:
            await client.readHoldingRegisters(address, 1);
        }
        
        // If we get here, read was successful - break out of retry loop
        console.log(chalk.green(`[deviceService] Test read successful on attempt ${attempts + 1}`));
        break;
        
      } catch (error) {
        lastError = error;
        attempts++;
        
        // If we've reached max retries, throw the last error
        if (attempts > retries) {
          console.log(chalk.red(`[deviceService] Test read failed after ${attempts} attempts: ${(error as Error).message}`));
          throw error;
        }
        
        // Log the retry attempt
        console.log(chalk.yellow(`[deviceService] Test read failed (attempt ${attempts}/${retries + 1}), retrying in ${retryDelay}ms: ${(error as Error).message}`));
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    console.log(chalk.bgGreen.black(`[deviceService] Read operation successful!`));
    
    // Update device lastSeen timestamp
    device.lastSeen = new Date();
    await device.save();
    console.log(
      chalk.green(`[deviceService] Updated device lastSeen timestamp to ${device.lastSeen}`),
    );
    
    // Send a clear success response with additional details
    return {
      success: true,
      message: 'Successfully connected to device',
      deviceInfo: {
        name: device.name,
        id: device._id,
        connectionType: connectionType,
        address:
          connectionType === 'tcp'
            ? `${ip || ''}:${port || ''}`
            : serialPort || '',
        lastSeen: device.lastSeen,
      },
      timestamp: new Date().toISOString(),
      status: 'CONNECTED',
    };
  } catch (modbusError: any) {
    console.error(chalk.bgRed.white('[deviceService] Modbus error:'), modbusError);
    
    // Create a more detailed error message based on error type
    let errorMessage = 'Connection failed';
    let errorType = 'UNKNOWN_ERROR';
    let troubleshooting = 'Verify your device configuration and try again.';
    
    // Get device info if available for error response
    const deviceInfo = device ? {
      name: device.name,
      id: device._id,
      connectionType: device.connectionSetting?.connectionType || device.connectionType || 'tcp',
      address: (device.connectionSetting?.connectionType === 'tcp' && device.connectionSetting?.tcp)
        ? `${device.connectionSetting.tcp.ip || 'unknown'}:${device.connectionSetting.tcp.port || 'unknown'}`
        : device.connectionSetting?.rtu?.serialPort || 'unknown',
    } : {
      id: deviceId,
    };
    
    if (modbusError.message.includes('Received no valid response')) {
      errorType = 'DEVICE_NO_RESPONSE';
      errorMessage = 'The device did not respond correctly to the Modbus request.';
      troubleshooting = 'Please check:\n• The slave/unit ID is correct\n• The Modbus device is configured to respond to the function code being used\n• The device supports the Modbus commands being sent\n• The register address is within the valid range for this device';
    } else if (modbusError.message.includes('Illegal function')) {
      errorType = 'ILLEGAL_FUNCTION';
      errorMessage = 'The device does not support the Modbus function being used.';
      troubleshooting = 'Please check:\n• The device documentation for supported Modbus function codes\n• Verify the correct function code is being used for this device\n• Some devices only support a subset of Modbus functions';
    } else if (modbusError.message.includes('Illegal data address')) {
      errorType = 'ILLEGAL_ADDRESS';
      errorMessage = 'The register address requested does not exist on this device.';
      troubleshooting = 'Please check:\n• The register address map documentation for your device\n• Address mapping (e.g., some devices start at 0, others at 1)\n• Address offsets and ranges for this specific device model';
    } else if (modbusError.message.includes('Port Not Open')) {
      errorType = 'PORT_NOT_OPEN';
      errorMessage = 'The connection was lost during communication.';
      troubleshooting = 'Please check:\n• Device power and network stability\n• Connection issues or interference\n• Try restarting both the device and the application';
    } else if (modbusError.message) {
      errorMessage = `${errorMessage}: ${modbusError.message}`;
    }
    
    return {
      success: false,
      message: errorMessage,
      error: modbusError.message,
      troubleshooting: troubleshooting,
      errorType: errorType,
      deviceInfo,
      timestamp: new Date().toISOString(),
      status: 'ERROR',
    };
  } finally {
    // Always close the client
    if (client) {
      await safeCloseModbusClient(client);
      console.log(chalk.blue(`[deviceService] Closed Modbus connection`));
    }
  }
};

/**
 * Interface for control parameters sent to the device
 */
export interface ControlParameter {
  name: string;          // Parameter name
  value: any;            // Value to set
  registerIndex: number; // Register address to write to
  dataType: string;      // Data type (UINT16, INT16, FLOAT32, etc.)
  byteOrder?: string;    // Byte order override (if not using device default)
  functionCode?: number; // Function code override (default based on dataType)
}

/**
 * Interface for control operation results
 */
export interface ControlResult {
  success: boolean;
  parameter: string;
  value: any;
  registerIndex: number;
  message?: string;
  error?: string;
  verification?: {
    success: boolean;
    readValue: any;
    message?: string;
  };
}

/**
 * Write a single register to a Modbus device
 */
export const writeSingleRegister = async (
  client: ModbusRTU,
  address: number,
  value: number
): Promise<boolean> => {
  try {
    console.log(chalk.yellow(`[deviceService] Writing single register at address ${address} with value ${value}`));
    
    // Validate value range for single register (0-65535)
    if (value < 0 || value > 65535 || !Number.isInteger(value)) {
      throw new Error(`Invalid value ${value} for single register write. Must be integer between 0-65535.`);
    }
    
    // Write the register
    await client.writeRegister(address, value);
    console.log(chalk.green(`[deviceService] Successfully wrote value ${value} to register ${address}`));
    
    return true;
  } catch (error: any) {
    console.error(chalk.red(`[deviceService] Error writing to register ${address}:`), error);
    throw error;
  }
};

/**
 * Write multiple registers to a Modbus device
 */
export const writeMultipleRegisters = async (
  client: ModbusRTU,
  address: number,
  values: number[]
): Promise<boolean> => {
  try {
    console.log(chalk.yellow(`[deviceService] Writing ${values.length} registers starting at address ${address}`));
    
    // Validate values
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (val < 0 || val > 65535 || !Number.isInteger(val)) {
        throw new Error(`Invalid value ${val} at index ${i}. All values must be integers between 0-65535.`);
      }
    }
    
    // Write the registers
    await client.writeRegisters(address, values);
    console.log(chalk.green(`[deviceService] Successfully wrote ${values.length} registers starting at ${address}`));
    
    return true;
  } catch (error: any) {
    console.error(chalk.red(`[deviceService] Error writing multiple registers starting at ${address}:`), error);
    throw error;
  }
};

/**
 * Write a single coil to a Modbus device
 */
export const writeCoil = async (
  client: ModbusRTU,
  address: number,
  value: boolean
): Promise<boolean> => {
  try {
    console.log(chalk.yellow(`[deviceService] Writing coil at address ${address} with value ${value}`));
    
    // Write the coil
    await client.writeCoil(address, value);
    console.log(chalk.green(`[deviceService] Successfully wrote value ${value} to coil ${address}`));
    
    return true;
  } catch (error: any) {
    console.error(chalk.red(`[deviceService] Error writing to coil ${address}:`), error);
    throw error;
  }
};

/**
 * Write multiple coils to a Modbus device
 */
export const writeMultipleCoils = async (
  client: ModbusRTU,
  address: number,
  values: boolean[]
): Promise<boolean> => {
  try {
    console.log(chalk.yellow(`[deviceService] Writing ${values.length} coils starting at address ${address}`));
    
    // Write the coils
    await client.writeCoils(address, values);
    console.log(chalk.green(`[deviceService] Successfully wrote ${values.length} coils starting at ${address}`));
    
    return true;
  } catch (error: any) {
    console.error(chalk.red(`[deviceService] Error writing multiple coils starting at ${address}:`), error);
    throw error;
  }
};

/**
 * Convert a FLOAT32 value to two registers based on byte order
 */
export const convertFloat32ToRegisters = (
  value: number,
  byteOrder: string
): number[] => {
  try {
    console.log(`[deviceService] Converting float value ${value} to registers with byte order ${byteOrder}`);
    
    // Create a buffer for the float value
    const buffer = Buffer.alloc(4);
    
    // Write the float value to the buffer
    buffer.writeFloatBE(value, 0);
    
    // Extract the registers based on byte order
    let reg1: number, reg2: number;
    
    // Normalize byte order to uppercase and ensure valid value
    let mappedByteOrder: string;
    switch ((byteOrder || 'ABCD').toUpperCase()) {
      case 'ABCD': mappedByteOrder = 'ABCD'; break;
      case 'CDAB': mappedByteOrder = 'CDAB'; break;
      case 'BADC': mappedByteOrder = 'BADC'; break;
      case 'DCBA': mappedByteOrder = 'DCBA'; break;
      default: 
        console.log(`[deviceService] Unknown byte order '${byteOrder}', using default ABCD`);
        mappedByteOrder = 'ABCD';
    }
    
    // Extract registers based on byte order
    if (mappedByteOrder === 'ABCD') {
      // ABCD: High word first, high byte first (Big-endian)
      reg1 = buffer.readUInt16BE(0);
      reg2 = buffer.readUInt16BE(2);
    } else if (mappedByteOrder === 'CDAB') {
      // CDAB: Low word first, high byte first (Mixed-endian)
      reg1 = buffer.readUInt16BE(2);
      reg2 = buffer.readUInt16BE(0);
    } else if (mappedByteOrder === 'BADC') {
      // BADC: High word first, low byte first (Mixed-endian)
      reg1 = buffer.readUInt16LE(0);
      reg2 = buffer.readUInt16LE(2);
    } else if (mappedByteOrder === 'DCBA') {
      // DCBA: Low word first, low byte first (Little-endian)
      reg1 = buffer.readUInt16LE(2);
      reg2 = buffer.readUInt16LE(0);
    } else {
      throw new Error(`Unsupported byte order: ${byteOrder}`);
    }
    
    console.log(`[deviceService] Converted float ${value} to registers: [${reg1}, ${reg2}]`);
    return [reg1, reg2];
  } catch (error) {
    console.error(`[deviceService] Error converting float to registers:`, error);
    throw error;
  }
};

/**
 * Convert an INT32 value to two registers based on byte order
 */
export const convertInt32ToRegisters = (
  value: number,
  byteOrder: string
): number[] => {
  try {
    console.log(`[deviceService] Converting INT32 value ${value} to registers with byte order ${byteOrder}`);
    
    // Create a buffer for the INT32 value
    const buffer = Buffer.alloc(4);
    
    // Write the INT32 value to the buffer
    buffer.writeInt32BE(value, 0);
    
    // Extract the registers based on byte order
    let reg1: number, reg2: number;
    
    // Normalize byte order to uppercase and ensure valid value
    let mappedByteOrder: string;
    switch ((byteOrder || 'ABCD').toUpperCase()) {
      case 'ABCD': mappedByteOrder = 'ABCD'; break;
      case 'CDAB': mappedByteOrder = 'CDAB'; break;
      case 'BADC': mappedByteOrder = 'BADC'; break;
      case 'DCBA': mappedByteOrder = 'DCBA'; break;
      default: 
        console.log(`[deviceService] Unknown byte order '${byteOrder}', using default ABCD`);
        mappedByteOrder = 'ABCD';
    }
    
    // Extract registers based on byte order
    if (mappedByteOrder === 'ABCD') {
      // ABCD: High word first, high byte first (Big-endian)
      reg1 = buffer.readUInt16BE(0);
      reg2 = buffer.readUInt16BE(2);
    } else if (mappedByteOrder === 'CDAB') {
      // CDAB: Low word first, high byte first (Mixed-endian)
      reg1 = buffer.readUInt16BE(2);
      reg2 = buffer.readUInt16BE(0);
    } else if (mappedByteOrder === 'BADC') {
      // BADC: High word first, low byte first (Mixed-endian)
      reg1 = buffer.readUInt16LE(0);
      reg2 = buffer.readUInt16LE(2);
    } else if (mappedByteOrder === 'DCBA') {
      // DCBA: Low word first, low byte first (Little-endian)
      reg1 = buffer.readUInt16LE(2);
      reg2 = buffer.readUInt16LE(0);
    } else {
      throw new Error(`Unsupported byte order: ${byteOrder}`);
    }
    
    console.log(`[deviceService] Converted INT32 ${value} to registers: [${reg1}, ${reg2}]`);
    return [reg1, reg2];
  } catch (error) {
    console.error(`[deviceService] Error converting INT32 to registers:`, error);
    throw error;
  }
};

/**
 * Convert a UINT32 value to two registers based on byte order
 */
export const convertUInt32ToRegisters = (
  value: number,
  byteOrder: string
): number[] => {
  try {
    console.log(`[deviceService] Converting UINT32 value ${value} to registers with byte order ${byteOrder}`);
    
    // Create a buffer for the UINT32 value
    const buffer = Buffer.alloc(4);
    
    // Write the UINT32 value to the buffer
    buffer.writeUInt32BE(value, 0);
    
    // Extract the registers based on byte order
    let reg1: number, reg2: number;
    
    // Normalize byte order to uppercase and ensure valid value
    let mappedByteOrder: string;
    switch ((byteOrder || 'ABCD').toUpperCase()) {
      case 'ABCD': mappedByteOrder = 'ABCD'; break;
      case 'CDAB': mappedByteOrder = 'CDAB'; break;
      case 'BADC': mappedByteOrder = 'BADC'; break;
      case 'DCBA': mappedByteOrder = 'DCBA'; break;
      default: 
        console.log(`[deviceService] Unknown byte order '${byteOrder}', using default ABCD`);
        mappedByteOrder = 'ABCD';
    }
    
    // Extract registers based on byte order
    if (mappedByteOrder === 'ABCD') {
      // ABCD: High word first, high byte first (Big-endian)
      reg1 = buffer.readUInt16BE(0);
      reg2 = buffer.readUInt16BE(2);
    } else if (mappedByteOrder === 'CDAB') {
      // CDAB: Low word first, high byte first (Mixed-endian)
      reg1 = buffer.readUInt16BE(2);
      reg2 = buffer.readUInt16BE(0);
    } else if (mappedByteOrder === 'BADC') {
      // BADC: High word first, low byte first (Mixed-endian)
      reg1 = buffer.readUInt16LE(0);
      reg2 = buffer.readUInt16LE(2);
    } else if (mappedByteOrder === 'DCBA') {
      // DCBA: Low word first, low byte first (Little-endian)
      reg1 = buffer.readUInt16LE(2);
      reg2 = buffer.readUInt16LE(0);
    } else {
      throw new Error(`Unsupported byte order: ${byteOrder}`);
    }
    
    console.log(`[deviceService] Converted UINT32 ${value} to registers: [${reg1}, ${reg2}]`);
    return [reg1, reg2];
  } catch (error) {
    console.error(`[deviceService] Error converting UINT32 to registers:`, error);
    throw error;
  }
};

/**
 * Write a parameter value to a device
 */
export const writeParameterValue = async (
  client: ModbusRTU,
  parameter: ControlParameter
): Promise<ControlResult> => {
  try {
    console.log(chalk.yellow(`[deviceService] Writing parameter "${parameter.name}" with value ${parameter.value} to register ${parameter.registerIndex}`));
    
    // Default result structure
    const result: ControlResult = {
      success: false,
      parameter: parameter.name,
      value: parameter.value,
      registerIndex: parameter.registerIndex,
    };

    // Handle different data types
    switch (parameter.dataType.toUpperCase()) {
      case 'UINT16': {
        // Validate value for UINT16
        if (parameter.value < 0 || parameter.value > 65535 || !Number.isInteger(parameter.value)) {
          throw new Error(`Invalid value ${parameter.value} for UINT16. Must be integer between 0-65535.`);
        }
        
        // Write the value using Function Code 6 (write single register)
        await writeSingleRegister(client, parameter.registerIndex, parameter.value);
        result.success = true;
        break;
      }
      
      case 'INT16': {
        // Validate value for INT16
        if (parameter.value < -32768 || parameter.value > 32767 || !Number.isInteger(parameter.value)) {
          throw new Error(`Invalid value ${parameter.value} for INT16. Must be integer between -32768 and 32767.`);
        }
        
        // Convert signed to unsigned for transport if negative
        let registerValue = parameter.value;
        if (registerValue < 0) {
          registerValue = 65536 + registerValue; // Two's complement conversion
        }
        
        // Write the value using Function Code 6 (write single register)
        await writeSingleRegister(client, parameter.registerIndex, registerValue);
        result.success = true;
        break;
      }
      
      case 'FLOAT32': {
        // Validate value for FLOAT32
        if (typeof parameter.value !== 'number' || !isFinite(parameter.value)) {
          throw new Error(`Invalid value ${parameter.value} for FLOAT32. Must be a finite number.`);
        }
        
        // Get byte order
        const byteOrder = parameter.byteOrder || 'ABCD';
        
        // Convert float to two registers
        const registers = convertFloat32ToRegisters(parameter.value, byteOrder);
        
        // Write the value using Function Code 16 (write multiple registers)
        await writeMultipleRegisters(client, parameter.registerIndex, registers);
        result.success = true;
        break;
      }
      
      case 'INT32': {
        // Validate value for INT32
        if (!Number.isInteger(parameter.value) || parameter.value < -2147483648 || parameter.value > 2147483647) {
          throw new Error(`Invalid value ${parameter.value} for INT32. Must be integer between -2147483648 and 2147483647.`);
        }
        
        // Get byte order
        const byteOrder = parameter.byteOrder || 'ABCD';
        
        // Convert INT32 to two registers
        const registers = convertInt32ToRegisters(parameter.value, byteOrder);
        
        // Write the value using Function Code 16 (write multiple registers)
        await writeMultipleRegisters(client, parameter.registerIndex, registers);
        result.success = true;
        break;
      }
      
      case 'UINT32': {
        // Validate value for UINT32
        if (!Number.isInteger(parameter.value) || parameter.value < 0 || parameter.value > 4294967295) {
          throw new Error(`Invalid value ${parameter.value} for UINT32. Must be integer between 0 and 4294967295.`);
        }
        
        // Get byte order
        const byteOrder = parameter.byteOrder || 'ABCD';
        
        // Convert UINT32 to two registers
        const registers = convertUInt32ToRegisters(parameter.value, byteOrder);
        
        // Write the value using Function Code 16 (write multiple registers)
        await writeMultipleRegisters(client, parameter.registerIndex, registers);
        result.success = true;
        break;
      }
      
      case 'BOOL': {
        // Validate value for BOOL
        if (typeof parameter.value !== 'boolean' && ![0, 1].includes(parameter.value)) {
          throw new Error(`Invalid value ${parameter.value} for BOOL. Must be boolean or 0/1.`);
        }
        
        // Convert to boolean
        const boolValue = parameter.value === 1 || parameter.value === true;
        
        // Check if we're writing to a coil or a register
        if (parameter.functionCode === 5) {
          // Function Code 5 (write single coil)
          await writeCoil(client, parameter.registerIndex, boolValue);
        } else {
          // Default to Function Code 6 (write single register)
          await writeSingleRegister(client, parameter.registerIndex, boolValue ? 1 : 0);
        }
        result.success = true;
        break;
      }
      
      default:
        throw new Error(`Unsupported data type: ${parameter.dataType}`);
    }
    
    result.message = `Successfully wrote value ${parameter.value} to ${parameter.name} at register ${parameter.registerIndex}`;
    return result;
  } catch (error: any) {
    console.error(chalk.red(`[deviceService] Error writing parameter "${parameter.name}":`), error);
    return {
      success: false,
      parameter: parameter.name,
      value: parameter.value,
      registerIndex: parameter.registerIndex,
      error: error.message,
      message: `Failed to write value ${parameter.value} to ${parameter.name}: ${error.message}`,
    };
  }
};

/**
 * Control a device by setting parameter values
 */
export const controlDevice = async (
  deviceId: string,
  parameters: ControlParameter[],
  reqContext: any
): Promise<{
  success: boolean;
  deviceId: string;
  deviceName: string;
  timestamp: Date;
  results: ControlResult[];
}> => {
  let device: IDevice | null = null;
  let client: ModbusRTU | null = null;
  
  try {
    console.log(chalk.bgYellow.black(`[deviceService] Starting device control operation for device ID: ${deviceId}`));
    
    // Validate parameters
    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      throw new Error('No control parameters provided');
    }
    
    // Get the device model
    const DeviceModel = await getDeviceModel(reqContext);
    
    // Find the device
    device = await DeviceModel.findById(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    if (!device.enabled) {
      throw new Error('Device is disabled');
    }
    
    // Check if the device has writable registers/control parameters defined
    // This check can be expanded based on your device schema
    if (!device.writableRegisters && !device.controlParameters) {
      console.warn(`[deviceService] Device ${deviceId} does not have writable registers defined`);
      // For now, proceed anyway but log a warning
    }
    
    // Connect to the device
    const connection = await connectToModbusDevice(device);
    client = connection.client;
    
    // Process each parameter
    const results: ControlResult[] = [];
    
    for (const parameter of parameters) {
      try {
        // Apply any device-specific transformations
        // For example, use device's default byte order if not specified in the parameter
        if (!parameter.byteOrder && ['FLOAT32', 'INT32', 'UINT32'].includes(parameter.dataType.toUpperCase())) {
          parameter.byteOrder = getByteOrder(parameter, device);
        }
        
        // Write the parameter value
        const result = await writeParameterValue(client, parameter);
        
        // Add to results
        results.push(result);
      } catch (paramError: any) {
        console.error(`[deviceService] Error processing parameter ${parameter.name}:`, paramError);
        results.push({
          success: false,
          parameter: parameter.name,
          value: parameter.value,
          registerIndex: parameter.registerIndex,
          error: paramError.message,
          message: `Failed to process parameter ${parameter.name}: ${paramError.message}`,
        });
      }
    }
    
    // Update device lastControlledAt timestamp
    device.lastControlledAt = new Date();
    await device.save();
    
    // Return the results
    return {
      success: results.some(r => r.success), // At least one successful operation
      deviceId: device._id.toString(),
      deviceName: device.name,
      timestamp: new Date(),
      results,
    };
  } catch (error: any) {
    console.error(chalk.bgRed.white('[deviceService] Device control error:'), error);
    
    const errorResponse = {
      success: false,
      deviceId: deviceId,
      deviceName: device?.name || 'Unknown device',
      timestamp: new Date(),
      results: [],
      error: error.message,
    };
    
    throw error;
  } finally {
    // Always close the client
    if (client) {
      await safeCloseModbusClient(client);
    }
  }
};