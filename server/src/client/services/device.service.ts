import mongoose from 'mongoose';
import ModbusRTU from 'modbus-serial';
import chalk from 'chalk';
import { IDevice } from '../models/Device';
import { safeCloseModbusClient } from '../controllers/modbusHelper';
import { createDeviceModel } from '../utils/dbHelper';
import { getClientConnection } from '../../config/database';

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
  let DeviceModel: mongoose.Model<IDevice> | null = null;

  // Try to get from app.locals
  if (reqContext?.app?.locals?.clientModels?.Device) {
    DeviceModel = reqContext.app.locals.clientModels.Device;
    console.log('[deviceService] Using client-specific Device model from app.locals');
    return DeviceModel;
  }

  // Try to get from connection
  const mainDBConnection = reqContext?.app?.locals?.mainDB || getClientDbConnection();
  if (mainDBConnection && mainDBConnection.readyState === 1) {
    try {
      DeviceModel = createDeviceModel(mainDBConnection);
      console.log('[deviceService] Created Device model with client connection');
      return DeviceModel;
    } catch (err) {
      console.error('[deviceService] Error creating Device model with client connection:', err);
    }
  }

  // Try one more time with reconnection if needed
  if (!DeviceModel || DeviceModel.db?.name !== 'client') {
    console.error(
      `[deviceService] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`
    );
    console.log('[deviceService] Forcing reconnection to client database');

    const mainDBConnection = reqContext?.app?.locals?.mainDB || getClientDbConnection();
    if (
      mainDBConnection &&
      mainDBConnection.readyState === 1 &&
      mainDBConnection.name === 'client'
    ) {
      try {
        DeviceModel = createDeviceModel(mainDBConnection);
        console.log(
          `[deviceService] Successfully reconnected to client database: ${DeviceModel.db?.name}`
        );
        return DeviceModel;
      } catch (reconnectError) {
        console.error('[deviceService] Could not reconnect to client database:', reconnectError);
      }
    }
  }

  throw new Error('Could not initialize database model');
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

  // Connect based on connection type
  if (connectionType === 'tcp' && ip && port) {
    await client.connectTCP(ip, { port });
  } else if (connectionType === 'rtu' && serialPort) {
    const rtuOptions: any = {};
    if (baudRate) rtuOptions.baudRate = baudRate;
    if (dataBits) rtuOptions.dataBits = dataBits;
    if (stopBits) rtuOptions.stopBits = stopBits;
    if (parity) rtuOptions.parity = parity;

    //FIXME: Hardcoded port for testing - replace with actual serialPort
    await client.connectRTUBuffered('/dev/tty.usbserial-A50285BI', rtuOptions);
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
    console.log('[deviceService] Using standard register addressing for Chinese Energy Analyzer');
  } else if (device.advancedSettings?.connectionOptions?.retries === 0) {
    // This is a trick - we're using the retries=0 as a flag for devices that need -1 adjustment
    startAddress = startAddress - 1;
    console.log(
      `[deviceService] Using 0-based register addressing (adjusted from ${range.startAddress} to ${startAddress})`
    );
  }

  // For Chinese Energy Analyzers, we might need to read more registers
  if (
    device.make?.toLowerCase().includes('china') ||
    device.make?.toLowerCase().includes('energy analyzer')
  ) {
    // Some Energy Analyzers require reading the full range to work properly
    console.log(`[deviceService] Using full register count ${adjustedCount} for Chinese Energy Analyzer`);
  } else {
    // For other devices, limit to 2 registers for better compatibility
    adjustedCount = range.count > 2 ? 2 : range.count;
    if (range.count > 2) {
      console.log(
        `[deviceService] Reducing read count from ${range.count} to ${adjustedCount} for better compatibility`
      );
    }
  }

  return { startAddress, count: adjustedCount };
};

/**
 * Read registers from a Modbus device
 */
export const readModbusRegisters = async (
  client: ModbusRTU,
  fc: number,
  startAddress: number,
  count: number
): Promise<any> => {
  console.log(`[deviceService] Reading registers using FC${fc} from address ${startAddress}, count ${count}`);
  
  let result;
  switch (fc) {
    case 1:
      result = await client.readCoils(startAddress, count);
      break;
    case 2:
      result = await client.readDiscreteInputs(startAddress, count);
      break;
    case 3:
      console.log('============holding Register');
      result = await client.readHoldingRegisters(startAddress, count);
      console.log(chalk.bgWhite(JSON.stringify(result)));
      break;
    case 4:
      result = await client.readInputRegisters(startAddress, count);
      break;
    default:
      result = await client.readHoldingRegisters(startAddress, count);
      console.log('readHoldingRegisters ', chalk.bgWhite(result));
  }

  console.log(`[deviceService] Successfully read ${count} registers from address ${startAddress} using FC${fc}`);
  console.log(`[deviceService] Read Result:`, result);
  
  return result;
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
    console.log(
      `[deviceService] Using absolute addressing mode: ${param.registerIndex} - ${range.startAddress} = ${relativeIndex}`
    );
    return relativeIndex;
  }
  
  // If registerIndex is very small, it's likely a direct offset (relative)
  if (param.registerIndex < range.count) {
    console.log(
      `[deviceService] Using relative addressing mode with direct offset: ${param.registerIndex}`
    );
    return param.registerIndex;
  }
  
  // If none of the above, guess based on whether it's closer to a direct offset or an absolute address
  const asRelative = param.registerIndex;
  const asAbsolute = param.registerIndex - range.startAddress;

  // Choose the one that makes more sense (is in range)
  if (asAbsolute >= 0 && asAbsolute < range.count) {
    console.log(
      `[deviceService] Inferred absolute addressing mode: ${param.registerIndex} - ${range.startAddress} = ${asAbsolute}`
    );
    return asAbsolute;
  } else {
    // Fallback to treating it as a direct offset but warn about potential issues
    console.log(
      `[deviceService] WARNING: Register index ${param.registerIndex} doesn't align with range ${range.startAddress}-${range.startAddress + range.count - 1}. Using as direct offset.`
    );
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
    console.log('[deviceService] Applying China Energy Analyzer default byte order: CDAB');
    return 'CDAB';
  } else if (device.make?.toLowerCase().includes('schneider')) {
    // Schneider Electric typically uses ABCD format
    console.log('[deviceService] Applying Schneider Electric default byte order: ABCD');
    return 'ABCD';
  } else if (device.make?.toLowerCase().includes('siemens')) {
    // Siemens typically uses BADC format
    console.log('[deviceService] Applying Siemens default byte order: BADC');
    return 'BADC';
  } else {
    // Default to ABCD if no specific match
    console.log('[deviceService] No device-specific byte order found, using default: ABCD');
    return 'ABCD';
  }
};

/**
 * Process a FLOAT32 value from two registers
 */
export const processFloat32 = (reg1: number, reg2: number, byteOrder: string): number | null => {
  // Validate registers are numbers
  if (typeof reg1 !== 'number' || typeof reg2 !== 'number') {
    console.log(
      `[deviceService] Invalid register values: reg1=${reg1}, reg2=${reg2}. Both must be numbers.`
    );
    
    // Make sure reg1 and reg2 are valid numbers before processing
    const validReg1 = typeof reg1 === 'number' ? reg1 : 0;
    const validReg2 = typeof reg2 === 'number' ? reg2 : 0;
    
    console.log(`[deviceService] Using fallback values: reg1=${validReg1}, reg2=${validReg2}`);
    
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
 * Helper function to process valid registers as float
 */
export const processValidRegistersAsFloat = (
  reg1: number,
  reg2: number,
  byteOrder: string
): number | null => {
  try {
    // Create buffer to store the values
    const buffer = Buffer.alloc(4);
    
    // Map byteOrder string to ByteOrder enum
    let mappedByteOrder: string;
    switch (byteOrder) {
      case 'ABCD':
        mappedByteOrder = 'ABCD';
        break;
      case 'CDAB':
        mappedByteOrder = 'CDAB';
        break;
      case 'BADC':
        mappedByteOrder = 'BADC';
        break;
      case 'DCBA':
        mappedByteOrder = 'DCBA';
        break;
      default:
        console.log(`[deviceService] Unknown byte order: ${byteOrder}, defaulting to ABCD`);
        mappedByteOrder = 'ABCD';
    }
    
    // Write the registers to the buffer according to byte order
    if (mappedByteOrder === 'ABCD') {
      buffer.writeUInt16BE(reg1, 0);
      buffer.writeUInt16BE(reg2, 2);
    } else if (mappedByteOrder === 'CDAB') {
      buffer.writeUInt16BE(reg2, 0);
      buffer.writeUInt16BE(reg1, 2);
    } else if (mappedByteOrder === 'BADC') {
      // Swap bytes within each word
      buffer.writeUInt16LE(reg1, 0);
      buffer.writeUInt16LE(reg2, 2);
    } else if (mappedByteOrder === 'DCBA') {
      // Complete reverse
      buffer.writeUInt16LE(reg2, 0);
      buffer.writeUInt16LE(reg1, 2);
    }
    
    // Convert buffer to float
    const value = buffer.readFloatBE(0);
    
    console.log(`[deviceService] Converted FLOAT32 value: ${value}`);
    
    // Check for NaN or Infinity
    if (!isFinite(value)) {
      console.log(`[deviceService] Warning: FLOAT32 conversion resulted in ${value}, using null instead.`);
      return null;
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
    console.log(`[deviceService] Skipping scaling/formatting because value is ${value}`);
    return value;
  }
  
  // Make sure value is a number before applying scaling
  if (typeof value !== 'number') {
    console.log(
      `[deviceService] Warning: Value is not a number (${typeof value}: ${value}), attempting to convert`
    );
    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
      value = numericValue;
      console.log(`[deviceService] Successfully converted value to number: ${value}`);
    } else {
      console.log(`[deviceService] Could not convert value to number, setting to null`);
      return null;
    }
  }
  
  // Apply scaling factor if defined
  if (param.scalingFactor && param.scalingFactor !== 1) {
    try {
      const originalValue = value;
      value = value * param.scalingFactor;
      console.log(
        `[deviceService] Applied scaling factor: ${originalValue} * ${param.scalingFactor} = ${value}`
      );
      
      // Check for invalid results
      if (!isFinite(value)) {
        console.log(`[deviceService] Warning: Scaling resulted in ${value}, reverting to original value`);
        value = originalValue;
      }
    } catch (error) {
      console.error(`[deviceService] Error applying scaling factor:`, error);
    }
  }
  
  // Apply scaling equation if defined
  if (param.scalingEquation) {
    try {
      // Simple equation evaluation (x is the value)
      const x = value;
      const originalValue = value;
      
      // Use Function constructor to safely evaluate the equation
      value = new Function('x', `return ${param.scalingEquation}`)(x);
      console.log(
        `[deviceService] Applied scaling equation: ${param.scalingEquation} with x=${originalValue}, result=${value}`
      );
      
      // Check for invalid results
      if (!isFinite(value)) {
        console.log(`[deviceService] Warning: Equation resulted in ${value}, reverting to original value`);
        value = originalValue;
      }
    } catch (error) {
      console.error(`[deviceService] Scaling equation error:`, error);
      // Keep the original value if the equation fails
    }
  }
  
  // Format decimal places if defined
  if (param.decimalPoint !== undefined && param.decimalPoint >= 0) {
    try {
      const originalValue = value;
      
      // Check if value is extremely small before formatting
      if (Math.abs(value) < Math.pow(10, -param.decimalPoint)) {
        // For very small values, preserve scientific notation or original value
        console.log(
          `[deviceService] Value ${value} is too small for ${param.decimalPoint} decimal places, preserving original`
        );
      } else {
        // For normal values, format decimal places
        value = parseFloat(value.toFixed(param.decimalPoint));
        console.log(
          `[deviceService] Formatted decimal places: ${originalValue} to ${param.decimalPoint} places = ${value}`
        );
      }
    } catch (error) {
      console.error(`[deviceService] Error formatting decimal places:`, error);
    }
  }
  
  // Apply min/max constraints if defined
  if (typeof value === 'number') {
    if (param.maxValue !== undefined && value > param.maxValue) {
      console.log(`[deviceService] Value ${value} exceeds maxValue ${param.maxValue}, clamping`);
      value = param.maxValue;
    }
    if (param.minValue !== undefined && value < param.minValue) {
      console.log(`[deviceService] Value ${value} below minValue ${param.minValue}, clamping`);
      value = param.minValue;
    }
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
    // Handle data types that span multiple registers
    if (param.dataType === 'FLOAT32' && param.wordCount === 2) {
      // For FLOAT32, we need to read two consecutive registers
      if (relativeIndex + 1 < result.data.length) {
        // Check if data exists
        if (
          !result.data ||
          !Array.isArray(result.data) ||
          result.data.length <= relativeIndex
        ) {
          console.log(
            `[deviceService] Cannot read FLOAT32 - result data is invalid. Actual data:`,
            result.data
          );
          value = null;
        } else {
          const byteOrder = getByteOrder(param, device);
          
          const reg1 = result.data[relativeIndex];
          const reg2 = result.data[relativeIndex + 1];
          
          console.log(`[deviceService] Raw registers: reg1=${reg1}, reg2=${reg2}`);
          
          value = processFloat32(reg1, reg2, byteOrder);
        }
      } else {
        console.log(`[deviceService] Cannot read FLOAT32 - not enough registers available.`);
        value = null;
      }
    } else {
      // Standard single register processing
      if (
        !result.data ||
        !Array.isArray(result.data) ||
        result.data.length <= relativeIndex
      ) {
        console.log(
          `[deviceService] Cannot read register at index ${relativeIndex} - result data is invalid.`
        );
        value = null;
      } else {
        value = result.data[relativeIndex];
        console.log(`[deviceService] Read single register value: ${value}`);
      }
    }
    
    console.log(`[deviceService] Raw value at index ${relativeIndex}: ${value}`);
    
    // Process and format the value
    value = processAndFormatValue(value, param);
    
    // Log the final processed value
    console.log(
      `[deviceService] Final processed value for parameter "${param.name}": ${value}${param.unit ? ' ' + param.unit : ''}`
    );
    
    return value;
  } catch (error) {
    console.error(`[deviceService] Error processing parameter ${param.name}:`, error);
    return null;
  }
};

/**
 * Read registers from a Modbus device based on its configuration
 */
export const   = async (device: IDevice): Promise<RegisterResult[]> => {
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
      console.log(`[deviceService] Reading from device data points: ${device.dataPoints.length} points`);
      
      for (const dataPoint of device.dataPoints) {
        try {
          const range = dataPoint.range;
          const parser = dataPoint.parser;
          
          // Get adjusted address and count
          const { startAddress, count } = getAdjustedAddressAndCount(device, range);
          
          // Read registers
          const result = await readModbusRegisters(client, range.fc, startAddress, count);
          
          // Process the result based on parser configuration
          if (parser && parser.parameters) {
            console.log(`[deviceService] Processing parser with ${parser.parameters.length} parameters`);
            
            for (const param of parser.parameters) {
              try {
                console.log(
                  `[deviceService] Processing parameter: ${param.name}, registerIndex: ${param.registerIndex}, dataType: ${param.dataType}`
                );
                
                // Calculate relative index
                const relativeIndex = calculateRelativeIndex(param, range);
                
                if (relativeIndex < 0 || relativeIndex >= count) {
                  console.log(
                    `[deviceService] Parameter ${param.name} index out of range: ${relativeIndex} not in [0-${count - 1}]`
                  );
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
    console.log(
      `[deviceService] Final readings results (${readings.length} values):`,
      JSON.stringify(readings, null, 1)
    );
    
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

    console.log(chalk.bgGreen(JSON.stringify(readings)));
    
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