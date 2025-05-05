import ModbusRTU from 'modbus-serial';
import mongoose from 'mongoose';
import { Device } from '../models';

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
    const device = await Device.findById(deviceId);

    if (!device || !device.enabled) {
      console.warn(`Device ${deviceId} not found or disabled`);
      return null;
    }

    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;
    
    if (!hasNewConfig && !hasLegacyConfig) {
      console.warn(`No data points or registers configured for device ${deviceId}`);
      return null;
    }

    // Get connection settings (support both new and legacy format)
    const connectionType = device.connectionSetting?.connectionType || device.connectionType || 'tcp';
    
    // Get TCP settings
    const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : (device.ip || '');
    
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
        console.warn(`Invalid port for device ${device._id}, using default port 502`);
      }
    }
    
    const tcpSlaveId = connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;
    
    // Get RTU settings  
    const serialPort = connectionType === 'rtu' ? device.connectionSetting?.rtu?.serialPort : (device.serialPort || '');
    const baudRate = connectionType === 'rtu' ? device.connectionSetting?.rtu?.baudRate : (device.baudRate || 0);
    const dataBits = connectionType === 'rtu' ? device.connectionSetting?.rtu?.dataBits : (device.dataBits || 0);
    const stopBits = connectionType === 'rtu' ? device.connectionSetting?.rtu?.stopBits : (device.stopBits || 0);
    const parity = connectionType === 'rtu' ? device.connectionSetting?.rtu?.parity : (device.parity || '');
    const rtuSlaveId = connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;
    
    // Combined slaveId (prefer the one from the matching connection type)
    const slaveId = connectionType === 'tcp' ? tcpSlaveId : (rtuSlaveId || device.slaveId || 1);

    // Initialize Modbus client
    const client = new ModbusRTU();
    const readings: ParameterReading[] = [];

    // Create device connection status object for logging
    const deviceIdentifier = `${device.name} (${device._id})`;
    const connectionInfo = connectionType === 'tcp' 
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
        // Set a reasonable timeout for TCP connection attempts
        const connectionTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
        
        // Make sure ip is defined before using it
        if (!ip) {
          throw new Error('IP address is undefined');
        }
        
        // Port is already validated and converted to a number above
        
        await Promise.race([
          client.connectTCP(ip, { port }),
          connectionTimeout
        ]);
        console.log(`Connected to TCP device at ${ip}:${port}`);
      } else if (connectionType === 'rtu') {
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
          console.log(`Connected to RTU device at ${serialPort}`);
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
      
      if (slaveId !== undefined) {
        client.setID(slaveId);
      } else {
        client.setID(1); // Default slave ID
      }

      // Process data points (new structure)
      if (hasNewConfig && device.dataPoints) {
        for (const dataPoint of device.dataPoints) {
          try {
            const range = dataPoint.range;
            const parser = dataPoint.parser;
            
            // Read registers based on function code
            let result;
            switch (range.fc) {
              case 1:
                result = await client.readCoils(range.startAddress, range.count);
                break;
              case 2:
                result = await client.readDiscreteInputs(range.startAddress, range.count);
                break;
              case 3:
                result = await client.readHoldingRegisters(range.startAddress, range.count);
                break;
              case 4:
                result = await client.readInputRegisters(range.startAddress, range.count);
                break;
              default:
                result = await client.readHoldingRegisters(range.startAddress, range.count);
            }

            // Process the result based on parser configuration
            if (parser && parser.parameters) {
              for (const param of parser.parameters) {
                try {
                  // Get the register index relative to the range start
                  const relativeIndex = param.registerIndex - range.startAddress;
                  
                  if (relativeIndex < 0 || relativeIndex >= range.count) {
                    continue; // Skip if out of range
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
                          buffer.writeUInt16BE(Number(swapBytes(Number(result.data[relativeIndex]))), 0);
                          buffer.writeUInt16BE(Number(swapBytes(Number(result.data[relativeIndex + 1]))), 2);
                        } else if (param.byteOrder === 'DCBA') {
                          buffer.writeUInt16BE(Number(swapBytes(Number(result.data[relativeIndex + 1]))), 0);
                          buffer.writeUInt16BE(Number(swapBytes(Number(result.data[relativeIndex]))), 2);
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

                  readings.push({
                    name: param.name,
                    registerIndex: param.registerIndex,
                    value: value,
                    unit: param.unit || '',
                    dataType: param.dataType,
                  });
                } catch (paramError: any) {
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
            console.error(`Error reading range (${dataPoint.range.startAddress}-${dataPoint.range.startAddress + dataPoint.range.count - 1}):`, rangeError);
            // Continue to next range even if this one fails
          }
        }
      }
      // Process legacy structure
      else if (hasLegacyConfig && device.registers) {
        for (const register of device.registers) {
          try {
            const result = await client.readHoldingRegisters(
              register.address,
              register.length
            );

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

      // Store in history database
      await storeHistoricalData(deviceReading);

      return deviceReading;
    } finally {
      // Close the connection if open
      try {
        if (isClientConnected(client)) {
          await client.close();
          console.debug(`Closed connection to device ${deviceId}`);
        }
      } catch (closeError) {
        console.warn(`Error closing connection to device ${deviceId}:`, closeError);
      }
    }
  } catch (error: any) {
    // Better error logging with device identifier if available
    const device = await Device.findById(deviceId).select('name').lean().exec();
    const deviceName = device ? device.name : deviceId;
    
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
    
    console.error(errorMsg);
    
    // Create a minimal reading with error information
    try {
      if (device) {
        const errorReading: DeviceReading = {
          deviceId: new mongoose.Types.ObjectId(deviceId),
          deviceName: deviceName,
          timestamp: new Date(),
          readings: [{
            name: 'connection_status',
            value: 'error',
            error: errorMsg
          }]
        };
        
        // Update cache with error status
        realtimeDataCache.set(deviceId, errorReading);
      }
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
  return ((value & 0xFF) << 8) | ((value >> 8) & 0xFF);
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
    // Import the history model to avoid circular dependencies
    const HistoricalData = mongoose.model('HistoricalData');
    
    // Filter out readings with errors or null values
    const validReadings = deviceReading.readings.filter(reading => 
      reading.value !== null && 
      reading.value !== undefined && 
      !reading.error
    );
    
    // Create history data entries for valid readings only
    const historyEntries = validReadings.map(reading => ({
      deviceId: deviceReading.deviceId,
      parameterName: reading.name,
      value: reading.value,
      unit: reading.unit,
      timestamp: deviceReading.timestamp,
      quality: 'good' // These are all valid readings since we filtered out errors
    }));
    
    // Insert historical data in batches to avoid large operations
    if (historyEntries.length > 0) {
      try {
        // Check MongoDB connection first
        if (mongoose.connection.readyState !== 1) {
          console.warn(`MongoDB connection not ready (state: ${mongoose.connection.readyState}). Skipping historical data storage.`);
          return;
        }
        
        // Set a timeout for database operations
        const dbTimeout = 5000; // 5 seconds
        const insertPromise = HistoricalData.insertMany(historyEntries);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database operation timed out')), dbTimeout);
        });
        
        // Race the promises
        await Promise.race([insertPromise, timeoutPromise]);
      } catch (dbError: any) {
        // Handle specific MongoDB errors
        if (dbError.name === 'MongoNetworkError') {
          console.error(`MongoDB network error while storing historical data: ${dbError.message}`);
        } else if (dbError.message.includes('timed out')) {
          console.error(`Database operation timed out while storing historical data`);
        } else {
          throw dbError; // Re-throw for general error handling
        }
      }
    }
  } catch (error: any) {
    // Log error with device info for better diagnostics
    console.error(`Error storing historical data for device ${deviceReading.deviceName} (${deviceReading.deviceId}):`, 
      error.message || error);
    
    // Log additional error details if available
    if (error.stack) {
      console.debug('Error stack trace:', error.stack);
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
  console.log(`Starting polling for device ${deviceId} at ${intervalMs}ms intervals`);
  
  // Track consecutive failures for adaptive behavior
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;
  let currentInterval = intervalMs;
  let intervalId: NodeJS.Timeout;
  
  // Function to handle a successful poll
  const handleSuccessfulPoll = () => {
    // Reset failure counter on success
    if (consecutiveFailures > 0) {
      console.log(`Device ${deviceId} recovered after ${consecutiveFailures} consecutive failures`);
      consecutiveFailures = 0;
      
      // If we had adjusted the interval due to failures, restore it
      if (currentInterval !== intervalMs) {
        currentInterval = intervalMs;
        clearInterval(intervalId);
        intervalId = setInterval(doPoll, currentInterval);
        console.log(`Restored normal polling interval of ${intervalMs}ms for device ${deviceId}`);
      }
    }
  };
  
  // Function to handle a failed poll
  const handleFailedPoll = (err: any) => {
    consecutiveFailures++;
    console.error(`Error polling device ${deviceId} (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, err.message || err);
    
    // Implement adaptive polling - if device fails repeatedly, back off
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      // Double the interval after max consecutive failures (up to 5 minutes max)
      const newInterval = Math.min(currentInterval * 2, 300000);
      
      if (newInterval !== currentInterval) {
        console.warn(`Device ${deviceId} has failed ${consecutiveFailures} times. Adjusting polling interval from ${currentInterval}ms to ${newInterval}ms`);
        currentInterval = newInterval;
        clearInterval(intervalId);
        intervalId = setInterval(doPoll, currentInterval);
      }
    }
  };
  
  // The polling function
  const doPoll = async () => {
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
  doPoll();
  
  // Set up regular polling
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
    console.log(`Stopped polling for device ${deviceId}`);
  }
}

/**
 * Start or restart polling for a device
 * @param deviceId The ID of the device
 * @param intervalMs The polling interval in milliseconds
 */
export function setDevicePolling(deviceId: string, intervalMs: number = 10000): void {
  // Stop existing polling if any
  stopPollingDevice(deviceId);
  
  // Start new polling
  const intervalId = startPollingDevice(deviceId, intervalMs);
  pollingIntervals.set(deviceId, intervalId);
}