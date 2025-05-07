import ModbusRTU from 'modbus-serial';
import mongoose from 'mongoose';
import { getClientModels } from '../../config/database';
import chalk from 'chalk';

// Import the specific types from modbus-serial
import { ReadCoilResult, ReadRegisterResult } from 'modbus-serial/ModbusRTU';

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
export async function pollDevice(deviceId: string): Promise<DeviceReading | null> {
  try {
    console.log(chalk.blue(`Starting poll for device ${deviceId}`));
    
    // Get the Device model from client connection
    const clientModels = getClientModels();
    if (!clientModels || !clientModels.Device) {
      throw new Error('Client Device model not available');
    }
    const Device = clientModels.Device;

    // Perform the findById with a timeout
    console.log(chalk.cyan(`Looking up device ${deviceId} in database...`));
    const findPromise = Device.findById(deviceId).exec();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Device findById operation timed out')), 5000);
    });

    // Find device with timeout
    const device = await Promise.race([findPromise, timeoutPromise]);

    if (!device) {
      console.warn(chalk.yellow(`⚠ Device ${deviceId} not found in database`));
      return null;
    }
    
    if (!device.enabled) {
      console.warn(chalk.yellow(`⚠ Device ${deviceId} (${device.name}) is disabled, skipping poll`));
      return null;
    }
    
    console.log(chalk.blue(`Starting polling for device ${device.name} (${deviceId})`));

    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;
    
    console.log(chalk.cyan(`Device ${device.name} configuration: New format: ${hasNewConfig ? 'Yes' : 'No'}, Legacy format: ${hasLegacyConfig ? 'Yes' : 'No'}`));

    if (!hasNewConfig && !hasLegacyConfig) {
      console.warn(chalk.yellow(`⚠ No data points or registers configured for device ${deviceId}`));
      return null;
    }

    // Get connection settings (support both new and legacy format)
    const connectionType =
      device.connectionSetting?.connectionType || device.connectionType || 'tcp';
    console.log(chalk.blue(`Device ${device.name} connection type: ${connectionType}`));

    // Get TCP settings
    const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : device.ip || '';

    // Ensure port is a valid number
    let port: number = 502; // Default Modbus TCP port
    if (connectionType === 'tcp') {
      if (device.connectionSetting?.tcp?.port) {
        port = Number(device.connectionSetting.tcp.port);
      } else if (device.port) {
        port = Number(device.port);
      }

      // Validate port is a reasonable number
      if (isNaN(port) || port <= 0 || port > 65535) {
        port = 502; // Use default Modbus port if invalid
        console.warn(chalk.yellow(`⚠ Invalid port for device ${device._id}, using default port 502`));
      }
      console.log(chalk.cyan(`TCP connection settings - IP: ${ip}, Port: ${port}`));
    }

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

    // Initialize Modbus client
    const client = new ModbusRTU();
    const readings: ParameterReading[] = [];

    // Create device connection status object for logging
    const deviceIdentifier = `${device.name} (${device._id})`;
    const connectionInfo =
      connectionType === 'tcp'
        ? `TCP ${ip}:${port}`
        : `RTU ${serialPort} @ ${baudRate || 'default'} baud`;

    try {
      // Validate connection parameters before attempting connection
      if (connectionType === 'tcp') {
        if (!ip) {
          throw new Error('Missing IP address for TCP connection');
        }
        // Ensure port is a valid number
        if (typeof port !== 'number' || isNaN(port) || port <= 0) {
          throw new Error(`Invalid TCP port: ${port}`);
        }
      } else if (connectionType === 'rtu') {
        if (!serialPort) {
          throw new Error('Missing serial port for RTU connection');
        }
      } else {
        throw new Error(`Unknown connection type: ${connectionType}`);
      }

      // Connect based on connection type with timeout handling
      if (connectionType === 'tcp') {
        console.log(chalk.blue(`Attempting to connect to TCP device ${deviceIdentifier} at ${ip}:${port}`));
        // Set a reasonable timeout for TCP connection attempts
        const connectionTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

        // Make sure ip is defined before using it
        if (!ip) {
          throw new Error('IP address is undefined');
        }

        // Port is already validated and converted to a number above

        const res = await Promise.race([client.connectTCP(ip, { port }), connectionTimeout]);
        console.log(chalk.green(`✓ Connected to TCP device ${deviceIdentifier} at ${ip}:${port}`));
      } else if (connectionType === 'rtu') {
        console.log(chalk.blue(`Attempting to connect to RTU device ${deviceIdentifier} at ${serialPort}`));
        const rtuOptions: any = {};
        if (baudRate) rtuOptions.baudRate = baudRate;
        if (dataBits) rtuOptions.dataBits = dataBits;
        if (stopBits) rtuOptions.stopBits = stopBits;
        if (parity) rtuOptions.parity = parity;

        try {
          // Make sure serialPort is defined before using it
          if (!serialPort) {
            throw new Error('Serial port is undefined');
          }

          await client.connectRTUBuffered(serialPort, rtuOptions);
          console.log(chalk.green(`✓ Connected to RTU device ${deviceIdentifier} at ${serialPort}`));
        } catch (rtuError: any) {
          // Specific handling for common RTU errors
          if (rtuError.message && rtuError.message.includes('No such file or directory')) {
            throw new Error(`Serial port ${serialPort} does not exist on this system`);
          }
          // Re-throw other errors
          throw rtuError;
        }
      } else {
        throw new Error('Invalid connection configuration');
      }

      // Verify that the client is connected before proceeding
      if (!isClientConnected(client)) {
        throw new Error('Modbus client is not connected');
      }
      
      // Set slave ID
      if (slaveId !== undefined) {
        console.log(chalk.cyan(`Setting slave ID to ${slaveId} for device ${deviceIdentifier}`));
        client.setID(slaveId);
      } else {
        console.log(chalk.cyan(`No slave ID provided, using default (1) for device ${deviceIdentifier}`));
        client.setID(1); // Default slave ID
      }

      // Process data points (new structure)
      if (hasNewConfig && device.dataPoints) {
        console.log(chalk.blue(`Starting to read data points for device ${deviceIdentifier}`));
        for (const dataPoint of device.dataPoints) {
          try {
            const range = dataPoint.range;
            const parser = dataPoint.parser;
            
            console.log(chalk.cyan(`Reading range FC=${range.fc} from address ${range.startAddress}, count: ${range.count}`));
            // Read registers based on function code
            // Define result with proper typing for modbus-serial response
            let result: ModbusResponse | undefined;
            try {
              switch (range.fc) {
                case 1:
                  result = await client.readCoils(range.startAddress, range.count);
                  break;
                case 2:
                  result = await client.readDiscreteInputs(range.startAddress, range.count);
                  break;
                case 3:
                  console.log(chalk.blue(`Reading holding registers from address ${range.startAddress}, count: ${range.count}`));
                  try {
                    // Add explicit timeout for holding registers
                    const readPromise = client.readHoldingRegisters(range.startAddress, range.count);
                    const timeoutPromise = new Promise<never>((_, reject) => {
                      setTimeout(() => reject(new Error('Holding register read operation timed out after 5000ms')), 5000);
                    });
                    
                    console.log(chalk.cyan(`Waiting for holding register response...`));
                    result = await Promise.race([readPromise, timeoutPromise]);
                    console.log(chalk.green(`Holding register read complete, received data: ${result && result.data && result.data.length > 0 ? 'yes' : 'no'}`));
                  } catch (error: any) {
                    console.error(chalk.red(`Error in holding register read operation: ${error.message || JSON.stringify(error)}`));
                    // Log connection details before re-throwing
                    console.log(chalk.red(`Connection details: TCP ${ip}:${port}, Slave ID: ${slaveId}`));
                    throw error; // Re-throw to be caught by outer try-catch
                  }
                  break;
                case 4:
                  console.log(chalk.blue(`Reading input registers from address ${range.startAddress}, count: ${range.count}`));
                  try {
                    // Add explicit timeout for input registers which can sometimes hang
                    const readPromise = client.readInputRegisters(range.startAddress, range.count);
                    const timeoutPromise = new Promise<never>((_, reject) => {
                      setTimeout(() => reject(new Error('Input register read operation timed out after 5000ms')), 5000);
                    });
                    
                    console.log(chalk.cyan(`Waiting for input register response...`));
                    result = await Promise.race([readPromise, timeoutPromise]);
                    console.log(chalk.green(`Input register read complete, received data: ${result && result.data && result.data.length > 0 ? 'yes' : 'no'}`));
                  } catch (error: any) {
                    console.error(chalk.red(`Error in input register read operation: ${error.message || JSON.stringify(error)}`));
                    // Log connection details before re-throwing
                    console.log(chalk.red(`Connection details: TCP ${ip}:${port}, Slave ID: ${slaveId}`));
                    throw error; // Re-throw to be caught by outer try-catch
                  }
                  break;
                default:
                  console.log(chalk.yellow(`Unknown function code ${range.fc}, defaulting to read holding registers`));
                  result = await client.readHoldingRegisters(range.startAddress, range.count);
              }
              
              // Make sure result is defined before continuing
              if (!result || !result.data) {
                throw new Error(`No data returned from device for FC=${range.fc}, address=${range.startAddress}`);
              }
              
              console.log(chalk.green(`✓ Read successful from address ${range.startAddress}, data length: ${result.data.length}`));
              
              // For FC=3 and FC=4 (Holding/Input Registers), log the actual raw data for debugging
              if (range.fc === 3 || range.fc === 4) {
                try {
                  // Handle both number[] and boolean[] data types
                  const dataValues = result.data.map((val: any) => 
                    typeof val === 'number' ? val.toString(16).padStart(4, '0') : String(val)
                  );
                  console.log(chalk.cyan(`${range.fc === 3 ? 'Holding' : 'Input'} register values (hex): [${dataValues.join(', ')}]`));
                  
                  // Log the raw buffer if available
                  if (result.buffer) {
                    const bufferHex = Array.from(result.buffer).map(b => b.toString(16).padStart(2, '0')).join(' ');
                    console.log(chalk.cyan(`Raw buffer (hex): ${bufferHex}`));
                  }
                } catch (error: any) {
                  console.log(chalk.yellow(`Could not log register values: ${error.message}`));
                }
              }
            } catch (error: any) {
              console.error(chalk.red(`Error reading from device: ${error.message || JSON.stringify(error)}`));
              throw error; // Re-throw to be caught by the outer catch block
            }
            // Process the result based on parser configuration
            if (result && parser && parser.parameters) {
              console.log(chalk.cyan(`Processing ${parser.parameters.length} parameters from range FC=${range.fc}`));
              for (const param of parser.parameters) {
                try {
                  // Get the register index relative to the range start
                  const relativeIndex = param.registerIndex - range.startAddress;

                  if (relativeIndex < 0 || relativeIndex >= range.count) {
                    console.log(chalk.yellow(`⚠ Parameter ${param.name} register index ${param.registerIndex} is out of range, skipping`));
                    continue; // Skip if out of range
                  }

                  // Ensure we have result.data before proceeding
                  if (!result.data) {
                    console.error(chalk.red(`Missing result data for parameter ${param.name}`));
                    continue;
                  }

                  // For FLOAT32 and other multi-register data types
                  let value: any = null;

                  switch (param.dataType) {
                    case 'FLOAT32':
                      if (param.wordCount === 2 && relativeIndex + 1 < range.count) {
                        // Create a buffer for the float
                        const buffer = Buffer.alloc(4);

                        // Handle different byte orders
                        if (param.byteOrder === 'ABCD') {
                          buffer.writeUInt16BE(Number(result.data[relativeIndex]), 0);
                          buffer.writeUInt16BE(Number(result.data[relativeIndex + 1]), 2);
                        } else if (param.byteOrder === 'CDAB') {
                          buffer.writeUInt16BE(Number(result.data[relativeIndex + 1]), 0);
                          buffer.writeUInt16BE(Number(result.data[relativeIndex]), 2);
                        } else if (param.byteOrder === 'BADC') {
                          buffer.writeUInt16BE(
                            Number(swapBytes(Number(result.data[relativeIndex]))),
                            0,
                          );
                          buffer.writeUInt16BE(
                            Number(swapBytes(Number(result.data[relativeIndex + 1]))),
                            2,
                          );
                        } else if (param.byteOrder === 'DCBA') {
                          buffer.writeUInt16BE(
                            Number(swapBytes(Number(result.data[relativeIndex + 1]))),
                            0,
                          );
                          buffer.writeUInt16BE(
                            Number(swapBytes(Number(result.data[relativeIndex]))),
                            2,
                          );
                        }

                        value = buffer.readFloatBE(0);
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
                  if (
                    param.scalingFactor &&
                    param.scalingFactor !== 1 &&
                    typeof value === 'number'
                  ) {
                    value = value * param.scalingFactor;
                  }

                  // Apply scaling equation if defined
                  if (param.scalingEquation) {
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
                  console.error(chalk.red(`❌ Error processing parameter ${param.name}: ${paramError.message}`));
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
              chalk.red(`❌ Error reading range FC=${dataPoint.range.fc} (${rangeStart}-${rangeEnd}): ${rangeError.message}`),
            );
            // Continue to next range - don't process data or parameters if the modbus read operation failed
            continue;
          }
        }
      }
      // Process legacy structure
      else if (hasLegacyConfig && device.registers) {
        for (const register of device.registers) {
          try {
            const result: ModbusResponse = await client.readHoldingRegisters(register.address, register.length);

            // Make sure result is defined before continuing
            if (!result || !result.data || result.data.length === 0) {
              throw new Error(`No data returned from device for register ${register.address}`);
            }

            // Process the result based on register configuration
            // For register results, data will be a number[]
            let value = (result.data as number[])[0];

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

      // Prepare the result
      const deviceReading: DeviceReading = {
        deviceId: device._id,
        deviceName: device.name,
        timestamp: new Date(),
        readings,
      };

      // Store in real-time cache
      realtimeDataCache.set(deviceId, deviceReading);
      console.log(chalk.blue(`Updated real-time cache for device ${deviceIdentifier}`));

      // Store in history database
      console.log(chalk.blue(`Storing historical data for device ${deviceIdentifier}`));
      await storeHistoricalData(deviceReading);
      console.log(chalk.green(`✓ Successfully polled device ${deviceIdentifier} with ${readings.length} readings`));
      
      // If no readings were captured but polling completed successfully, log additional debug info
      if (readings.length === 0) {
        console.log(chalk.yellow(`⚠ No readings were captured for device ${deviceIdentifier} despite successful polling`));
        console.log(chalk.yellow(`Debug information for last data point reading:`));
        
        // Try to extract and log raw buffer information from the last successful read
        try {
          // Check if we have any data points with raw buffer data
          const lastDataPoint = device.dataPoints ? device.dataPoints[device.dataPoints.length - 1] : null;
          if (lastDataPoint) {
            console.log(chalk.yellow(`Last range read: FC=${lastDataPoint.range.fc}, Start Address=${lastDataPoint.range.startAddress}, Count=${lastDataPoint.range.count}`));
          }
          
          console.log(chalk.yellow(`This could indicate a parsing issue or a configuration mismatch between the device and parameters`));
        } catch (error: any) {
          console.log(chalk.yellow(`Could not log additional debug info: ${error.message}`));
        }
      }

      return deviceReading;
    } finally {
      // Close the connection if open
      try {
        if (isClientConnected(client)) {
          await client.close();
          console.log(chalk.cyan(`✓ Closed connection to device ${deviceIdentifier}`));
        }
      } catch (closeError) {
        console.warn(chalk.yellow(`⚠ Error closing connection to device ${deviceIdentifier}:`), closeError);
      }
    }
  } catch (error: any) {
    // Better error logging with device identifier if available
    let deviceName = deviceId;
    try {
      const clientModels = getClientModels();
      if (clientModels && clientModels.Device) {
        const Device = clientModels.Device;
        const findPromise = Device.findById(deviceId).select('name').lean().exec();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Name lookup timed out')), 2000);
        });

        const device = await Promise.race([findPromise, timeoutPromise]);
        if (device && device.name) {
          deviceName = device.name;
        }
      }
    } catch (error) {
      // Just use the ID if we can't get the name
      const nameError = error as Error;
      console.warn(
        chalk.yellow(`Could not get name for device ${deviceId}:`),
        nameError.message || 'Unknown error',
      );
    }

    // Format error message
    let errorMsg = `Error polling device ${deviceName} (${deviceId}): `;

    // Check for specific error types for better diagnostics
    if (error.code === 'ECONNREFUSED') {
      errorMsg += `Connection refused at ${error.address}:${error.port}. Device may be offline or unreachable.`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMsg += 'Connection timeout. Device is not responding.';
    } else if (error.message.includes('No such file or directory')) {
      errorMsg += `Serial port does not exist on this system. Check device configuration.`;
    } else if (error.message.includes('Access denied')) {
      errorMsg += `Permission denied for serial port. Check user permissions.`;
    } else {
      errorMsg += error.message || 'Unknown error';
    }

    console.error(chalk.red(errorMsg));

    // Create a minimal reading with error information
    try {
      // Create error reading with just the device ID since we already have the device name
      const errorReading: DeviceReading = {
        deviceId: new mongoose.Types.ObjectId(deviceId),
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
 * Checks if a Modbus client is properly connected and ready for communication
 * @param client ModbusRTU client to check
 * @returns True if connected, false otherwise
 */
function isClientConnected(client: ModbusRTU): boolean {
  // Check if client exists and has an isOpen property that is true
  return !!(client && typeof client.isOpen === 'boolean' && client.isOpen);
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
 * Store device reading in historical database
 * @param deviceReading The device reading to store
 */
async function storeHistoricalData(deviceReading: DeviceReading): Promise<void> {
  try {
    // Get the HistoricalData model from client connection
    console.log(chalk.blue(`Preparing to store historical data for device ${deviceReading.deviceName}`));
    
    const clientModels = getClientModels();
    if (!clientModels || !clientModels.HistoricalData) {
      console.warn(
        chalk.yellow(`⚠ HistoricalData model not available in client models, skipping historical data storage`),
      );
      return; // Skip historical data storage instead of throwing an error
    }
    const HistoricalData = clientModels.HistoricalData;

    // Filter out readings with errors or null values
    const validReadings = deviceReading.readings.filter(
      reading => reading.value !== null && reading.value !== undefined && !reading.error,
    );
    
    console.log(chalk.cyan(`Found ${validReadings.length}/${deviceReading.readings.length} valid readings to store for device ${deviceReading.deviceName}`));

    // Create history data entries for valid readings only
    const historyEntries = validReadings.map(reading => ({
      deviceId: deviceReading.deviceId,
      parameterName: reading.name,
      value: reading.value,
      unit: reading.unit,
      timestamp: deviceReading.timestamp,
      quality: 'good', // These are all valid readings since we filtered out errors
    }));

    // Insert historical data in batches to avoid large operations
    if (historyEntries.length > 0) {
      try {
        // Check if the model and its connection is available
        if (!HistoricalData || !HistoricalData.db || HistoricalData.db.readyState !== 1) {
          console.warn(
            chalk.yellow(`⚠ HistoricalData model connection not ready (readyState: ${HistoricalData?.db?.readyState || 'unknown'}). Skipping historical data storage.`),
          );
          return;
        }
        
        console.log(chalk.blue(`Inserting ${historyEntries.length} historical data entries for device ${deviceReading.deviceName}`));

        // Set a timeout for database operations
        const dbTimeout = 5000; // 5 seconds
        const insertPromise = HistoricalData.insertMany(historyEntries);

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database operation timed out')), dbTimeout);
        });

        // Race the promises
        await Promise.race([insertPromise, timeoutPromise]);
        console.log(chalk.green(`✓ Successfully stored ${historyEntries.length} historical data points for device ${deviceReading.deviceName}`));
      } catch (dbError: any) {
        // Handle specific MongoDB errors
        if (dbError.name === 'MongoNetworkError') {
          console.error(chalk.red(`❌ MongoDB network error while storing historical data: ${dbError.message}`));
        } else if (dbError.message.includes('timed out')) {
          console.error(chalk.red(`❌ Database operation timed out while storing historical data`));
        } else {
          console.error(chalk.red(`❌ Database error while storing historical data: ${dbError.message}`));
          throw dbError; // Re-throw for general error handling
        }
      }
    }
  } catch (error: any) {
    // Log error with device info for better diagnostics
    console.error(
      chalk.red(`❌ Error storing historical data for device ${deviceReading.deviceName} (${deviceReading.deviceId}): ${error.message || error}`),
    );

    // Log additional error details if available
    if (error.stack) {
      console.debug(chalk.gray('Error stack trace:'), error.stack);
    }
  }
}

/**
 * Start polling for a device at a specific interval
 * @param deviceId The ID of the device to poll
 * @param intervalMs The polling interval in milliseconds
 * @returns The interval ID
 */
export function startPollingDevice(deviceId: string, intervalMs: number = 10000): NodeJS.Timeout {
  console.log(chalk.magenta(`🔄 Starting polling service for device ${deviceId} at ${intervalMs}ms intervals`));

  // Track consecutive failures for adaptive behavior
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;
  let currentInterval = intervalMs;
  let intervalId: NodeJS.Timeout;

  // Function to handle a successful poll
  const handleSuccessfulPoll = () => {
    // Reset failure counter on success
    if (consecutiveFailures > 0) {
      console.log(
        chalk.green(
          `✓ Device ${deviceId} recovered after ${consecutiveFailures} consecutive failures`,
        ),
      );
      consecutiveFailures = 0;

      // If we had adjusted the interval due to failures, restore it
      if (currentInterval !== intervalMs) {
        currentInterval = intervalMs;
        clearInterval(intervalId);
        intervalId = setInterval(doPoll, currentInterval);
        console.log(
          chalk.green(`✓ Restored normal polling interval of ${intervalMs}ms for device ${deviceId}`),
        );
      }
    }
  };

  // Function to handle a failed poll
  const handleFailedPoll = (err: any) => {
    consecutiveFailures++;
    console.error(
      chalk.red(
        `❌ Error polling device ${deviceId} (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${err.message || err}`,
      )
    );

    // Implement adaptive polling - if device fails repeatedly, back off
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      // Double the interval after max consecutive failures (up to 5 minutes max)
      const newInterval = Math.min(currentInterval * 2, 300000);

      if (newInterval !== currentInterval) {
        console.warn(
          chalk.yellow(
            `⚠ Device ${deviceId} has failed ${consecutiveFailures} times. Adjusting polling interval from ${currentInterval}ms to ${newInterval}ms`,
          ),
        );
        currentInterval = newInterval;
        clearInterval(intervalId);
        intervalId = setInterval(doPoll, currentInterval);
      }
    }
  };

  // The polling function
  const doPoll = async () => {
    console.log(chalk.blue(`📊 Running polling cycle for device ${deviceId}`));
    try {
      const result = await pollDevice(deviceId);
      if (result) {
        handleSuccessfulPoll();
      } else {
        // A null result indicates a soft error (already logged in pollDevice)
        // Still count as a failure for adaptive polling purposes
        handleFailedPoll(new Error('Device polling returned null result'));
      }
    } catch (err) {
      handleFailedPoll(err);
    }
  };

  // Poll once immediately
  console.log(chalk.blue(`🚀 Initiating first poll for device ${deviceId}`));
  doPoll();

  // Set up regular polling
  console.log(chalk.cyan(`⏱ Setting up regular polling interval of ${intervalMs}ms for device ${deviceId}`));
  intervalId = setInterval(doPoll, intervalMs);
  return intervalId;
}

// Store polling intervals by device ID
const pollingIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Stop polling for a device
 * @param deviceId The ID of the device to stop polling
 */
export function stopPollingDevice(deviceId: string): void {
  const interval = pollingIntervals.get(deviceId);
  if (interval) {
    clearInterval(interval);
    pollingIntervals.delete(deviceId);
    console.log(chalk.yellow(`⏹ Stopped polling service for device ${deviceId}`));
  } else {
    console.log(chalk.yellow(`⚠ No active polling service found for device ${deviceId}`));
  }
}

/**
 * Start or restart polling for a device
 * @param deviceId The ID of the device
 * @param intervalMs The polling interval in milliseconds
 */
export function setDevicePolling(deviceId: string, intervalMs: number = 10000): void {
  console.log(chalk.blue(`Configuring polling for device ${deviceId} with interval ${intervalMs}ms`));
  
  // Stop existing polling if any
  stopPollingDevice(deviceId);

  // Start new polling
  const intervalId = startPollingDevice(deviceId, intervalMs);
  pollingIntervals.set(deviceId, intervalId);
  
  console.log(chalk.green(`✓ Device ${deviceId} polling service configured successfully`));
}