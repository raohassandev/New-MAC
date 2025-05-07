/**
 * Modbus RTU connection implementation
 */
import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import { ModbusRTUOptions } from '../../../core/types';
import { ConnectionError, TimeoutError } from '../../../core/errors';
import { addCRC, verifyCRC } from '../common/crc';

/**
 * Events emitted by the RTU connection
 */
export enum RTUConnectionEvent {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  DATA = 'data',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

/**
 * Manages the serial connection for Modbus RTU
 */
export class RTUConnection extends EventEmitter {
  private _port: SerialPort | null = null;
  private _connected = false;
  private _connectionPromise: Promise<void> | null = null;
  private _disconnectionPromise: Promise<void> | null = null;
  private _debugMode = false;
  private _buffer: Buffer = Buffer.alloc(0);
  private _options: ModbusRTUOptions;
  private _requestInProgress = false;

  // Map to track which ports are in use
  private static readonly activePorts = new Map<string, boolean>();

  // Default connection options
  private static readonly DEFAULT_OPTIONS: Partial<ModbusRTUOptions> = {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    timeout: 1000,
    retries: 3,
    retryInterval: 100,
    autoReconnect: true,
    reconnectInterval: 5000,
  };

  /**
   * Create a new RTU connection
   * @param options Connection options
   */
  constructor(options: ModbusRTUOptions) {
    super();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);

    // Merge default options with provided options
    this._options = {
      ...RTUConnection.DEFAULT_OPTIONS,
      ...options,
    };

    if (!this._options.path) {
      throw new Error('Serial port path is required');
    }
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
  }

  /**
   * Connect to the serial port
   * @returns Promise that resolves when connected
   */
  public async connect(): Promise<void> {
    // If already connected, return immediately
    if (this._connected) {
      return;
    }

    // If already connecting, return the existing promise
    if (this._connectionPromise) {
      return this._connectionPromise;
    }

    this._connectionPromise = this._connect();

    try {
      await this._connectionPromise;
    } finally {
      this._connectionPromise = null;
    }
  }

  /**
   * Internal connect implementation
   */
  private async _connect(): Promise<void> {
    // Check if the port is already in use
    if (RTUConnection.activePorts.get(this._options.path)) {
      if (this._debugMode) {
        console.warn(
          `[RTU] Port ${this._options.path} appears to be in use, attempting to close any existing connections`,
        );
      }

      // Try to get information about the port
      try {
        const ports = await SerialPort.list();
        const portInfo = ports.find(p => p.path === this._options.path);

        if (portInfo) {
          if (this._debugMode) {
            console.log(`[RTU] Found port ${this._options.path} in system device list`);
          }
        } else {
          if (this._debugMode) {
            console.warn(
              `[RTU] Port ${this._options.path} not found in system device list, it may not exist`,
            );
          }
        }
      } catch (listError) {
        if (this._debugMode) {
          console.warn(`[RTU] Failed to list serial ports: ${listError}`);
        }
      }
    }

    // Mark port as in use
    RTUConnection.activePorts.set(this._options.path, true);

    if (this._debugMode) {
      console.log(`[RTU] Connecting to port ${this._options.path} with options:`, {
        baudRate: this._options.baudRate,
        dataBits: this._options.dataBits,
        stopBits: this._options.stopBits,
        parity: this._options.parity,
      });
    }

    this.emit(RTUConnectionEvent.CONNECTING);

    let attempts = 0;
    let lastError: Error | null = null;

    // Try to connect with retries
    while (attempts <= this._options.retries!) {
      attempts++;

      try {
        await this._attemptConnect();

        // Connection successful
        this._connected = true;
        this.emit(RTUConnectionEvent.CONNECTED);

        if (this._debugMode) {
          console.log(`[RTU] Connected to port ${this._options.path}`);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this._debugMode) {
          console.error(`[RTU] Connection attempt ${attempts} failed: ${lastError.message}`);
        }

        // If we've reached the maximum retries, throw the error
        if (attempts > this._options.retries!) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this._options.retryInterval));
      }
    }

    // If we get here, all connection attempts failed
    // Release the port marker
    RTUConnection.activePorts.set(this._options.path, false);

    const error = new ConnectionError(
      `Failed to connect to port ${this._options.path} after ${attempts} attempts`,
      lastError || undefined,
    );

    this.emit(RTUConnectionEvent.ERROR, error);
    throw error;
  }

  /**
   * Attempt to connect once
   */
  private _attemptConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create a new SerialPort instance
        this._port = new SerialPort({
          path: this._options.path,
          baudRate: this._options.baudRate,
          dataBits: this._options.dataBits,
          stopBits: this._options.stopBits,
          parity: this._options.parity as 'none' | 'even' | 'odd',
          autoOpen: false, // We'll open it manually
        });

        // Create timeout
        const connectionTimeout = setTimeout(() => {
          // Clean up listeners to avoid memory leaks
          this._port?.removeAllListeners();

          // Close the port
          this._port?.close(closeError => {
            if (closeError && this._debugMode) {
              console.warn(`[RTU] Error closing port during timeout: ${closeError}`);
            }
          });

          this._port = null;

          // Release the port marker
          RTUConnection.activePorts.set(this._options.path, false);

          // Reject with timeout error
          const error = new TimeoutError(
            `Connection timeout after ${this._options.timeout}ms`,
            this._options.timeout!,
          );

          reject(error);
        }, this._options.timeout);

        // Set up event handlers
        this._port.on('open', () => {
          clearTimeout(connectionTimeout);

          // Set up data event handler with buffer management
          this._port!.on('data', (data: Buffer) => {
            this._handleData(data);
          });

          // Set up error event handler
          this._port!.on('error', (error: Error) => {
            if (this._debugMode) {
              console.error(`[RTU] Port error: ${error.message}`);
            }

            this.emit(
              RTUConnectionEvent.ERROR,
              new ConnectionError(`Port error: ${error.message}`, error),
            );

            // If auto-reconnect is enabled, try to reconnect
            if (this._options.autoReconnect && this._connected) {
              this._handleDisconnect();

              setTimeout(() => {
                this.connect().catch(err => {
                  if (this._debugMode) {
                    console.error(`[RTU] Auto-reconnect failed: ${err.message}`);
                  }
                });
              }, this._options.reconnectInterval);
            }
          });

          // Set up close event handler
          this._port!.on('close', () => {
            this._handleDisconnect();
          });

          resolve();
        });

        // Handle open errors
        this._port.on('error', (error: Error) => {
          clearTimeout(connectionTimeout);

          // Clean up
          this._port?.close(() => {
            // Ignore close errors
          });

          this._port = null;

          // Release the port marker
          RTUConnection.activePorts.set(this._options.path, false);

          reject(new ConnectionError(`Connection error: ${error.message}`, error));
        });

        // Open the port
        this._port.open(openError => {
          if (openError) {
            clearTimeout(connectionTimeout);

            // Clean up
            this._port?.close(() => {
              // Ignore close errors
            });

            this._port = null;

            // Release the port marker
            RTUConnection.activePorts.set(this._options.path, false);

            reject(new ConnectionError(`Error opening port: ${openError.message}`, openError));
          }
        });
      } catch (error) {
        // Release the port marker
        RTUConnection.activePorts.set(this._options.path, false);

        reject(
          new ConnectionError(
            `Unexpected error during connection: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : undefined,
          ),
        );
      }
    });
  }

  /**
   * Handle received serial data
   * @param data Received data buffer
   */
  private _handleData(data: Buffer): void {
    // Append the new data to our buffer
    this._buffer = Buffer.concat([this._buffer, data]);

    // Check if we have a complete Modbus RTU frame
    if (this._buffer.length >= 5) {
      // Minimum frame size
      // For Modbus RTU, we need at least the slave ID, function code, and CRC (3 bytes)
      // Plus either the byte count (for responses) or the starting address (for requests)

      // Check if we have a complete frame
      const length = this._getFrameLength(this._buffer);

      if (length > 0 && this._buffer.length >= length) {
        const frame = this._buffer.subarray(0, length);

        // Remove the frame from the buffer
        this._buffer = this._buffer.subarray(length);

        // Verify the CRC
        if (verifyCRC(frame)) {
          // Emit the frame without the CRC (last 2 bytes)
          this.emit(RTUConnectionEvent.DATA, frame.subarray(0, frame.length - 2));
        } else {
          if (this._debugMode) {
            console.warn(`[RTU] Received frame with invalid CRC: ${frame.toString('hex')}`);
          }
        }
      }
    }
  }

  /**
   * Determine the length of a Modbus RTU frame
   * @param buffer Buffer containing the frame
   * @returns Length of the frame or 0 if incomplete
   */
  private _getFrameLength(buffer: Buffer): number {
    if (buffer.length < 2) {
      return 0; // Not enough data
    }

    const functionCode = buffer[1] & 0x7f; // Mask off exception bit

    // Determine the length based on the function code
    switch (functionCode) {
      case 1: // Read Coils
      case 2: // Read Discrete Inputs
      case 3: // Read Holding Registers
      case 4: // Read Input Registers
        if (buffer.length < 3) {
          return 0; // Not enough data
        }

        if (buffer[1] & 0x80) {
          // Exception response
          return 5; // Slave ID (1) + Function Code (1) + Exception Code (1) + CRC (2)
        }

        const byteCount = buffer[2];
        return 5 + byteCount; // Slave ID (1) + Function Code (1) + Byte Count (1) + Data (byteCount) + CRC (2)

      case 5: // Write Single Coil
      case 6: // Write Single Register
        return 8; // Slave ID (1) + Function Code (1) + Address (2) + Value (2) + CRC (2)

      case 15: // Write Multiple Coils
      case 16: // Write Multiple Registers
        if (buffer.length < 8) {
          return 0; // Not enough data for a request
        }

        if (buffer[1] & 0x80) {
          // Exception response
          return 5; // Slave ID (1) + Function Code (1) + Exception Code (1) + CRC (2)
        }

        if (buffer.length < 7) {
          return 0; // Not enough data for a response
        }

        // Check if it's a request or response
        if (buffer.length >= 7 && buffer[6] > 0) {
          // It's a request with a byte count
          const byteCount = buffer[6];
          return 9 + byteCount; // Slave ID (1) + Function Code (1) + Address (2) + Quantity (2) + Byte Count (1) + Data (byteCount) + CRC (2)
        } else {
          // It's a response
          return 8; // Slave ID (1) + Function Code (1) + Address (2) + Quantity (2) + CRC (2)
        }

      default:
        // Unknown function code, return a reasonable default
        if (buffer.length >= 3 && buffer[2] <= 250) {
          // Assume it has a byte count field
          const byteCount = buffer[2];
          return 5 + byteCount; // Slave ID (1) + Function Code (1) + Byte Count (1) + Data (byteCount) + CRC (2)
        }
        return 0; // Can't determine
    }
  }

  /**
   * Handle socket disconnect
   */
  private _handleDisconnect(): void {
    // Clean up
    this._port?.removeAllListeners();

    // Close the port if it's open
    if (this._port && this._port.isOpen) {
      this._port.close(closeError => {
        if (closeError && this._debugMode) {
          console.warn(`[RTU] Error closing port during disconnect: ${closeError}`);
        }
      });
    }

    this._port = null;

    // Release the port marker
    RTUConnection.activePorts.set(this._options.path, false);

    // Update state
    const wasConnected = this._connected;
    this._connected = false;

    // Reset the buffer
    this._buffer = Buffer.alloc(0);

    // Only emit the event if we were previously connected
    if (wasConnected) {
      this.emit(RTUConnectionEvent.DISCONNECTED);

      if (this._debugMode) {
        console.log(`[RTU] Disconnected from port ${this._options.path}`);
      }
    }
  }

  /**
   * Disconnect from the serial port
   * @returns Promise that resolves when disconnected
   */
  public async disconnect(): Promise<void> {
    // If already disconnected, return immediately
    if (!this._connected) {
      return;
    }

    // If already disconnecting, return the existing promise
    if (this._disconnectionPromise) {
      return this._disconnectionPromise;
    }

    this._disconnectionPromise = this._disconnect();

    try {
      await this._disconnectionPromise;
    } finally {
      this._disconnectionPromise = null;
    }
  }

  /**
   * Internal disconnect implementation
   */
  private async _disconnect(): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this._port || !this._connected) {
        this._connected = false;
        resolve();
        return;
      }

      if (this._debugMode) {
        console.log(`[RTU] Disconnecting from port ${this._options.path}...`);
      }

      // Set up one-time close event handler
      this._port.once('close', () => {
        this._handleDisconnect();
        resolve();
      });

      // Close the port
      this._port.close(closeError => {
        if (closeError) {
          if (this._debugMode) {
            console.warn(`[RTU] Error closing port: ${closeError}`);
          }

          // Force the disconnect
          this._handleDisconnect();
          resolve();
        }
      });

      // Set a timeout in case the close event doesn't fire
      setTimeout(() => {
        if (this._connected) {
          // Force the disconnect
          this._handleDisconnect();
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Check if connected to the serial port
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this._connected && this._port !== null && this._port.isOpen;
  }

  /**
   * Send data to the serial port
   * @param data Data to send
   * @param slaveId Slave ID
   * @param functionCode Function code
   * @param timeout Timeout in milliseconds
   * @returns Promise that resolves with the response data
   */
  public async send(
    data: Buffer,
    slaveId: number,
    functionCode: number,
    timeout?: number,
  ): Promise<Buffer> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected');
    }

    // Prevent concurrent requests
    if (this._requestInProgress) {
      throw new ConnectionError('Another request is in progress');
    }

    this._requestInProgress = true;

    try {
      // Add the CRC to the data
      const dataWithCRC = addCRC(data);

      return new Promise<Buffer>((resolve, reject) => {
        const effectiveTimeout = timeout || this._options.timeout!;

        // Create timeout
        let timeoutId: NodeJS.Timeout | null = null;

        if (effectiveTimeout > 0) {
          timeoutId = setTimeout(() => {
            // Remove the handler to avoid memory leaks
            this.removeListener(RTUConnectionEvent.DATA, dataHandler);

            this._requestInProgress = false;

            const error = new TimeoutError(
              `Response timeout after ${effectiveTimeout}ms`,
              effectiveTimeout,
            );

            reject(error);
          }, effectiveTimeout);
        }

        // Build a validator for matching the response to this request
        const isMatchingResponse = (response: Buffer): boolean => {
          if (response.length < 2) {
            return false;
          }

          // Check the slave ID
          if (response[0] !== slaveId) {
            return false;
          }

          // Check the function code (accounting for exception responses)
          const responseFunctionCode = response[1] & 0x7f;
          return responseFunctionCode === functionCode;
        };

        // Set up data handler
        const dataHandler = (response: Buffer) => {
          // Check if the response matches this request
          if (isMatchingResponse(response)) {
            // Remove the handler and clear the timeout
            this.removeListener(RTUConnectionEvent.DATA, dataHandler);

            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            this._requestInProgress = false;

            // Resolve with the response
            resolve(response);
          }
        };

        // Add the data handler
        this.on(RTUConnectionEvent.DATA, dataHandler);

        // Clear the receive buffer before sending
        this._buffer = Buffer.alloc(0);

        // Send the data
        this._port!.write(dataWithCRC, writeError => {
          if (writeError) {
            // Remove the handler and clear the timeout
            this.removeListener(RTUConnectionEvent.DATA, dataHandler);

            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            this._requestInProgress = false;

            // Reject with the error
            reject(new ConnectionError(`Send error: ${writeError.message}`, writeError));
          }

          // We need to call drain() to ensure all data has been transmitted
          this._port!.drain(drainError => {
            if (drainError) {
              // Remove the handler and clear the timeout
              this.removeListener(RTUConnectionEvent.DATA, dataHandler);

              if (timeoutId) {
                clearTimeout(timeoutId);
              }

              this._requestInProgress = false;

              // Reject with the error
              reject(new ConnectionError(`Drain error: ${drainError.message}`, drainError));
            }
          });
        });
      });
    } catch (error) {
      this._requestInProgress = false;
      throw error;
    }
  }
}
