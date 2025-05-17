/**
 * Helper functions for Modbus communication
 */

import ModbusRTU from 'modbus-serial';
import chalk from 'chalk';

// Import the specific types from modbus-serial
import { ReadCoilResult, ReadRegisterResult } from 'modbus-serial/ModbusRTU';

// Define Modbus response types
type ModbusResponse = ReadRegisterResult | ReadCoilResult;

// Keep track of active connections
const activeConnections = new Map<string, boolean>();

/**
 * Creates a new Modbus RTU client with error handling
 * @returns A new ModbusRTU instance with error handler
 */
export const createModbusClient = (): ModbusRTU => {
  const client = new ModbusRTU();

  // Add error handler to catch unhandled errors
  client.on('error', (err: Error | unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    // Suppress TCP timeout errors and socket errors since we handle them separately
    if (!errorMessage.includes('TCP Connection Timed Out') && 
        !errorMessage.includes('ETIMEDOUT') &&
        !errorMessage.includes('ECONNRESET')) {
      console.error(chalk.red(`💥 Unhandled client error: ${errorMessage}`));
    }
  });

  return client;
};

/**
 * Connect a Modbus client to an RTU port with buffering
 * @param client The ModbusRTU client
 * @param port Serial port path (e.g. '/dev/ttyUSB0')
 * @param options Connection options
 * @returns The client instance for chaining
 */
export const connectRTUBuffered = async (
  client: ModbusRTU,
  port: string,
  options: {
    baudRate?: number;
    parity?: 'none' | 'even' | 'odd';
    dataBits?: 5 | 6 | 7 | 8;
    stopBits?: 1 | 2;
    timeout?: number;
    unitId?: number;
  } = {},
): Promise<ModbusRTU> => {
  // Check if port is already in use
  if (activeConnections.get(port)) {
    console.warn(
      chalk.yellow(
        `⚠️ Port ${port} appears to be in use, attempting to close any existing connections`,
      ),
    );

    try {
      // Try to forcefully close any leftover connections
      const serialPortModule = await import('serialport');
      const ports = await serialPortModule.SerialPort.list();
      const portInfo = ports.find((p: { path: string }) => p.path === port);

      if (portInfo) {
        console.log(chalk.cyan(`Found port ${port} in system device list`));
      } else {
        console.warn(
          chalk.yellow(`Port ${port} not found in system device list, it may not exist`),
        );
      }
    } catch (listError) {
      console.warn(chalk.yellow(`Failed to list serial ports: ${listError}`));
    }

    // Set port as available and continue
    activeConnections.set(port, false);
  }

  // Mark port as in use
  activeConnections.set(port, true);

  console.warn(
    chalk.yellow(
      `🔌 Trying: Port=${port}, Baud=${options.baudRate || 9600}, Parity=${options.parity || 'none'}`,
    ),
  );

  // Set a connection timeout
  const connectionTimeout = options.timeout || 3000; // Default 3 second timeout if not specified
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Connection timeout after ${connectionTimeout}ms`)),
      connectionTimeout,
    );
  });

  try {
    // Create connection promise
    const connectionPromise = client.connectRTUBuffered(port, {
      baudRate: options.baudRate || 9600,
      parity: options.parity || 'none',
      dataBits: options.dataBits || 8,
      stopBits: options.stopBits || 1,
    });

    // Race connection against timeout
    await Promise.race([connectionPromise, timeoutPromise]);

    // Set timeout if provided
    if (options.timeout !== undefined) {
      client.setTimeout(options.timeout);
    } else {
      // Default timeout of 1000ms (1 second)
      client.setTimeout(1000);
    }

    // Set unit ID if provided
    if (options.unitId !== undefined) {
      client.setID(options.unitId);
    }

    console.log(
      chalk.green(
        `✅ Connected on Port=${port}, Baud=${options.baudRate || 9600}, Parity=${options.parity || 'none'}`,
      ),
    );

    // Ensure the port is actually open
    try {
      const modbusClient = client as unknown as ModbusRTUInternal;
      if (modbusClient._port && !modbusClient._port.isOpen) {
        throw new Error('Port reports it is not open after successful connection');
      }
    } catch (portCheckError) {
      console.warn(chalk.yellow(`⚠️ Port check failed: ${portCheckError}`));
    }

    // Add a close handler to clean up port usage tracking
    const originalClose = client.close;
    client.close = async function () {
      try {
        await originalClose.call(client);
      } catch (closeError) {
        console.warn(chalk.yellow(`⚠️ Error in original close: ${closeError}`));

        // Try force close if normal close fails
        try {
          const modbusClient = this as unknown as ModbusRTUInternal;
          if (modbusClient._port?.isOpen) {
            modbusClient._port.close();
            console.warn(chalk.yellow(`⚠️ Force closed port ${port}`));
          }
        } catch (forceCloseError) {
          const errorMessage =
            forceCloseError instanceof Error ? forceCloseError.message : String(forceCloseError);
          console.error(chalk.red(`💥 Failed to force close port: ${errorMessage}`));
        }
      } finally {
        // Always release the port
        activeConnections.set(port, false);
        console.log(chalk.cyan(`🔓 Released port ${port}`));
      }
    };

    return client;
  } catch (error) {
    // Release the port if connection fails
    activeConnections.set(port, false);
    console.error(
      chalk.red(`❌ Connection failed → ${error instanceof Error ? error.message : String(error)}`),
    );

    if (error instanceof Error && error.message.includes('Resource temporarily unavailable')) {
      console.warn(
        chalk.yellow('🔄 Port appears to be locked by another process. This might be due to:'),
      );
      console.warn(chalk.yellow('   1. Another application using the port'));
      console.warn(chalk.yellow('   2. A previous connection that was not properly closed'));
      console.warn(chalk.yellow('   3. Insufficient permissions to access the port'));

      // Try to provide more details from the system
      try {
        const childProcess = await import('child_process');
        const output = childProcess.execSync(`lsof | grep ${port}`).toString();
        console.warn(chalk.yellow(`Port usage: ${output}`));
      } catch (execError) {
        // lsof might not be available or there were no results
      }
    }

    throw error;
  }
};

/**
 * Create and connect a Modbus RTU client with proper error handling and resource management
 * This is a legacy function for backward compatibility
 * @param port Serial port path (e.g. '/dev/ttyUSB0')
 * @param options Connection options
 * @returns Connected client
 */
export const createModbusRTUClient = async (
  port: string,
  options: {
    baudRate?: number;
    parity?: 'none' | 'even' | 'odd';
    dataBits?: 5 | 6 | 7 | 8;
    stopBits?: 1 | 2;
    timeout?: number;
    unitId?: number;
  } = {},
): Promise<ModbusRTU> => {
  const client = createModbusClient();
  return await connectRTUBuffered(client, port, options);
};

/**
 * Find the first Modbus device that responds on a given port
 * @param client The ModbusRTU client
 * @param port Serial port
 * @param slaveIdRange Range of slave IDs to try
 * @param options Connection options
 * @returns The first responding slave ID or null if none respond
 */
export const findRespondingDevice = async (
  client: ModbusRTU,
  slaveIdRange: number[] | string,
  register = 0,
  count = 1,
): Promise<number | null> => {
  // Parse slave ID ranges if provided as string
  const slaveIds = typeof slaveIdRange === 'string' ? expandRanges([slaveIdRange]) : slaveIdRange;

  for (const id of slaveIds) {
    client.setID(id);
    try {
      // Try to read a register to check if device responds
      await client.readHoldingRegisters(register, count);
      console.log(chalk.green(`🟢 Device responded with Slave ID=${id}`));
      return id;
    } catch (err) {
      console.log(chalk.yellow(`🔴 No response from Slave ID=${id}`));
    }
  }

  return null;
};

/**
 * Interface for internal ModbusRTU client properties
 */
interface ModbusRTUInternal {
  _port?: {
    isOpen: boolean;
    close: () => void;
    path?: string;
  };
}

/**
 * Safely close a Modbus client connection
 * @param client The Modbus client to close
 */
export const safeCloseModbusClient = async (client: ModbusRTU | null): Promise<void> => {
  if (!client) return;

  // Get port path for tracking if available
  let portPath: string | undefined;
  try {
    // Type-safe access to internal properties
    const modbusClient = client as unknown as ModbusRTUInternal;
    portPath = modbusClient._port?.path;
  } catch (e) {
    // Ignore errors here
  }

  try {
    // Check if client has isOpen property and it's true
    const isOpenProperty = typeof client.isOpen === 'boolean' && client.isOpen;

    // For RTU connections, also check the internal port object
    let isPortOpen = false;
    try {
      // Type-safe access to internal properties
      const modbusClient = client as unknown as ModbusRTUInternal;
      if (modbusClient._port) {
        isPortOpen = modbusClient._port.isOpen;
      }
    } catch (portError) {
      console.warn(chalk.yellow('⚠️ Could not check port status:', portError));
    }

    // If either the client or port is open, try to close it
    if (isOpenProperty || isPortOpen) {
      // Wrap close in a promise with timeout
      const closePromise = new Promise<void>((resolve) => {
        // Always resolve after a timeout to prevent hanging
        const timeout = setTimeout(() => {
          resolve();
        }, 3000); // 3 second timeout
        
        try {
          client.close(() => {
            clearTimeout(timeout);
            resolve();
          });
        } catch (err) {
          clearTimeout(timeout);
          resolve(); // Resolve anyway on error
        }
      });
      
      await closePromise;
      console.log(chalk.cyan('✅ Successfully closed Modbus connection'));

      // Release port from tracking if we have a path
      if (portPath) {
        activeConnections.set(portPath, false);
        console.log(chalk.cyan(`🔓 Released port ${portPath} after successful close`));
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(chalk.yellow(`⚠️ Error closing Modbus connection: ${errorMessage}`));

    // Try to forcefully close the port if normal close fails
    try {
      const modbusClient = client as unknown as ModbusRTUInternal;
      if (modbusClient._port?.isOpen) {
        modbusClient._port.close();
        console.warn(chalk.yellow('⚠️ Forcefully closed port after close failure'));

        // Release port from tracking if we have a path
        if (portPath) {
          activeConnections.set(portPath, false);
          console.log(chalk.cyan(`🔓 Released port ${portPath} after forced close`));
        }
      }
    } catch (forceError) {
      const forceErrorMessage =
        forceError instanceof Error ? forceError.message : String(forceError);
      console.error(chalk.red(`💥 Failed to force close port: ${forceErrorMessage}`));

      // Always try to release the port if we have a path
      if (portPath) {
        activeConnections.set(portPath, false);
        console.log(chalk.cyan(`🔓 Released port ${portPath} after close failure`));
      }
    }
  }
};

/**
 * Expand string ranges like "1-5,10-15" to an array of numbers [1,2,3,4,5,10,11,12,13,14,15]
 * @param ranges Array of range strings
 * @returns Array of individual numbers
 */
function expandRanges(ranges: string[]): number[] {
  const ids = new Set<number>();

  for (const range of ranges) {
    const parts = range.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      for (let i = start; i <= end; i++) {
        ids.add(i);
      }
    } else {
      ids.add(parseInt(parts[0], 10));
    }
  }

  return Array.from(ids);
}

/**
 * Simple approach to reading holding registers with timeout
 * @param client Modbus client
 * @param address Register address to read from
 * @param length Number of registers to read
 * @param timeout Timeout in ms (default 5000)
 * @returns Register data
 */
export const readHoldingRegistersWithTimeout = async (
  client: ModbusRTU,
  address: number,
  length: number,
  timeout = 5000,
): Promise<ModbusResponse> => {
  // Create timeout token to cancel timeout
  let timeoutId: NodeJS.Timeout | undefined = undefined;

  const readPromise = client.readHoldingRegisters(address, length);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Holding register read timed out after ${timeout}ms`);
      error.name = 'ReadTimeoutError';
      reject(error);
    }, timeout);
  });

  try {
    // Race the promises
    const result = (await Promise.race([readPromise, timeoutPromise])) as ModbusResponse;

    // Validate the result
    if (!result || !result.data) {
      throw new Error(`Invalid response when reading holding registers at address ${address}`);
    }

    return result;
  } catch (error) {
    // Convert to standard Error if needed
    if (!(error instanceof Error)) {
      const newError = new Error(String(error));
      newError.name = 'ModbusReadError';
      throw newError;
    }
    throw error;
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Simple approach to reading input registers with timeout
 * @param client Modbus client
 * @param address Register address to read from
 * @param length Number of registers to read
 * @param timeout Timeout in ms (default 5000)
 * @returns Register data
 */
export const readInputRegistersWithTimeout = async (
  client: ModbusRTU,
  address: number,
  length: number,
  timeout = 5000,
): Promise<ModbusResponse> => {
  // Create timeout token to cancel timeout
  let timeoutId: NodeJS.Timeout | undefined = undefined;

  const readPromise = client.readInputRegisters(address, length);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Input register read timed out after ${timeout}ms`);
      error.name = 'ReadTimeoutError';
      reject(error);
    }, timeout);
  });

  try {
    // Race the promises
    const result = (await Promise.race([readPromise, timeoutPromise])) as ModbusResponse;

    // Validate the result
    if (!result || !result.data) {
      throw new Error(`Invalid response when reading input registers at address ${address}`);
    }

    return result;
  } catch (error) {
    // Convert to standard Error if needed
    if (!(error instanceof Error)) {
      const newError = new Error(String(error));
      newError.name = 'ModbusReadError';
      throw newError;
    }
    throw error;
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Read coil registers with timeout
 * @param client Modbus client
 * @param address Register address to read from
 * @param length Number of coils to read
 * @param timeout Timeout in ms (default 5000)
 * @returns Coil register data (array of booleans)
 */
export const readCoilsWithTimeout = async (
  client: ModbusRTU,
  address: number,
  length: number,
  timeout = 5000,
): Promise<ModbusResponse> => {
  // Create timeout token to cancel timeout
  let timeoutId: NodeJS.Timeout | undefined = undefined;

  const readPromise = client.readCoils(address, length);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Coil read timed out after ${timeout}ms`);
      error.name = 'ReadTimeoutError';
      reject(error);
    }, timeout);
  });

  try {
    // Race the promises
    const result = (await Promise.race([readPromise, timeoutPromise])) as ModbusResponse;

    // Validate the result
    if (!result || !result.data === undefined) {
      throw new Error(`Invalid response when reading coils at address ${address}`);
    }

    return result;
  } catch (error) {
    // Convert to standard Error if needed
    if (!(error instanceof Error)) {
      const newError = new Error(String(error));
      newError.name = 'ModbusReadError';
      throw newError;
    }
    throw error;
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Write a single coil with timeout
 * @param client Modbus client
 * @param address Coil address to write to
 * @param value Boolean value to write (true = ON, false = OFF)
 * @param timeout Timeout in ms (default 5000)
 * @returns Success status
 */
export const writeCoilWithTimeout = async (
  client: ModbusRTU,
  address: number,
  value: boolean,
  timeout = 5000,
): Promise<boolean> => {
  // Create timeout token to cancel timeout
  let timeoutId: NodeJS.Timeout | undefined = undefined;

  const writePromise = client.writeCoil(address, value);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Coil write timed out after ${timeout}ms`);
      error.name = 'WriteTimeoutError';
      reject(error);
    }, timeout);
  });

  try {
    console.log(chalk.cyan(`🖊️ Writing coil value ${value} to address ${address}`));
    
    // Race the promises
    await Promise.race([writePromise, timeoutPromise]);
    
    console.log(chalk.green(`✅ Successfully wrote coil value ${value} to address ${address}`));
    return true;
  } catch (error) {
    // Log the error
    console.error(chalk.red(`❌ Error writing coil: ${error instanceof Error ? error.message : String(error)}`));
    
    // Convert to standard Error if needed
    if (!(error instanceof Error)) {
      const newError = new Error(String(error));
      newError.name = 'ModbusWriteError';
      throw newError;
    }
    throw error;
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Write multiple coils with timeout
 * @param client Modbus client
 * @param address Starting coil address to write to
 * @param values Array of boolean values to write
 * @param timeout Timeout in ms (default 5000)
 * @returns Success status
 */
export const writeMultipleCoilsWithTimeout = async (
  client: ModbusRTU,
  address: number,
  values: boolean[],
  timeout = 5000,
): Promise<boolean> => {
  // Create timeout token to cancel timeout
  let timeoutId: NodeJS.Timeout | undefined = undefined;

  const writePromise = client.writeCoils(address, values);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Multiple coils write timed out after ${timeout}ms`);
      error.name = 'WriteTimeoutError';
      reject(error);
    }, timeout);
  });

  try {
    console.log(chalk.cyan(`🖊️ Writing ${values.length} coil values starting at address ${address}`));
    
    // Race the promises
    await Promise.race([writePromise, timeoutPromise]);
    
    console.log(chalk.green(`✅ Successfully wrote ${values.length} coil values starting at address ${address}`));
    return true;
  } catch (error) {
    // Log the error
    console.error(chalk.red(`❌ Error writing multiple coils: ${error instanceof Error ? error.message : String(error)}`));
    
    // Convert to standard Error if needed
    if (!(error instanceof Error)) {
      const newError = new Error(String(error));
      newError.name = 'ModbusWriteError';
      throw newError;
    }
    throw error;
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
