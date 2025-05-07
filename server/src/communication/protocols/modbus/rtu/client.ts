/**
 * Modbus RTU client implementation
 */
import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import {
  Parameter,
  RequestResult,
  ReadOptions,
  WriteOptions,
  ModbusRTUOptions,
  ModbusResponse,
  RegisterType,
  ByteOrder,
  ConnectionState,
} from '../../../core/types';
import {
  ModbusFunctionCode,
  isWritableRegisterType,
  getOperationDescription,
  isValidQuantity,
  registersToValue,
  valueToRegisters,
  addCRC,
  verifyCRC,
} from '../common';
import * as pdu from '../common/pdu';
import {
  CommunicationError,
  ModbusError,
  ValidationError,
  ParsingError,
  TimeoutError,
  ConnectionError,
  convertError,
} from '../../../core/errors';

/**
 * Events emitted by the RTU connection
 */
enum RTUConnectionEvent {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  DATA = 'data',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

/**
 * Events emitted by the Modbus RTU client
 */
export enum ModbusRTUClientEvent {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PRE_REQUEST = 'pre-request',
  POST_REQUEST = 'post-request',
  TIMEOUT = 'timeout',
  STATE_CHANGE = 'state-change',
}

/**
 * Manages the serial connection for Modbus RTU
 */
class RTUConnection extends EventEmitter {
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

/**
 * Modbus RTU client implementation
 */
export class ModbusRTUClient extends EventEmitter {
  private _connection: RTUConnection;
  private _unitId = 1;
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private _debugMode = false;
  private _options: ModbusRTUOptions;

  // Keep track of the last request time for debugging
  private _lastRequestTime = 0;

  /**
   * Create a new Modbus RTU client
   * @param options Connection options
   */
  constructor(options: ModbusRTUOptions) {
    super();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);

    this._options = options;
    this._connection = new RTUConnection(options);
    this._unitId = options.unitId || 1;

    // Set up connection event handlers
    this._connection.on(RTUConnectionEvent.CONNECTED, () => {
      this._updateConnectionState(ConnectionState.CONNECTED);
      this.emit(ModbusRTUClientEvent.CONNECTED);
    });

    this._connection.on(RTUConnectionEvent.DISCONNECTED, () => {
      this._updateConnectionState(ConnectionState.DISCONNECTED);
      this.emit(ModbusRTUClientEvent.DISCONNECTED);
    });

    this._connection.on(RTUConnectionEvent.ERROR, (error: Error) => {
      this._updateConnectionState(ConnectionState.ERROR);
      this.emit(ModbusRTUClientEvent.ERROR, error);
    });

    this._connection.on(RTUConnectionEvent.TIMEOUT, () => {
      this.emit(ModbusRTUClientEvent.TIMEOUT);
    });
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
    this._connection.setDebugMode(enabled);
  }

  /**
   * Set the unit ID (slave address)
   * @param unitId Unit ID
   */
  public setUnitId(unitId: number): void {
    this._unitId = unitId;
  }

  /**
   * Get the current unit ID
   * @returns Unit ID
   */
  public getUnitId(): number {
    return this._unitId;
  }

  /**
   * Get the current connection state
   * @returns Connection state
   */
  public getConnectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Connect to the Modbus RTU device
   */
  public async connect(): Promise<void> {
    if (
      this._connectionState === ConnectionState.CONNECTING ||
      this._connectionState === ConnectionState.CONNECTED
    ) {
      return;
    }

    try {
      this._updateConnectionState(ConnectionState.CONNECTING);
      this.emit(ModbusRTUClientEvent.CONNECTING);

      await this._connection.connect();
    } catch (error) {
      this._updateConnectionState(ConnectionState.ERROR);

      const communicationError = convertError(error);
      this.emit(ModbusRTUClientEvent.ERROR, communicationError);

      throw communicationError;
    }
  }

  /**
   * Disconnect from the Modbus RTU device
   */
  public async disconnect(): Promise<void> {
    if (this._connectionState === ConnectionState.DISCONNECTED) {
      return;
    }

    try {
      await this._connection.disconnect();
    } catch (error) {
      const communicationError = convertError(error);
      this.emit(ModbusRTUClientEvent.ERROR, communicationError);

      throw communicationError;
    }
  }

  /**
   * Check if connected to the Modbus RTU device
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this._connectionState === ConnectionState.CONNECTED && this._connection.isConnected();
  }

  /**
   * Read coils from the Modbus device
   * @param address Starting address
   * @param quantity Number of coils to read
   * @param options Read options
   * @returns Promise resolving with the coil values
   */
  public async readCoils(
    address: number,
    quantity: number,
    options?: ReadOptions,
  ): Promise<ModbusResponse> {
    if (!isValidQuantity(ModbusFunctionCode.READ_COILS, quantity)) {
      throw new ValidationError(`Invalid quantity for reading coils: ${quantity}`);
    }

    const pduBuffer = pdu.createReadCoilsPDU(address, quantity);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.READ_COILS,
        pduBuffer,
        options?.timeout,
      );

      const values = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.READ_COILS,
      ) as boolean[];

      return {
        data: values.slice(0, quantity), // Trim to requested quantity
      };
    } catch (error) {
      throw this._processError(error, 'readCoils', address, quantity);
    }
  }

  /**
   * Read discrete inputs from the Modbus device
   * @param address Starting address
   * @param quantity Number of inputs to read
   * @param options Read options
   * @returns Promise resolving with the input values
   */
  public async readDiscreteInputs(
    address: number,
    quantity: number,
    options?: ReadOptions,
  ): Promise<ModbusResponse> {
    if (!isValidQuantity(ModbusFunctionCode.READ_DISCRETE_INPUTS, quantity)) {
      throw new ValidationError(`Invalid quantity for reading discrete inputs: ${quantity}`);
    }

    const pduBuffer = pdu.createReadDiscreteInputsPDU(address, quantity);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.READ_DISCRETE_INPUTS,
        pduBuffer,
        options?.timeout,
      );

      const values = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.READ_DISCRETE_INPUTS,
      ) as boolean[];

      return {
        data: values.slice(0, quantity), // Trim to requested quantity
      };
    } catch (error) {
      throw this._processError(error, 'readDiscreteInputs', address, quantity);
    }
  }

  /**
   * Read holding registers from the Modbus device
   * @param address Starting address
   * @param quantity Number of registers to read
   * @param options Read options
   * @returns Promise resolving with the register values
   */
  public async readHoldingRegisters(
    address: number,
    quantity: number,
    options?: ReadOptions,
  ): Promise<ModbusResponse> {
    if (!isValidQuantity(ModbusFunctionCode.READ_HOLDING_REGISTERS, quantity)) {
      throw new ValidationError(`Invalid quantity for reading holding registers: ${quantity}`);
    }

    const pduBuffer = pdu.createReadHoldingRegistersPDU(address, quantity);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.READ_HOLDING_REGISTERS,
        pduBuffer,
        options?.timeout,
      );

      const values = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.READ_HOLDING_REGISTERS,
      ) as number[];

      return {
        data: values,
      };
    } catch (error) {
      throw this._processError(error, 'readHoldingRegisters', address, quantity);
    }
  }

  /**
   * Read input registers from the Modbus device
   * @param address Starting address
   * @param quantity Number of registers to read
   * @param options Read options
   * @returns Promise resolving with the register values
   */
  public async readInputRegisters(
    address: number,
    quantity: number,
    options?: ReadOptions,
  ): Promise<ModbusResponse> {
    if (!isValidQuantity(ModbusFunctionCode.READ_INPUT_REGISTERS, quantity)) {
      throw new ValidationError(`Invalid quantity for reading input registers: ${quantity}`);
    }

    const pduBuffer = pdu.createReadInputRegistersPDU(address, quantity);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.READ_INPUT_REGISTERS,
        pduBuffer,
        options?.timeout,
      );

      const values = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.READ_INPUT_REGISTERS,
      ) as number[];

      return {
        data: values,
      };
    } catch (error) {
      throw this._processError(error, 'readInputRegisters', address, quantity);
    }
  }

  /**
   * Write a single coil to the Modbus device
   * @param address Coil address
   * @param value Coil value (true = ON, false = OFF)
   * @param options Write options
   * @returns Promise resolving with the response
   */
  public async writeSingleCoil(
    address: number,
    value: boolean,
    options?: WriteOptions,
  ): Promise<ModbusResponse> {
    const pduBuffer = pdu.createWriteSingleCoilPDU(address, value);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.WRITE_SINGLE_COIL,
        pduBuffer,
        options?.timeout,
      );

      const result = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.WRITE_SINGLE_COIL,
      ) as { address: number; value: boolean };

      return {
        data: [result.value],
      };
    } catch (error) {
      throw this._processError(error, 'writeSingleCoil', address, 1);
    }
  }

  /**
   * Write a single register to the Modbus device
   * @param address Register address
   * @param value Register value (16-bit integer)
   * @param options Write options
   * @returns Promise resolving with the response
   */
  public async writeSingleRegister(
    address: number,
    value: number,
    options?: WriteOptions,
  ): Promise<ModbusResponse> {
    // Validate the value
    if (value < 0 || value > 0xffff) {
      throw new ValidationError(`Invalid register value: ${value}`);
    }

    const pduBuffer = pdu.createWriteSingleRegisterPDU(address, value);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.WRITE_SINGLE_REGISTER,
        pduBuffer,
        options?.timeout,
      );

      const result = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.WRITE_SINGLE_REGISTER,
      ) as { address: number; value: number };

      return {
        data: [result.value],
      };
    } catch (error) {
      throw this._processError(error, 'writeSingleRegister', address, 1);
    }
  }

  /**
   * Write multiple coils to the Modbus device
   * @param address Starting address
   * @param values Array of coil values
   * @param options Write options
   * @returns Promise resolving with the response
   */
  public async writeMultipleCoils(
    address: number,
    values: boolean[],
    options?: WriteOptions,
  ): Promise<ModbusResponse> {
    if (!isValidQuantity(ModbusFunctionCode.WRITE_MULTIPLE_COILS, values.length)) {
      throw new ValidationError(`Invalid quantity for writing multiple coils: ${values.length}`);
    }

    const pduBuffer = pdu.createWriteMultipleCoilsPDU(address, values);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.WRITE_MULTIPLE_COILS,
        pduBuffer,
        options?.timeout,
      );

      const result = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.WRITE_MULTIPLE_COILS,
      ) as { address: number; quantity: number };

      return {
        data: values,
      };
    } catch (error) {
      throw this._processError(error, 'writeMultipleCoils', address, values.length);
    }
  }

  /**
   * Write multiple registers to the Modbus device
   * @param address Starting address
   * @param values Array of register values
   * @param options Write options
   * @returns Promise resolving with the response
   */
  public async writeMultipleRegisters(
    address: number,
    values: number[],
    options?: WriteOptions,
  ): Promise<ModbusResponse> {
    if (!isValidQuantity(ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS, values.length)) {
      throw new ValidationError(
        `Invalid quantity for writing multiple registers: ${values.length}`,
      );
    }

    // Validate all values
    for (let i = 0; i < values.length; i++) {
      if (values[i] < 0 || values[i] > 0xffff) {
        throw new ValidationError(`Invalid register value at index ${i}: ${values[i]}`);
      }
    }

    const pduBuffer = pdu.createWriteMultipleRegistersPDU(address, values);

    try {
      const response = await this._sendRequest(
        ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS,
        pduBuffer,
        options?.timeout,
      );

      const result = pdu.parseResponsePDU(
        response.slice(1), // Remove slave ID
        ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS,
      ) as { address: number; quantity: number };

      return {
        data: values,
      };
    } catch (error) {
      throw this._processError(error, 'writeMultipleRegisters', address, values.length);
    }
  }

  /**
   * Read a parameter from the device
   * @param parameter Parameter to read
   * @param options Read options
   * @returns Promise resolving with the parameter value
   */
  public async readParameter(parameter: Parameter, options?: ReadOptions): Promise<RequestResult> {
    try {
      const { registerType, address, dataType, byteOrder, wordCount } = parameter;

      // Calculate the number of registers to read
      const count = wordCount || dataType in { BOOLEAN: 1 } ? 1 : 2;

      let result: ModbusResponse;

      // Read the appropriate register type
      switch (registerType) {
        case RegisterType.COIL:
          result = await this.readCoils(address, count, options);
          break;
        case RegisterType.DISCRETE_INPUT:
          result = await this.readDiscreteInputs(address, count, options);
          break;
        case RegisterType.HOLDING_REGISTER:
          result = await this.readHoldingRegisters(address, count, options);
          break;
        case RegisterType.INPUT_REGISTER:
          result = await this.readInputRegisters(address, count, options);
          break;
        default:
          throw new Error(`Unsupported register type: ${registerType}`);
      }

      // Convert the raw values to the appropriate data type
      let value: any;
      try {
        value = registersToValue(result.data as number[], dataType, byteOrder || ByteOrder.ABCD);
      } catch (error) {
        throw new ParsingError(
          `Error parsing value for ${parameter.name}: ${error instanceof Error ? error.message : String(error)}`,
          dataType,
          result.data,
        );
      }

      return {
        success: true,
        data: value,
        timestamp: new Date(),
      };
    } catch (error) {
      const communicationError = convertError(error);

      return {
        success: false,
        error: communicationError,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Write a value to a parameter
   * @param parameter Parameter to write to
   * @param value Value to write
   * @param options Write options
   * @returns Promise resolving with the result
   */
  public async writeParameter(
    parameter: Parameter,
    value: any,
    options?: WriteOptions,
  ): Promise<RequestResult> {
    try {
      const { registerType, address, dataType, byteOrder } = parameter;

      // Check if the register type is writable
      if (!isWritableRegisterType(registerType)) {
        throw new ValidationError(
          `Register type ${registerType} is read-only`,
          parameter.name,
          value,
        );
      }

      // Convert the value to registers
      let registers: number[];
      try {
        registers = valueToRegisters(value, dataType, byteOrder || ByteOrder.ABCD);
      } catch (error) {
        throw new ParsingError(
          `Error converting value for ${parameter.name}: ${error instanceof Error ? error.message : String(error)}`,
          dataType,
          value,
        );
      }

      // Write the value to the appropriate register type
      let result: ModbusResponse;

      if (registerType === RegisterType.COIL) {
        if (registers.length === 1) {
          // Write a single coil
          result = await this.writeSingleCoil(address, registers[0] !== 0, options);
        } else {
          // Write multiple coils
          const values = registers.map(v => v !== 0);
          result = await this.writeMultipleCoils(address, values, options);
        }
      } else if (registerType === RegisterType.HOLDING_REGISTER) {
        if (registers.length === 1) {
          // Write a single register
          result = await this.writeSingleRegister(address, registers[0], options);
        } else {
          // Write multiple registers
          result = await this.writeMultipleRegisters(address, registers, options);
        }
      } else {
        throw new ValidationError(
          `Register type ${registerType} is not supported for writing`,
          parameter.name,
          value,
        );
      }

      return {
        success: true,
        data: value,
        timestamp: new Date(),
      };
    } catch (error) {
      const communicationError = convertError(error);

      return {
        success: false,
        error: communicationError,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get information about the protocol
   * @returns Protocol information
   */
  public getProtocolInfo(): { name: string; version: string; capabilities: string[] } {
    return {
      name: 'Modbus RTU',
      version: '1.0.0',
      capabilities: [
        'READ_COILS',
        'READ_DISCRETE_INPUTS',
        'READ_HOLDING_REGISTERS',
        'READ_INPUT_REGISTERS',
        'WRITE_SINGLE_COIL',
        'WRITE_SINGLE_REGISTER',
        'WRITE_MULTIPLE_COILS',
        'WRITE_MULTIPLE_REGISTERS',
      ],
    };
  }

  /**
   * Send a Modbus RTU request
   * @param functionCode Modbus function code
   * @param pdu Protocol Data Unit (PDU)
   * @param timeout Optional timeout in milliseconds
   * @returns Promise resolving with the raw response
   */
  private async _sendRequest(functionCode: number, pdu: Buffer, timeout?: number): Promise<Buffer> {
    // Ensure we're connected
    if (!this.isConnected()) {
      await this.connect();
    }

    // Create the Modbus RTU ADU (Application Data Unit)
    // ADU = Slave ID + PDU (no CRC, it's added by the connection)
    const request = Buffer.alloc(pdu.length + 1);
    request[0] = this._unitId; // Slave ID
    pdu.copy(request, 1); // Copy PDU after Slave ID

    // Log the request if debug mode is enabled
    if (this._debugMode) {
      const operation = getOperationDescription(
        functionCode,
        pdu.readUInt16BE(1), // address
        pdu.length > 4 ? pdu.readUInt16BE(3) : 1, // quantity
      );

      console.log(`[Modbus RTU] TX: ${operation} (Slave ID: ${this._unitId})`);
      console.log(`[Modbus RTU] Request: ${request.toString('hex')}`);
    }

    // Emit pre-request event
    this.emit(ModbusRTUClientEvent.PRE_REQUEST, functionCode, request);

    // Record the request time
    this._lastRequestTime = Date.now();

    try {
      // Send the request and wait for the response
      const response = await this._connection.send(request, this._unitId, functionCode, timeout);

      // Log the response if debug mode is enabled
      if (this._debugMode) {
        const responseTime = Date.now() - this._lastRequestTime;
        console.log(
          `[Modbus RTU] RX: Response received in ${responseTime}ms (Slave ID: ${this._unitId})`,
        );
        console.log(`[Modbus RTU] Response: ${response.toString('hex')}`);
      }

      // Emit post-request event
      this.emit(ModbusRTUClientEvent.POST_REQUEST, functionCode, request, response);

      // Validate the response
      this._validateResponse(response, functionCode);

      return response;
    } catch (error) {
      // Log the error if debug mode is enabled
      if (this._debugMode) {
        const responseTime = Date.now() - this._lastRequestTime;
        console.error(
          `[Modbus RTU] Error after ${responseTime}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Convert to an appropriate error type
      const communicationError = convertError(error);

      // Emit post-request event with error
      this.emit(ModbusRTUClientEvent.POST_REQUEST, functionCode, request, null, communicationError);

      // Re-throw the error
      throw communicationError;
    }
  }

  /**
   * Validate a Modbus RTU response
   * @param response Response buffer
   * @param functionCode Expected function code
   */
  private _validateResponse(response: Buffer, functionCode: number): void {
    // Check if the response is valid
    if (!response || response.length < 2) {
      throw new Error('Invalid response: too short');
    }

    // Check the slave ID
    if (response[0] !== this._unitId) {
      throw new Error(`Slave ID mismatch: expected ${this._unitId}, got ${response[0]}`);
    }

    // Check the function code (bit 7 set indicates an exception)
    const responseFunctionCode = response[1];
    if (responseFunctionCode !== functionCode) {
      if ((responseFunctionCode & 0x80) === 0x80) {
        // It's an exception response
        if (response.length < 3) {
          throw new Error('Invalid exception response: too short');
        }

        const exceptionCode = response[2];
        throw new ModbusError(`Modbus exception: ${exceptionCode}`, exceptionCode, functionCode);
      } else {
        // It's an unexpected function code
        throw new Error(
          `Function code mismatch: expected ${functionCode}, got ${responseFunctionCode}`,
        );
      }
    }
  }

  /**
   * Process an error from a Modbus operation
   * @param error Original error
   * @param operation Operation name
   * @param address Address
   * @param quantity Quantity
   * @returns Processed error
   */
  private _processError(error: any, operation: string, address: number, quantity: number): Error {
    // If it's already a CommunicationError, just add context if needed
    if (error instanceof CommunicationError) {
      // Add more context to the error message if it doesn't already have it
      if (!error.message.includes(operation)) {
        error.message = `Error in ${operation}(${address}, ${quantity}): ${error.message}`;
      }
      return error;
    }

    // Convert to an appropriate error type
    const message = `Error in ${operation}(${address}, ${quantity}): ${error instanceof Error ? error.message : String(error)}`;
    return new CommunicationError(message);
  }

  /**
   * Update the connection state and emit events
   * @param state New connection state
   */
  private _updateConnectionState(state: ConnectionState): void {
    if (this._connectionState === state) {
      return;
    }

    this._connectionState = state;
    this.emit(ModbusRTUClientEvent.STATE_CHANGE, state);
  }
}