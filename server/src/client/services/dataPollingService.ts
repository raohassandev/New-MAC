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
} from '../controllers/modbusHelper';

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
  let client = null;

  try {
    console.log(chalk.blue(`Starting poll for device ${deviceId}`));

    // Get the Device model from client connection
    const clientModels = getClientModels();
    if (!clientModels || !clientModels.Device) {
      throw new Error('Client Device model not available');
    }
    const Device = clientModels.Device;

    // Find the device
    console.log(chalk.cyan(`Looking up device ${deviceId} in database...`));
    const device = await Device.findById(deviceId).exec();

    if (!device) {
      console.warn(chalk.yellow(`⚠ Device ${deviceId} not found in database`));
      return null;
    }

    if (!device.enabled) {
      console.warn(
        chalk.yellow(`⚠ Device ${deviceId} (${device.name}) is disabled, skipping poll`),
      );
      return null;
    }

    console.log(chalk.blue(`Starting polling for device ${device.name} (${deviceId})`));

    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;

    if (!hasNewConfig && !hasLegacyConfig) {
      console.warn(
        chalk.yellow(`⚠ No data points or registers configured for device ${deviceId}`),
      );
      return null;
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

    // Set default timeout
    const connectionTimeout = 5000; // 5 seconds
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
      await client.connectTCP(ip, { port });
      console.log(chalk.green(`✓ Connected to TCP device ${device.name} at ${ip}:${port}`));

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
                console.log('-----reading Holding registers');
                const holdingResult = await readHoldingRegistersWithTimeout(
                  client,
                  range.startAddress,
                  range.count,
                  5000, // 5 second timeout
                );
                console.log('-------Result ', holdingResult);
                result = holdingResult;
              } catch (readError: any) {
                console.error(chalk.red(`Error reading holding registers: ${readError.message}`));
                throw readError;
              }
              break;
            case 4:
              // Read input registers with simplified approach
              console.log(
                chalk.blue(
                  `Reading input registers from address ${range.startAddress}, count: ${range.count}`,
                ),
              );
              try {
                const inputResult = await readInputRegistersWithTimeout(
                  client,
                  range.startAddress,
                  range.count,
                  5000, // 5 second timeout
                );
                result = inputResult;
              } catch (readError: any) {
                console.error(chalk.red(`Error reading input registers: ${readError.message}`));
                throw readError;
              }
              break;
            default:
              console.log(
                chalk.yellow(
                  `Unknown function code ${range.fc}, defaulting to read holding registers`,
                ),
              );
              // result = await client.readHoldingRegisters(range.startAddress, range.count);
              await client.connectRTUBuffered(range.startAddress, range.count);
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
                // Get the register index relative to the range start
                const relativeIndex = param.registerIndex - range.startAddress;

                if (relativeIndex < 0 || relativeIndex >= range.count) {
                  console.log(
                    chalk.yellow(
                      `⚠ Parameter ${param.name} register index ${param.registerIndex} is out of range, skipping`,
                    ),
                  );
                  continue; // Skip if out of range
                }

                // Extract and process the value
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
          // Continue to next range - don't process data or parameters if the modbus read operation failed
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
    console.log(chalk.blue(`Updated real-time cache for device ${device.name}`));

    // Store in history database
    await storeHistoricalData(deviceReading);
    console.log(
      chalk.green(`✓ Successfully polled device ${device.name} with ${readings.length} readings`),
    );

    return deviceReading;
  } catch (error: any) {
    // Create a more user-friendly error message
    const errorMsg = `Error polling device ${deviceId}: ${error.message || 'Unknown error'}`;
    console.error(chalk.red(errorMsg));

    try {
      // Get device name for better error reporting
      const clientModels = getClientModels();
      let deviceName = deviceId;

      if (clientModels && clientModels.Device) {
        const device = await clientModels.Device.findById(deviceId).select('name').lean().exec();
        if (device && device.name) {
          deviceName = device.name;
        }
      }

      // Create error reading for the device
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
  } finally {
    // Always close the connection if open
    if (client) {
      try {
        await safeCloseModbusClient(client);
        console.log(chalk.cyan(`✓ Closed Modbus connection`));
      } catch (closeError) {
        console.warn(chalk.yellow(`⚠ Error closing Modbus connection:`), closeError);
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
 * Store device reading in historical database
 * @param deviceReading The device reading to store
 */
async function storeHistoricalData(deviceReading: DeviceReading): Promise<void> {
  try {
    // Get the HistoricalData model from client connection
    console.log(
      chalk.blue(`Preparing to store historical data for device ${deviceReading.deviceName}`),
    );

    const clientModels = getClientModels();
    if (!clientModels || !clientModels.HistoricalData) {
      console.warn(
        chalk.yellow(`⚠ HistoricalData model not available, skipping historical data storage`),
      );
      return; // Skip historical data storage instead of throwing an error
    }
    const HistoricalData = clientModels.HistoricalData;

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
      await HistoricalData.insertMany(historyEntries);
      console.log(
        chalk.green(`✓ Successfully stored ${historyEntries.length} historical data points`),
      );
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Error storing historical data: ${error.message || error}`));
  }
}

/**
 * Start polling for a device at a specific interval
 * @param deviceId The ID of the device to poll
 * @param intervalMs The polling interval in milliseconds
 * @returns The interval ID
 */
export function startPollingDevice(deviceId: string, intervalMs = 10000): NodeJS.Timeout {
  console.log(
    chalk.magenta(
      `🔄 Starting polling service for device ${deviceId} at ${intervalMs}ms intervals`,
    ),
  );

  // The polling function
  const doPoll = async () => {
    console.log(chalk.blue(`📊 Running polling cycle for device ${deviceId}`));
    try {
      await pollDevice(deviceId);
    } catch (err: any) {
      console.error(chalk.red(`❌ Error polling device ${deviceId}: ${err.message || err}`));
    }
  };

  // Poll once immediately
  doPoll();

  // Set up regular polling
  const intervalId = setInterval(doPoll, intervalMs);
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
export function setDevicePolling(deviceId: string, intervalMs = 10000): void {
  console.log(
    chalk.blue(`Configuring polling for device ${deviceId} with interval ${intervalMs}ms`),
  );

  // Stop existing polling if any
  stopPollingDevice(deviceId);

  // Start new polling
  const intervalId = startPollingDevice(deviceId, intervalMs);
  pollingIntervals.set(deviceId, intervalId);

  console.log(chalk.green(`✓ Device ${deviceId} polling service configured successfully`));
}
