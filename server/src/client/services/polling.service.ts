import ModbusRTU from 'modbus-serial';
import mongoose from 'mongoose';
import { getClientModels } from '../../config/database';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk');
import {
  createModbusClient,
  safeCloseModbusClient,
  readHoldingRegistersWithTimeout,
  readInputRegistersWithTimeout,
} from '../utils/modbusHelper';

// Define new functions for reading registers with retry capability
async function readHoldingRegistersWithRetries(
  client: ModbusRTU,
  address: number,
  length: number,
  timeout: number = 5000,
  retries: number = 0,
  retryDelay: number = 500
): Promise<any> {
  let attempts = 0;
  let lastError;
  
  while (attempts <= retries) {
    try {
      console.log(chalk.blue(`Attempt ${attempts + 1}/${retries + 1} to read ${length} holding registers from address ${address}`));
      
      // Use the existing timeout function for basic reading
      const result = await readHoldingRegistersWithTimeout(client, address, length, timeout);
      return result;
    } catch (error) {
      lastError = error;
      attempts++;
      
      // If we've reached max retries, throw the last error
      if (attempts > retries) {
        console.log(chalk.red(`Failed to read holding registers after ${attempts} attempts: ${(error as Error).message}`));
        throw error;
      }
      
      // Log the retry attempt
      console.log(chalk.yellow(`Read holding registers failed (attempt ${attempts}/${retries + 1}), retrying in ${retryDelay}ms: ${(error as Error).message}`));
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // This should never be reached, but TypeScript needs a return value
  throw lastError;
}

async function readInputRegistersWithRetries(
  client: ModbusRTU,
  address: number,
  length: number,
  timeout: number = 5000,
  retries: number = 0,
  retryDelay: number = 500
): Promise<any> {
  let attempts = 0;
  let lastError;
  
  while (attempts <= retries) {
    try {
      console.log(chalk.blue(`Attempt ${attempts + 1}/${retries + 1} to read ${length} input registers from address ${address}`));
      
      // Use the existing timeout function for basic reading
      const result = await readInputRegistersWithTimeout(client, address, length, timeout);
      return result;
    } catch (error) {
      lastError = error;
      attempts++;
      
      // If we've reached max retries, throw the last error
      if (attempts > retries) {
        console.log(chalk.red(`Failed to read input registers after ${attempts} attempts: ${(error as Error).message}`));
        throw error;
      }
      
      // Log the retry attempt
      console.log(chalk.yellow(`Read input registers failed (attempt ${attempts}/${retries + 1}), retrying in ${retryDelay}ms: ${(error as Error).message}`));
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // This should never be reached, but TypeScript needs a return value
  throw lastError;
}

// Import the specific types from modbus-serial
import { ReadCoilResult, ReadRegisterResult } from 'modbus-serial/ModbusRTU';

// Import database models from index model
import { RealtimeData, HistoricalData } from '../models/index.model';

// Define Modbus response types
type ModbusResponse = ReadRegisterResult | ReadCoilResult;

// Type definitions for data readings
interface DeviceReading {
  deviceId: mongoose.Types.ObjectId;
  deviceName: string;
  timestamp: Date;
  readings: ParameterReading[];
}

interface ParameterReading {
  name: string;
  registerIndex?: number;
  address?: number;
  value: any;
  unit?: string;
  dataType?: string;
  error?: string;
}

// In-memory cache for real-time data
const realtimeDataCache = new Map<string, DeviceReading>();

/**
 * Main polling function for a specific device
 * @param deviceId The ID of the device to poll
 * @returns A promise that resolves with the device readings
 */
// Import from the correct service file
// We have two service files with similar functionality: device.service.ts and deviceService.ts
// Import the one that works correctly with the read endpoint
import * as deviceService from './device.service';

// Cache for control bit states to ensure consistency across polling cycles
const controlBitStateCache = new Map<string, {controlValue: boolean, scheduleValue: boolean}>();

export async function pollDevice(deviceId: string, req?: any): Promise<DeviceReading | null> {
  let client = null;

  try {
    console.log(chalk.blue(`Starting poll for device ${deviceId}`));

    // First, try to use the same approach as the read endpoint
    try {
      console.log(chalk.cyan(`Using deviceService.readDeviceRegisters for consistency with read endpoint`));
      
      const readResult = await deviceService.readDeviceRegisters(deviceId, req);
      console.log(chalk.green(`Successfully read registers using device service: ${readResult.readings.length} readings`));
      
      // If successful, convert the result to our DeviceReading format
      if (readResult && readResult.readings && readResult.readings.length > 0) {
        const deviceReading: DeviceReading = {
          deviceId: new mongoose.Types.ObjectId(readResult.deviceId),
          deviceName: readResult.deviceName,
          timestamp: new Date(),
          readings: readResult.readings.map(r => ({
            name: r.name,
            registerIndex: r.registerIndex,
            address: r.address,
            value: r.value,
            unit: r.unit || '',
            dataType: r.dataType,
            error: r.error
          }))
        };
        
        // Store in real-time cache
        realtimeDataCache.set(deviceId, deviceReading);
        console.log(chalk.blue(`Updated real-time cache for device ${readResult.deviceName} with ${deviceReading.readings.length} readings`));
        
        // Store in realtime database
        // Don't await this call to avoid blocking - just let it run in the background
        storeRealtimeData(deviceId, deviceReading, req)
          .catch(err => console.error(chalk.red(`❌ Error storing realtime data: ${err}`)));
        
        // Store in history database
        await storeHistoricalData(deviceReading, req);
        
        return deviceReading;
      } else {
        console.log(chalk.yellow(`Device service returned empty or invalid readings, falling back to original implementation`));
      }
    } catch (error) {
      const serviceError = error as Error;
      console.log(chalk.yellow(`Error using deviceService.readDeviceRegisters: ${serviceError?.message || String(error)}`));
      console.log(chalk.yellow(`Falling back to original polling implementation...`));
    }

    // Fall back to the original implementation if the above fails
    // Try multiple ways to get the device model to improve resiliency
    let Device;
    let device;
    
    // First try using getClientModels - the standard approach
    const models = getClientModels();
    if (models && models.Device) {
      console.log(chalk.cyan(`Using Device model from getClientModels()`));
      Device = models.Device;
      
      // Try to find the device
      console.log(chalk.cyan(`Looking up device ${deviceId} in database...`));
      console.log(chalk.cyan(`Connection status: ${Device.db?.readyState}, database: ${Device.db?.name}`));
      device = await Device.findById(deviceId).exec();
    }
    
    // If that failed, try using req.app.locals if available
    if (!device && req && req.app && req.app.locals.clientModels && req.app.locals.clientModels.Device) {
      console.log(chalk.cyan(`Using Device model from req.app.locals.clientModels`));
      Device = req.app.locals.clientModels.Device;
      console.log(chalk.cyan(`Connection status via app.locals: ${Device.db?.readyState}, database: ${Device.db?.name}`));
      device = await Device.findById(deviceId).exec();
    }
    
    // If still no device, try with mongoose.model directly as last resort
    if (!device) {
      try {
        console.log(chalk.cyan(`Trying with mongoose.model('Device') as last resort`));
        const LastResortDevice = mongoose.model('Device');
        device = await LastResortDevice.findById(deviceId).exec();
      } catch (error) {
        const err = error as Error;
        console.warn(chalk.yellow(`Failed to get device with mongoose.model: ${err?.message || String(error)}`));
      }
    }

    // If we still don't have a device, check if we can proceed anyway
    if (!device) {
      console.warn(chalk.yellow(`⚠ Device ${deviceId} not found in database but will attempt to proceed`));
      
      // For polling, we could potentially skip database validation in some cases
      // and rely on cached connection parameters, but for now we'll return null
      return null;
    }

    if (!device.enabled) {
      console.warn(
        chalk.yellow(`⚠ Device ${deviceId} (${device.name}) is disabled, skipping poll`),
      );
      return null;
    }

    console.log(chalk.blue(`Starting polling for device ${device.name} (${deviceId})`));

    // Always fetch fresh device driver configuration if device has a deviceDriverId
    // This ensures we get the latest configuration changes
    if (device.deviceDriverId) {
      console.log(chalk.cyan(`Fetching latest device driver configuration for device ${device.name}`));
      
      let deviceDriver;
      
      if (req?.app?.locals?.libraryDB) {
        const templatesCollection = req.app.locals.libraryDB.collection('templates');
        const objectId = new mongoose.Types.ObjectId(device.deviceDriverId);
        deviceDriver = await templatesCollection.findOne({ _id: objectId });
      } else if (req?.app?.locals?.libraryModels?.DeviceDriver) {
        const DeviceDriverModel = req.app.locals.libraryModels.DeviceDriver;
        deviceDriver = await DeviceDriverModel.findById(device.deviceDriverId);
      } else {
        // Try to get the AMX database models directly
        try {
          const amxDb = require('../../config/database').getAmxConnection();
          if (amxDb && amxDb.readyState === 1) {
            console.log(chalk.cyan(`Using templates collection from direct AMX connection`));
            const templatesCollection = amxDb.collection('templates');
            const objectId = new mongoose.Types.ObjectId(device.deviceDriverId);
            deviceDriver = await templatesCollection.findOne({ _id: objectId });
          }
        } catch (directError) {
          console.error(chalk.red(`Failed to get device driver directly: ${directError}`));
        }
      }
      
      if (deviceDriver) {
        console.log(chalk.green(`Found device driver: ${deviceDriver.name} (updated: ${deviceDriver.updatedAt || 'unknown'})`));
        
        // Always use fresh configuration from device driver
        // This ensures any updates to the driver are reflected immediately
        device.dataPoints = deviceDriver.dataPoints || [];
        device.writableRegisters = deviceDriver.writableRegisters || [];
        device.controlParameters = deviceDriver.controlParameters || [];
        
        console.log(chalk.cyan(`Applied fresh configuration: ${device.dataPoints.length} data points`));
      } else {
        console.warn(chalk.yellow(`Device driver not found: ${device.deviceDriverId}`));
        
        // If device driver was deleted, clear the cached configuration
        if (device.dataPoints && device.dataPoints.length > 0) {
          console.warn(chalk.yellow(`Clearing cached configuration as driver was not found`));
          device.dataPoints = [];
          device.writableRegisters = [];
          device.controlParameters = [];
        }
      }
    }

    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;

    if (!hasNewConfig && !hasLegacyConfig) {
      console.warn(
        chalk.yellow(`⚠ No data points or registers configured for device ${deviceId}`),
      );
      
      // Instead of returning null, try to create a default configuration
      // This allows polling to attempt reading from common addresses
      console.log(chalk.cyan(`Attempting to poll device ${device.name} with default configuration`));
      
      // Create a default data point configuration for testing common addresses
      const defaultAddress = device.make?.toLowerCase().includes('energy') || 
                           device.make?.toLowerCase().includes('meter') ? 1 : 1;
      
      device.dataPoints = [{
        range: {
          startAddress: defaultAddress,
          count: 2,  // Read 2 registers by default
          fc: 3      // Use FC3 (holding registers) by default
        },
        parser: {
          parameters: [{
            name: 'DefaultValue',
            registerIndex: defaultAddress,
            dataType: 'UINT16',
            byteOrder: 'AB',
            unit: '',
            scalingFactor: 1,
            decimalPoint: 0
          }]
        }
      }];
      
      console.log(chalk.yellow(`Created default configuration for device ${device.name} at address ${defaultAddress}`));
    }

    // Get connection settings (support both new and legacy format)
    const connectionType =
      device.connectionSetting?.connectionType || device.connectionType || 'tcp';
    console.log(chalk.blue(`Device ${device.name} connection type: ${connectionType}`));

    // Create a new ModbusRTU client
    client = createModbusClient();
    client.on('error', (err: Error | any) => {
      console.error(chalk.red(`💥 Unhandled client error: ${err?.message || String(err)}`));
    });

    // Set timeout from device advanced settings if available, otherwise use default
    let connectionTimeout = 5000; // 5 seconds default
    if (device.advancedSettings?.connectionOptions?.timeout !== undefined) {
      const configuredTimeout = Number(device.advancedSettings.connectionOptions.timeout);
      if (!isNaN(configuredTimeout) && configuredTimeout > 0) {
        connectionTimeout = configuredTimeout;
        console.log(chalk.cyan(`[polling] Using timeout from advanced settings: ${connectionTimeout}ms`));
      }
    }
    client.setTimeout(connectionTimeout);

    const readings: ParameterReading[] = [];

    // Connect based on connection type
    if (connectionType === 'tcp') {
      const ip = device.connectionSetting?.tcp?.ip || device.ip || '';
      let port = 502; // Default Modbus TCP port

      if (device.connectionSetting?.tcp?.port) {
        port = Number(device.connectionSetting.tcp.port);
      } else if (device.port) {
        port = Number(device.port);
      }

      // Validate port is a reasonable number
      if (isNaN(port) || port <= 0 || port > 65535) {
        port = 502; // Use default Modbus port if invalid
      }

      console.log(chalk.cyan(`TCP connection settings - IP: ${ip}, Port: ${port}`));

      if (!ip) {
        throw new Error('Missing IP address for TCP connection');
      }

      // Connect to TCP device
      // Add timeout to TCP connection to prevent hanging
      const connectPromise = client.connectTCP(ip, { port });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TCP connection timeout after 10 seconds')), 10000)
      );
      
      try {
        await Promise.race([connectPromise, timeoutPromise]);
        console.log(chalk.green(`✓ Connected to TCP device ${device.name} at ${ip}:${port}`));
      } catch (error) {
        console.error(chalk.red(`[pollingService] TCP connection failed for device ${device.name}: ${error}`));
        throw error;
      }

      // Set slave ID for TCP
      const slaveId = device.connectionSetting?.tcp?.slaveId || device.slaveId || 1;
      client.setID(slaveId);
      console.log(chalk.cyan(`Using slave ID ${slaveId} for TCP device`));
    } else if (connectionType === 'rtu') {
      // RTU connection parameters
      const serialPort = device.connectionSetting?.rtu?.serialPort || device.serialPort || '';
      const baudRate = device.connectionSetting?.rtu?.baudRate || device.baudRate || 9600;
      const dataBits = device.connectionSetting?.rtu?.dataBits || device.dataBits || 8;
      const stopBits = device.connectionSetting?.rtu?.stopBits || device.stopBits || 1;
      const parity = device.connectionSetting?.rtu?.parity || device.parity || 'none';
      const slaveId = device.connectionSetting?.rtu?.slaveId || device.slaveId || 1;

      console.log(
        chalk.cyan(
          `RTU connection settings - Port: ${serialPort}, Baud: ${baudRate}, Parity: ${parity}`,
        ),
      );

      if (!serialPort) {
        throw new Error('Missing serial port for RTU connection');
      }

      try {
        // Connect with simple approach like the working script
        await client.connectRTUBuffered(serialPort, {
          baudRate,
          dataBits: dataBits as 5 | 6 | 7 | 8,
          stopBits: stopBits as 1 | 2,
          parity: parity as 'none' | 'even' | 'odd',
        });

        // Set the slave ID
        client.setID(slaveId);

        console.log(chalk.green(`✓ Connected to RTU device ${device.name} at ${serialPort}`));
      } catch (rtuError: any) {
        if (rtuError.message && rtuError.message.includes('No such file or directory')) {
          throw new Error(`Serial port ${serialPort} does not exist on this system`);
        }
        throw rtuError;
      }
    } else {
      throw new Error(`Unknown connection type: ${connectionType}`);
    }

    // Process data points (new structure)
    if (hasNewConfig && device.dataPoints) {
      console.log(chalk.blue(`Starting to read data points for device ${device.name}`));

      for (const dataPoint of device.dataPoints) {
        try {
          const range = dataPoint.range;
          const parser = dataPoint.parser;

          console.log(
            chalk.cyan(
              `Reading range FC=${range.fc} from address ${range.startAddress}, count: ${range.count}`,
            ),
          );

          // Read registers based on function code
          let result: ModbusResponse | undefined;

          switch (range.fc) {
            case 1:
              result = await client.readCoils(range.startAddress, range.count);
              break;
            case 2:
              result = await client.readDiscreteInputs(range.startAddress, range.count);
              break;
            case 3:
              // Read holding registers with simplified approach
              console.log(
                chalk.blue(
                  `Reading holding registers from address ${range.startAddress}, count: ${range.count}`,
                ),
              );
              try {
                console.log(chalk.bgBlue.white(`📖 Reading ${range.count} holding registers in a single operation from address ${range.startAddress}`));
                
                // Get retry settings from advanced settings
                let retries = 0;
                let retryDelay = 500;
                
                if (device.advancedSettings?.connectionOptions?.retries !== undefined) {
                  retries = Number(device.advancedSettings.connectionOptions.retries);
                  if (isNaN(retries) || retries < 0) {
                    retries = 0;
                  }
                  console.log(chalk.cyan(`[polling] Using retry setting from advanced settings: ${retries}`));
                }
                
                if (device.advancedSettings?.connectionOptions?.retryInterval !== undefined) {
                  retryDelay = Number(device.advancedSettings.connectionOptions.retryInterval);
                  if (isNaN(retryDelay) || retryDelay < 0) {
                    retryDelay = 500;
                  }
                  console.log(chalk.cyan(`[polling] Using retry delay from advanced settings: ${retryDelay}ms`));
                }

                // Use the timeout value we set earlier based on device settings
                const holdingResult = await readHoldingRegistersWithRetries( 
                  client,
                  range.startAddress,
                  range.count,
                  connectionTimeout, 
                  retries,
                  retryDelay
                );
                
                // Enhanced logging of the result
                if (holdingResult && Array.isArray(holdingResult.data)) {
                  console.log(chalk.bgGreen.black(`✅ Successfully read ${holdingResult.data.length} holding registers: [${holdingResult.data.join(', ')}]`));
                  
                  // If we have a buffer, log it as well
                  if (holdingResult.buffer) {
                    console.log(chalk.cyan(`📊 Raw buffer: ${holdingResult.buffer.toString('hex')}`));
                  }
                }
                
                result = holdingResult;
              } catch (readError: any) {
                console.error(chalk.red(`Error reading holding registers: ${readError.message}`));
                throw readError;
              }
              break;
            case 4:
              // Read input registers with improved approach for consecutive registers
              console.log(
                chalk.blue(
                  `Reading ${range.count} consecutive input registers from address ${range.startAddress}`,
                ),
              );
              try {
                console.log(chalk.bgBlue.white(`📖 Reading ${range.count} input registers in a single operation from address ${range.startAddress}`));
                
                // Get retry settings from advanced settings
                let retries = 0;
                let retryDelay = 500;
                
                if (device.advancedSettings?.connectionOptions?.retries !== undefined) {
                  retries = Number(device.advancedSettings.connectionOptions.retries);
                  if (isNaN(retries) || retries < 0) {
                    retries = 0;
                  }
                  console.log(chalk.cyan(`[polling] Using retry setting from advanced settings: ${retries}`));
                }
                
                if (device.advancedSettings?.connectionOptions?.retryInterval !== undefined) {
                  retryDelay = Number(device.advancedSettings.connectionOptions.retryInterval);
                  if (isNaN(retryDelay) || retryDelay < 0) {
                    retryDelay = 500;
                  }
                  console.log(chalk.cyan(`[polling] Using retry delay from advanced settings: ${retryDelay}ms`));
                }
                
                // Use the timeout value we set earlier based on device settings
                const inputResult = await readInputRegistersWithRetries(
                  client,
                  range.startAddress,
                  range.count,
                  connectionTimeout,
                  retries,
                  retryDelay
                );
                
                // Enhanced logging of the result
                if (inputResult && Array.isArray(inputResult.data)) {
                  console.log(chalk.bgGreen.black(`✅ Successfully read ${inputResult.data.length} input registers: [${inputResult.data.join(', ')}]`));
                  
                  // If we have a buffer, log it as well
                  if (inputResult.buffer) {
                    console.log(chalk.cyan(`📊 Raw buffer: ${inputResult.buffer.toString('hex')}`));
                  }
                }
                
                result = inputResult;
              } catch (readError: any) {
                console.error(chalk.red(`❌ Error reading input registers: ${readError.message}`));
                throw readError;
              }
              break;
            default:
              console.log(
                chalk.yellow(
                  `Unknown function code ${range.fc}, defaulting to read holding registers`,
                ),
              );
              // Default to reading holding registers if function code is unknown
              // Get retry settings
              let retries = 0;
              let retryDelay = 500;
                
              if (device.advancedSettings?.connectionOptions?.retries !== undefined) {
                retries = Number(device.advancedSettings.connectionOptions.retries);
                if (isNaN(retries) || retries < 0) {
                  retries = 0;
                }
              }
                
              if (device.advancedSettings?.connectionOptions?.retryInterval !== undefined) {
                retryDelay = Number(device.advancedSettings.connectionOptions.retryInterval);
                if (isNaN(retryDelay) || retryDelay < 0) {
                  retryDelay = 500;
                }
              }
                
              // Use the configured timeout
              result = await readHoldingRegistersWithRetries(client, range.startAddress, range.count, connectionTimeout, retries, retryDelay);
          }

          // Make sure result is defined before continuing
          if (!result || !result.data) {
            throw new Error(
              `No data returned from device for FC=${range.fc}, address=${range.startAddress}`,
            );
          }

          console.log(
            chalk.green(
              `✓ Read successful from address ${range.startAddress}, data length: ${result.data.length}`,
            ),
          );

          // Log raw data for debugging
          if (range.fc === 3 || range.fc === 4) {
            try {
              const dataValues = result.data.map((val: any) =>
                typeof val === 'number' ? val.toString(16).padStart(4, '0') : String(val),
              );
              console.log(
                chalk.cyan(
                  `${range.fc === 3 ? 'Holding' : 'Input'} register values (hex): [${dataValues.join(', ')}]`,
                ),
              );
            } catch (error: any) {
              console.log(chalk.yellow(`Could not log register values: ${error.message}`));
            }
          }

          // Process the result based on parser configuration
          if (result && parser && parser.parameters) {
            console.log(
              chalk.cyan(
                `Processing ${parser.parameters.length} parameters from range FC=${range.fc}`,
              ),
            );

            for (const param of parser.parameters) {
              try {
                // Calculate the register index relative to the range start
                // This logic is very important - need to properly handle both absolute and relative addressing
                let relativeIndex;
                
                // Check if parameter index is within the valid range
                if (param.registerIndex >= range.startAddress && 
                    param.registerIndex < range.startAddress + range.count) {
                  // This is an absolute index (register address), calculate the relative position
                  relativeIndex = param.registerIndex - range.startAddress;
                  console.log(chalk.cyan(`Parameter ${param.name} uses absolute addressing: ${param.registerIndex} -> ${relativeIndex}`));
                } else if (param.registerIndex < range.count) {
                  // This is already a relative index (offset from start)
                  relativeIndex = param.registerIndex;
                  console.log(chalk.cyan(`Parameter ${param.name} uses relative addressing: ${param.registerIndex}`));
                } else {
                  // Not a valid index - either way
                  relativeIndex = param.registerIndex - range.startAddress;
                  console.log(chalk.yellow(`Parameter ${param.name} has unusual register index ${param.registerIndex}, trying as absolute index`));
                }

                if (relativeIndex < 0 || relativeIndex >= range.count) {
                  console.log(
                    chalk.yellow(
                      `⚠ Parameter ${param.name} register index ${param.registerIndex} is out of range (relative: ${relativeIndex}), skipping`,
                    ),
                  );
                  continue; // Skip if out of range
                }

                // Extract and process the value
                let value: any = null;

                switch (param.dataType) {
                  case 'FLOAT32':
                    // Ensure we always read 2 consecutive registers for FLOAT32
                    if (relativeIndex + 1 < range.count) {
                      // Create a buffer for the float
                      const buffer = Buffer.alloc(4);
                      
                      // Get the two registers needed for FLOAT32
                      const reg1 = Number(result.data[relativeIndex]);
                      const reg2 = Number(result.data[relativeIndex + 1]);
                      
                      console.log(chalk.cyan(`Processing FLOAT32 value from registers: [${reg1}, ${reg2}] with byte order ${param.byteOrder || 'ABCD'}`));

                      // Handle different byte orders
                      const byteOrder = param.byteOrder || 'ABCD';
                      if (byteOrder === 'ABCD') {
                        buffer.writeUInt16BE(reg1, 0);
                        buffer.writeUInt16BE(reg2, 2);
                      } else if (byteOrder === 'CDAB') {
                        buffer.writeUInt16BE(reg2, 0);
                        buffer.writeUInt16BE(reg1, 2);
                      } else if (byteOrder === 'BADC') {
                        buffer.writeUInt16BE(Number(swapBytes(reg1)), 0);
                        buffer.writeUInt16BE(Number(swapBytes(reg2)), 2);
                      } else if (byteOrder === 'DCBA') {
                        buffer.writeUInt16BE(Number(swapBytes(reg2)), 0);
                        buffer.writeUInt16BE(Number(swapBytes(reg1)), 2);
                      }

                      value = buffer.readFloatBE(0);
                      console.log(chalk.green(`Converted FLOAT32 value: ${value}`));
                      
                      // Check for invalid values
                      if (!isFinite(value)) {
                        console.log(chalk.yellow(`Warning: FLOAT32 conversion resulted in ${value}, setting to null`));
                        value = null;
                      }
                    } else {
                      console.log(chalk.red(`Error: Cannot read FLOAT32 value - not enough registers available. Need 2 registers but only have ${range.count - relativeIndex}`));
                      value = null;
                    }
                    break;
                  case 'INT16':
                    if (param.byteOrder === 'AB') {
                      value = Number(result.data[relativeIndex]);
                      // Convert to signed if needed
                      if (value > 32767) {
                        value = value - 65536;
                      }
                    } else {
                      value = Number(swapBytes(Number(result.data[relativeIndex])));
                      // Convert to signed if needed
                      if (value > 32767) {
                        value = value - 65536;
                      }
                    }
                    break;
                  case 'UINT16':
                    if (param.byteOrder === 'AB') {
                      value = Number(result.data[relativeIndex]);
                    } else {
                      value = Number(swapBytes(Number(result.data[relativeIndex])));
                    }
                    break;
                  default:
                    value = result.data[relativeIndex];
                }

                // Apply scaling factor if defined
                if (param.scalingFactor && param.scalingFactor !== 1 && typeof value === 'number') {
                  value = value * param.scalingFactor;
                }

                // Apply scaling equation if defined
                if (param.scalingEquation && typeof value === 'number') {
                  try {
                    // Simple equation evaluation (x is the value)
                    const x = value;
                    // Use Function constructor to safely evaluate the equation
                    value = new Function('x', `return ${param.scalingEquation}`)(x);
                  } catch (equationError) {
                    console.error('Scaling equation error:', equationError);
                  }
                }

                // Format decimal places if defined
                if (param.decimalPoint && param.decimalPoint > 0 && typeof value === 'number') {
                  value = parseFloat(value.toFixed(param.decimalPoint));
                }

                const reading = {
                  name: param.name,
                  registerIndex: param.registerIndex,
                  value: value,
                  unit: param.unit || '',
                  dataType: param.dataType,
                };

                console.log(chalk.green(`✓ Parameter ${param.name}: ${value}${param.unit || ''}`));
                readings.push(reading);
              } catch (paramError: any) {
                console.error(
                  chalk.red(`❌ Error processing parameter ${param.name}: ${paramError.message}`),
                );
                readings.push({
                  name: param.name,
                  registerIndex: param.registerIndex,
                  value: null,
                  unit: param.unit || '',
                  error: paramError.message,
                });
              }
            }
          }
        } catch (rangeError: any) {
          const rangeStart = dataPoint.range.startAddress;
          const rangeEnd = dataPoint.range.startAddress + dataPoint.range.count - 1;
          console.error(
            chalk.red(
              `❌ Error reading range FC=${dataPoint.range.fc} (${rangeStart}-${rangeEnd}): ${rangeError.message}`,
            ),
          );
          
          // Store error information in readings for this range
          if (dataPoint.parser && dataPoint.parser.parameters) {
            for (const param of dataPoint.parser.parameters) {
              readings.push({
                name: param.name,
                registerIndex: param.registerIndex,
                value: null,
                unit: param.unit || '',
                dataType: param.dataType,
                error: `Failed to read range: ${rangeError.message}`
              });
            }
          } else {
            // If no parameters defined, create a generic error reading
            readings.push({
              name: `Range_${rangeStart}_${rangeEnd}`,
              registerIndex: rangeStart,
              value: null,
              unit: '',
              error: `Failed to read range: ${rangeError.message}`
            });
          }
          
          // Continue to next range after storing error
        }
      }
    }
    // Process legacy structure
    else if (hasLegacyConfig && device.registers) {
      for (const register of device.registers) {
        try {
          const result: ModbusResponse = await client.readHoldingRegisters(
            register.address,
            register.length,
          );

          // Make sure result is defined before continuing
          if (!result || !result.data || result.data.length === 0) {
            throw new Error(`No data returned from device for register ${register.address}`);
          }

          // Process the result based on register configuration
          let value: number;
          if (Array.isArray(result.data) && result.data.length > 0 && typeof result.data[0] === 'number') {
            value = result.data[0];
          } else {
            throw new Error(`Invalid data format returned for register ${register.address}`);
          }

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
            address: register.address,
            value: value,
            unit: register.unit || '',
          });
        } catch (registerError: any) {
          readings.push({
            name: register.name,
            address: register.address,
            value: null,
            unit: register.unit || '',
            error: registerError.message,
          });
        }
      }
    }

    // Update device lastSeen timestamp
    device.lastSeen = new Date();
    await device.save();

    // Check if we have any actual readings with values
    const validReadings = readings.filter(r => r.value !== null && r.value !== undefined && !r.error);
    
    console.log(chalk.cyan(`Found ${validReadings.length} valid readings out of ${readings.length} total readings`));
    
    if (validReadings.length === 0 && readings.length > 0) {
      console.log(chalk.yellow(`⚠ No valid readings found for device ${device.name} (${deviceId}) - all readings have null values or errors`));
    }
    
    // Prepare the result with all readings (including errors)
    const deviceReading: DeviceReading = {
      deviceId: device._id,
      deviceName: device.name,
      timestamp: new Date(),
      readings,
    };

    // Store in real-time cache
    realtimeDataCache.set(deviceId, deviceReading);
    console.log(chalk.blue(`Updated real-time cache for device ${device.name}`));

    // Store in realtime database 
    // Don't await this call to avoid blocking - just let it run in the background
    storeRealtimeData(deviceId, deviceReading, req)
      .catch(err => console.error(chalk.red(`❌ Error storing realtime data: ${err}`)));

    // Store in history database only if we have valid readings
    if (validReadings.length > 0) {
      await storeHistoricalData(deviceReading, req);
      console.log(
        chalk.green(`✓ Successfully polled device ${device.name} with ${validReadings.length} valid readings`),
      );
    } else {
      console.log(chalk.yellow(`⚠ No valid readings to store in historical data for device ${device.name}`));
    }

    return deviceReading;
  } catch (error: any) {
    // Create a more user-friendly error message
    const errorMsg = `Error polling device ${deviceId}: ${error.message || 'Unknown error'}`;
    console.error(chalk.red(errorMsg));

    try {
      // Get device name for better error reporting
      let deviceName = deviceId;
      
      // Try multiple ways to get device name to improve resilience
      try {
        // First try using the client models from getClientModels()
        const clientModels = getClientModels();
        if (clientModels && clientModels.Device) {
          const device = await clientModels.Device.findById(deviceId).select('name').lean().exec();
          if (device && device.name) {
            deviceName = device.name;
          }
        }
        
        // If that didn't work, try req.app.locals
        if (deviceName === deviceId && req && req.app && req.app.locals.clientModels) {
          const device = await req.app.locals.clientModels.Device.findById(deviceId).select('name').lean().exec();
          if (device && device.name) {
            deviceName = device.name;
          }
        }
      } catch (error) {
        const nameError = error as Error;
        console.warn(chalk.yellow(`⚠ Could not get device name: ${nameError?.message || String(error)}`));
      }

      // Create error reading for the device
      const errorReading: DeviceReading = {
        deviceId: mongoose.Types.ObjectId.isValid(deviceId) 
          ? new mongoose.Types.ObjectId(deviceId)
          : new mongoose.Types.ObjectId(), // fallback to a new ID if invalid
        deviceName: deviceName,
        timestamp: new Date(),
        readings: [
          {
            name: 'connection_status',
            value: 'error',
            error: errorMsg,
          },
        ],
      };

      // Update cache with error status
      realtimeDataCache.set(deviceId, errorReading);
    } catch (cacheError) {
      console.error(`Error updating cache for device ${deviceId}:`, cacheError);
    }

    return null;
  } finally {
    // Always close the connection if open
    if (client) {
      try {
        // Add a timeout to prevent hanging on close
        const closePromise = safeCloseModbusClient(client);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Close timeout after 3 seconds')), 3000)
        );
        
        await Promise.race([closePromise, timeoutPromise]);
        console.log(chalk.cyan(`✓ Closed Modbus connection`));
      } catch (closeError) {
        console.warn(chalk.yellow(`⚠ Error closing Modbus connection:`), closeError);
        // Force close if safe close fails
        try {
          client.close();
        } catch (forceCloseError) {
          // Silently ignore force close errors
        }
      }
    }
  }
}

/**
 * Helper function to swap bytes in a 16-bit word
 * @param word The 16-bit word to swap bytes for
 * @returns The word with bytes swapped
 */
function swapBytes(word: number): number {
  // Ensure we're dealing with a number
  const value = Number(word);
  if (isNaN(value)) {
    console.warn('swapBytes received a non-numeric value:', word);
    return 0;
  }
  return ((value & 0xff) << 8) | ((value >> 8) & 0xff);
}

/**
 * Get the latest real-time data for a device
 * @param deviceId The ID of the device
 * @returns The latest device reading or null if not available
 */
export function getRealtimeData(deviceId: string): DeviceReading | null {
  return realtimeDataCache.get(deviceId) || null;
}

/**
 * Get RealtimeData model with the same approach as getDeviceModel
 */
async function getRealtimeDataModel(reqContext: any): Promise<mongoose.Model<any> | null> {
  // Try to get from app.locals
  if (reqContext?.app?.locals?.clientModels?.RealtimeData) {
    const RealtimeDataModel = reqContext.app.locals.clientModels.RealtimeData;
    
    // Verify the connection is ready (readyState 1 means connected)
    if (RealtimeDataModel.db?.readyState === 1) {
      return RealtimeDataModel;
    }
  }

  // Try to get from getClientModels as another option
  const clientModels = getClientModels();
  if (clientModels && clientModels.RealtimeData) {
    if (clientModels.RealtimeData.db?.readyState === 1) {
      return clientModels.RealtimeData;
    }
  }

  // Use the default RealtimeData model as fallback
  // But first, check if the default model's connection is ready (readyState 1 means connected)
  if (RealtimeData && RealtimeData.db?.readyState === 1) {
    return RealtimeData;
  }
  
  // Try mongoose.model as last resort
  try {
    const ModelFromMongoose = mongoose.model('RealtimeData');
    if (ModelFromMongoose.db?.readyState === 1) {
      return ModelFromMongoose;
    }
  } catch (error) {
    // Silently handle error
  }
  
  // If we get here, no valid model available
  return null;
}

/**
 * Get HistoricalData model with the same approach as getDeviceModel
 */
async function getHistoricalDataModel(reqContext: any): Promise<mongoose.Model<any> | null> {
  // Try to get from app.locals
  if (reqContext?.app?.locals?.clientModels?.HistoricalData) {
    const HistoricalDataModel = reqContext.app.locals.clientModels.HistoricalData;
    
    // Verify the connection is ready (readyState 1 means connected)
    if (HistoricalDataModel.db?.readyState === 1) {
      return HistoricalDataModel;
    }
  }

  // Try to get from getClientModels as another option
  const clientModels = getClientModels();
  if (clientModels && clientModels.HistoricalData) {
    if (clientModels.HistoricalData.db?.readyState === 1) {
      return clientModels.HistoricalData;
    }
  }

  // Use the default HistoricalData model as fallback
  // But first, check if the default model's connection is ready (readyState 1 means connected)
  if (HistoricalData && HistoricalData.db?.readyState === 1) {
    return HistoricalData;
  }
  
  // Try mongoose.model as last resort
  try {
    const ModelFromMongoose = mongoose.model('HistoricalData');
    if (ModelFromMongoose.db?.readyState === 1) {
      return ModelFromMongoose;
    }
  } catch (error) {
    // Silently handle error
  }
  
  // If we get here, no valid model available
  return null;
}

/**
 * Store real-time data for a device in the cache and database
 * This allows external systems like the auto-polling service to share data
 */
export async function storeRealtimeData(deviceId: string, data: DeviceReading, req?: any): Promise<void> {
  if (data) {
    // CRITICAL: Synchronize control bit and schedule bit values before storing
    // Rule: If control bit is OFF, schedule bit must also be OFF
    try {
      if (data.readings && Array.isArray(data.readings)) {
        // Find control bit (looking for any variation of "control" in the name, case insensitive)
        const controlBitReading = data.readings.find(r => 
          r.name && typeof r.name === 'string' && 
          r.name.toLowerCase().includes('control')
        );
        
        // Find schedule bit (looking for any variation of "schedule" in the name, case insensitive)
        const scheduleBitReading = data.readings.find(r => 
          r.name && typeof r.name === 'string' && 
          r.name.toLowerCase().includes('schedule')
        );
        
        // If we found both control and schedule bits, enforce the rule:
        // If control bit is OFF (false), schedule bit MUST be OFF (false) too
        if (controlBitReading && scheduleBitReading) {
          console.log(chalk.cyan(
            `[pollingService] Found control bit (${controlBitReading.value}) and ` +
            `schedule bit (${scheduleBitReading.value})`
          ));
          
          // Cache the current state for reference
          controlBitStateCache.set(deviceId, {
            controlValue: Boolean(controlBitReading.value),
            scheduleValue: Boolean(scheduleBitReading.value)
          });
          
          // Force schedule bit to OFF if control bit is OFF
          if (controlBitReading.value === false && scheduleBitReading.value === true) {
            console.log(chalk.yellow(
              `[pollingService] ⚠️ INCONSISTENCY DETECTED: Control bit is OFF but schedule bit is ON. ` +
              `Forcing schedule bit to OFF for consistency.`
            ));
            scheduleBitReading.value = false;
            
            // Update the cache
            controlBitStateCache.set(deviceId, {
              controlValue: false,
              scheduleValue: false
            });
            
            // Also attempt a physical device write to ensure consistency
            // This is done asynchronously and we don't wait for it
            try {
              // Dynamically import to avoid circular dependencies
              import('./coilControl.service').then(coilControlService => {
                const scheduleAddress = 
                  typeof scheduleBitReading.address === 'number' ? 
                  scheduleBitReading.address : 
                  (typeof scheduleBitReading.registerIndex === 'number' ? 
                  scheduleBitReading.registerIndex : null);
                  
                if (scheduleAddress !== null) {
                  console.log(chalk.cyan(`[pollingService] Writing schedule bit OFF to device at address ${scheduleAddress}`));
                  coilControlService.controlCoilRegister(
                    deviceId,
                    scheduleAddress,
                    false,
                    req,
                    'schedule'
                  ).catch(writeError => {
                    console.error(chalk.red(`[pollingService] Error writing schedule bit: ${writeError}`));
                  });
                }
              }).catch(importError => {
                console.error(chalk.red(`[pollingService] Error importing coilControl service: ${importError}`));
              });
            } catch (syncError) {
              console.error(chalk.red(`[pollingService] Error during control/schedule sync: ${syncError}`));
              // Continue anyway - we've already fixed the in-memory value
            }
          }
        }
      }
    } catch (syncError) {
      console.error(chalk.red(`[pollingService] Error synchronizing control/schedule bits: ${syncError}`));
      // Continue with storage - don't let this prevent the data being stored
    }
    
    // Update in-memory cache immediately
    realtimeDataCache.set(deviceId, data);
    console.log(chalk.blue(`Updated real-time cache for device ${data.deviceName} from external source`));
    
    // Try to store in database as well
    try {
      // Get RealtimeData model using the same approach as device service
      const RealtimeDataModel = await getRealtimeDataModel(req);
      
      // If we still don't have a model, skip database storage
      if (!RealtimeDataModel) {
        console.warn(chalk.yellow(`⚠ RealtimeData model not available, skipping database storage`));
        return; // Skip database storage instead of throwing an error
      }
      
      // Use a shorter timeout for database operations
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timeout')), 3000)
      );
      
      // Use findOneAndUpdate with upsert instead of findOne + save to avoid version conflicts
      const updatePromise = RealtimeDataModel.findOneAndUpdate(
        { deviceId },
        { 
          $set: {
            readings: data.readings,
            timestamp: data.timestamp,
            lastUpdated: new Date(),
            deviceName: data.deviceName // Ensure deviceName is always set
          }
        },
        { 
          upsert: true, // Create document if it doesn't exist
          new: true,    // Return the updated document
          runValidators: true, // Ensure data meets schema validation
          maxTimeMS: 3000 // MongoDB timeout
        }
      );
      
      try {
        const updateResult = await Promise.race([updatePromise, timeoutPromise]);
        
        if (updateResult) {
          console.log(chalk.green(`✅ Updated realtime database entry for device ${data.deviceName}`));
        } else {
          console.log(chalk.yellow(`⚠️ Could not update realtime database entry for device ${data.deviceName}`));
        }
      } catch (timeoutError) {
        console.warn(chalk.yellow(`⚠ Database operation timed out for device ${data.deviceName}, but cache was updated`));
      }
    } catch (error) {
      // Log error but don't throw - we still want the in-memory cache to be updated
      if (error instanceof Error && error.message.includes('buffering timed out')) {
        console.warn(chalk.yellow(`⚠ Database is not available (buffering timeout) for device ${data.deviceName}, but cache was updated`));
      } else {
        console.error(chalk.red(`❌ Error storing realtime data in database: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }
}

/**
 * Check if a device has active polling
 * @param deviceId The ID of the device
 * @returns True if the device is being actively polled, false otherwise
 */
export function isDevicePollingActive(deviceId: string): boolean {
  return pollingIntervals.has(deviceId);
}

/**
 * Store device reading in historical database
 * @param deviceReading The device reading to store
 */
async function storeHistoricalData(deviceReading: DeviceReading, req?: any): Promise<void> {
  try {
    // Get the HistoricalData model from client connection
    console.log(
      chalk.blue(`Preparing to store historical data for device ${deviceReading.deviceName}`),
    );

    // Get HistoricalData model using the same approach as device service
    const HistoricalDataModel = await getHistoricalDataModel(req);
    
    // If we still don't have a model, skip historical data storage
    if (!HistoricalDataModel) {
      console.warn(
        chalk.yellow(`⚠ HistoricalData model not available, skipping historical data storage`),
      );
      return; // Skip historical data storage instead of throwing an error
    }

    // Filter out readings with errors or null values
    const validReadings = deviceReading.readings.filter(
      reading => reading.value !== null && reading.value !== undefined && !reading.error,
    );

    console.log(
      chalk.cyan(
        `Found ${validReadings.length}/${deviceReading.readings.length} valid readings to store`,
      ),
    );

    // Create history data entries for valid readings only
    const historyEntries = validReadings.map(reading => ({
      deviceId: deviceReading.deviceId,
      parameterName: reading.name,
      value: reading.value,
      unit: reading.unit,
      timestamp: deviceReading.timestamp,
      quality: 'good', // These are all valid readings since we filtered out errors
    }));

    // Insert historical data if there are valid entries
    if (historyEntries.length > 0) {
      // Use a timeout for the database operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timeout')), 3000)
      );
      
      const insertPromise = HistoricalDataModel.insertMany(historyEntries, { 
        ordered: false // Continue inserting even if some fail
      });
      
      try {
        await Promise.race([insertPromise, timeoutPromise]);
        console.log(
          chalk.green(`✓ Successfully stored ${historyEntries.length} historical data points`),
        );
      } catch (timeoutError) {
        console.warn(chalk.yellow(`⚠ Database operation timed out for historical data, but realtime cache was updated`));
      }
    }
  } catch (error: any) {
    // Handle specific database errors more gracefully
    if (error.message && error.message.includes('buffering timed out')) {
      console.warn(chalk.yellow(`⚠ Database is not available (buffering timeout) for historical data`));
    } else {
      console.error(chalk.red(`❌ Error storing historical data: ${error.message || error}`));
    }
  }
}

// Store polling intervals by device ID
const pollingIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Start polling for a device at a specific interval
 * @param deviceId The ID of the device to poll
 * @param intervalMs The polling interval in milliseconds
 * @returns The interval ID
 */
export function startPollingDevice(deviceId: string, intervalMs = 10000): NodeJS.Timeout {
  // Ensure we don't have duplicate polling intervals
  stopPollingDevice(deviceId);
  
  console.log(
    chalk.magenta(
      `🔄 Starting polling service for device ${deviceId} at ${intervalMs}ms intervals`,
    ),
  );

  // The polling function with improved error handling and resilience
  const doPoll = async () => {
    console.log(chalk.blue(`📊 Running polling cycle for device ${deviceId}`));
    try {
      // Just pass null for req since we don't have access to it here
      await pollDevice(deviceId, null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`❌ Error polling device ${deviceId}: ${errorMessage}`));
      
      // Check if device exists and is enabled using multiple approaches for resilience
      let deviceFound = false;
      let deviceEnabled = true;
      
      try {
        // First try with getClientModels
        const clientModels = getClientModels();
        if (clientModels?.Device) {
          const device = await clientModels.Device.findById(deviceId).select('enabled').lean().exec();
          if (device) {
            deviceFound = true;
            // Handle device.enabled safely with type checking
            deviceEnabled = device && typeof device === 'object' && 'enabled' in device ? 
              device.enabled !== false : true; // treat undefined as enabled
          }
        }
        
        // If device not found, try with mongoose.model directly as last resort
        if (!deviceFound) {
          try {
            const LastResortDevice = mongoose.model('Device');
            const device = await LastResortDevice.findById(deviceId).select('enabled').lean().exec();
            if (device) {
              deviceFound = true;
              // Handle device.enabled safely with type checking
              deviceEnabled = device && typeof device === 'object' && 'enabled' in device ? 
                device.enabled !== false : true;
            }
          } catch (error) {
            const modelError = error as Error;
            console.warn(chalk.yellow(`Failed to check device with mongoose.model: ${modelError?.message || String(error)}`));
          }
        }
          
        // If device is disabled or deleted, stop polling
        if (!deviceEnabled) {
          console.log(chalk.yellow(`⚠ Device ${deviceId} is disabled, stopping polling`));
          stopPollingDevice(deviceId);
        }
      } catch (checkError) {
        // If we can't check the device, continue polling
        console.warn(chalk.yellow(`⚠ Could not check device status: ${checkError}`));
      }
    }
  };

  // Poll once immediately
  doPoll().catch(err => {
    console.error(chalk.red(`❌ Error in initial poll for device ${deviceId}:`, err));
  });

  // Set up regular polling with the interval stored in the map
  const intervalId = setInterval(doPoll, intervalMs);
  pollingIntervals.set(deviceId, intervalId);
  
  return intervalId;
}

/**
 * Stop polling for a device
 * @param deviceId The ID of the device to stop polling
 * @returns boolean indicating if polling was stopped
 */
export function stopPollingDevice(deviceId: string): boolean {
  console.log(chalk.bgYellow.black(`🛑 API: stopPollingDevice called for device ${deviceId}`));
  
  const interval = pollingIntervals.get(deviceId);
  if (interval) {
    try {
      clearInterval(interval);
      pollingIntervals.delete(deviceId);
      console.log(chalk.yellow(`⏹ Stopped polling service for device ${deviceId}`));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Error stopping polling for device ${deviceId}: ${errorMessage}`));
      // Still remove from map to prevent memory leaks
      pollingIntervals.delete(deviceId);
      return false;
    }
  } else {
    // No polling was running
    console.log(chalk.yellow(`⚠ No active polling service found for device ${deviceId}`));
    return false;
  }
}

/**
 * Start or restart polling for a device
 * @param deviceId The ID of the device
 * @param intervalMs The polling interval in milliseconds
 * @returns boolean indicating if polling was successfully configured
 */
export function setDevicePolling(deviceId: string, intervalMs = 10000): boolean {
  console.log(chalk.bgBlue.white(`💡 API: setDevicePolling called for device ${deviceId} with interval ${intervalMs}ms`));
  
  if (!deviceId) {
    console.error(chalk.red('❌ Cannot start polling: Invalid device ID'));
    return false;
  }
  
  if (intervalMs < 1000) {
    console.warn(chalk.yellow(`⚠ Polling interval ${intervalMs}ms is too low, using 1000ms instead`));
    intervalMs = 1000;
  }
  
  console.log(
    chalk.blue(`Configuring polling for device ${deviceId} with interval ${intervalMs}ms`),
  );

  try {
    // Stop existing polling if any
    stopPollingDevice(deviceId);

    // Start new polling
    const intervalId = startPollingDevice(deviceId, intervalMs);
    pollingIntervals.set(deviceId, intervalId);

    console.log(chalk.green(`✓ Device ${deviceId} polling service configured successfully`));
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`❌ Failed to configure polling for device ${deviceId}: ${errorMessage}`));
    return false;
  }
}
