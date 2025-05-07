/**
 * Helper functions for Modbus communication
 */

import ModbusRTU from 'modbus-serial';
const chalk = require('chalk');

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
  client.on('error', (err: Error | any) => {
    console.error(chalk.red(`💥 Unhandled client error: ${err?.message || String(err)}`));
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
      const serialPort = require('serialport');
      const ports = await serialPort.SerialPort.list();
      const portInfo = ports.find((p: any) => p.path === port);

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
      const modbusClient = client as any;
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
          const modbusClient = this as any;
          if (modbusClient._port && modbusClient._port.isOpen) {
            modbusClient._port.close();
            console.warn(chalk.yellow(`⚠️ Force closed port ${port}`));
          }
        } catch (forceCloseError) {
          console.error(chalk.red(`💥 Failed to force close port: ${forceCloseError}`));
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
        const { execSync } = require('child_process');
        const output = execSync(`lsof | grep ${port}`).toString();
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
 * Safely close a Modbus client connection
 * @param client The Modbus client to close
 */
export const safeCloseModbusClient = async (client: ModbusRTU | null): Promise<void> => {
  if (!client) return;

  try {
    // Check if client has isOpen property and it's true
    const isOpenProperty = typeof client.isOpen === 'boolean' && client.isOpen;

    // For RTU connections, also check the internal port object
    let isPortOpen = false;
    try {
      // Access internal properties using type casting
      const modbusClient = client as any;
      if (modbusClient && modbusClient._port) {
        isPortOpen = modbusClient._port.isOpen;
      }
    } catch (portError) {
      console.warn(chalk.yellow('⚠️ Could not check port status:', portError));
    }

    // If either the client or port is open, try to close it
    if (isOpenProperty || isPortOpen) {
      await client.close();
      console.log(chalk.cyan('✅ Successfully closed Modbus connection'));
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Error closing Modbus connection:', error));

    // Try to forcefully close the port if normal close fails
    try {
      const modbusClient = client as any;
      if (modbusClient && modbusClient._port && modbusClient._port.isOpen) {
        modbusClient._port.close();
        console.warn(chalk.yellow('⚠️ Forcefully closed port after close failure'));
      }
    } catch (forceError) {
      console.error(chalk.red('💥 Failed to force close port:', forceError));
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
  const readPromise = client.readHoldingRegisters(address, length);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Holding register read timed out after ${timeout}ms`)),
      timeout,
    );
  });

  return Promise.race([readPromise, timeoutPromise]) as Promise<ModbusResponse>;
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
  const readPromise = client.readInputRegisters(address, length);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Input register read timed out after ${timeout}ms`)),
      timeout,
    );
  });

  return Promise.race([readPromise, timeoutPromise]) as Promise<ModbusResponse>;
};
