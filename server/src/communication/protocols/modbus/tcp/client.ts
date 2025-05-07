/**
 * Modbus TCP client implementation
 */
import { EventEmitter } from 'events';
import * as net from 'net';
import {
  Parameter,
  RequestResult,
  ReadOptions,
  WriteOptions,
  ModbusTCPOptions,
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
 * Events emitted by the TCP connection
 */
enum TCPConnectionEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  DATA = 'data',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

/**
 * Events emitted by the Modbus TCP client
 */
export enum ModbusTCPClientEvent {
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
 * Manages TCP connection for Modbus
 */
class TCPConnection extends EventEmitter {
  private _client: net.Socket | null = null;
  private _connected = false;
  private _connectionPromise: Promise<void> | null = null;
  private _disconnectionPromise: Promise<void> | null = null;
  private _debugMode = false;
  private _options: ModbusTCPOptions;
  private _transactionId = 0;

  // Default connection options
  private static readonly DEFAULT_OPTIONS: Partial<ModbusTCPOptions> = {
    port: 502,
    timeout: 5000,
    retries: 3,
    retryInterval: 1000,
    autoReconnect: true,
    reconnectInterval: 5000,
  };

  /**
   * Create a new TCP connection
   * @param options Connection options
   */
  constructor(options: ModbusTCPOptions) {
    super();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);

    // Merge default options with provided options
    this._options = {
      ...TCPConnection.DEFAULT_OPTIONS,
      ...options,
    };

    if (!this._options.host) {
      throw new Error('TCP host is required');
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
   * Get the current transaction ID and increment it
   * @returns Current transaction ID
   */
  public getNextTransactionId(): number {
    // Increment and wrap around at 65535
    this._transactionId = (this._transactionId + 1) % 65536;
    return this._transactionId;
  }

  /**
   * Connect to the Modbus TCP server
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
    if (this._debugMode) {
      console.log(`[TCP] Connecting to ${this._options.host}:${this._options.port}...`);
    }

    let attempts = 0;
    let lastError: Error | null = null;

    // Try to connect with retries
    while (attempts <= this._options.retries!) {
      attempts++;

      try {
        await this._attemptConnect();

        // Connection successful
        this._connected = true;
        this.emit(TCPConnectionEvent.CONNECTED);

        if (this._debugMode) {
          console.log(`[TCP] Connected to ${this._options.host}:${this._options.port}`);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this._debugMode) {
          console.error(`[TCP] Connection attempt ${attempts} failed: ${lastError.message}`);
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
    const error = new ConnectionError(
      `Failed to connect to ${this._options.host}:${this._options.port} after ${attempts} attempts`,
      lastError || undefined,
    );

    this.emit(TCPConnectionEvent.ERROR, error);
    throw error;
  }

  /**
   * Attempt to connect once
   */
  private _attemptConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a new Socket
      this._client = new net.Socket();

      // Create timeout
      const connectionTimeout = setTimeout(() => {
        // Clean up listeners to avoid memory leaks
        this._client?.removeAllListeners();

        // Destroy the socket
        this._client?.destroy();
        this._client = null;

        // Reject with timeout error
        const error = new TimeoutError(
          `Connection timeout after ${this._options.timeout}ms`,
          this._options.timeout!,
        );

        reject(error);
      }, this._options.timeout);

      // Set up event handlers
      this._client.on('connect', () => {
        clearTimeout(connectionTimeout);

        // Set up data event handler
        this._client!.on('data', (data: Buffer) => {
          this.emit(TCPConnectionEvent.DATA, data);
        });

        // Set up error event handler
        this._client!.on('error', (error: Error) => {
          if (this._debugMode) {
            console.error(`[TCP] Socket error: ${error.message}`);
          }

          this.emit(
            TCPConnectionEvent.ERROR,
            new ConnectionError(`Socket error: ${error.message}`, error),
          );

          // If auto-reconnect is enabled, try to reconnect
          if (this._options.autoReconnect && this._connected) {
            this._handleDisconnect();

            setTimeout(() => {
              this.connect().catch(err => {
                if (this._debugMode) {
                  console.error(`[TCP] Auto-reconnect failed: ${err.message}`);
                }
              });
            }, this._options.reconnectInterval);
          }
        });

        // Set up close event handler
        this._client!.on('close', () => {
          this._handleDisconnect();
        });

        // Set up timeout event handler
        this._client!.on('timeout', () => {
          if (this._debugMode) {
            console.warn('[TCP] Socket timeout');
          }

          this.emit(TCPConnectionEvent.TIMEOUT);
        });

        // Set socket timeout
        this._client!.setTimeout(this._options.timeout!);

        resolve();
      });

      // Connect to the server
      this._client.connect({
        host: this._options.host,
        port: this._options.port,
      });

      // Handle connection errors
      this._client.on('error', (error: Error) => {
        clearTimeout(connectionTimeout);

        // Clean up
        this._client?.removeAllListeners();
        this._client?.destroy();
        this._client = null;

        reject(new ConnectionError(`Connection error: ${error.message}`, error));
      });
    });
  }

  /**
   * Handle socket disconnect
   */
  private _handleDisconnect(): void {
    // Clean up
    this._client?.removeAllListeners();
    this._client?.destroy();
    this._client = null;

    // Update state
    const wasConnected = this._connected;
    this._connected = false;

    // Only emit the event if we were previously connected
    if (wasConnected) {
      this.emit(TCPConnectionEvent.DISCONNECTED);

      if (this._debugMode) {
        console.log(`[TCP] Disconnected from ${this._options.host}:${this._options.port}`);
      }
    }
  }

  /**
   * Disconnect from the Modbus TCP server
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
      if (!this._client || !this._connected) {
        this._connected = false;
        resolve();
        return;
      }

      if (this._debugMode) {
        console.log(`[TCP] Disconnecting from ${this._options.host}:${this._options.port}...`);
      }

      // Set up one-time close event handler
      this._client.once('close', () => {
        this._handleDisconnect();
        resolve();
      });

      // End the connection
      this._client.end();

      // Set a timeout in case the close event doesn't fire
      setTimeout(() => {
        if (this._connected) {
          // Force destroy the socket
          this._client?.destroy();
          this._handleDisconnect();
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Check if connected to the Modbus TCP server
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this._connected && this._client !== null;
  }

  /**
   * Send data to the Modbus TCP server
   * @param data Data to send
   * @param timeout Timeout in milliseconds
   * @returns Promise that resolves with the response data
   */
  public async send(data: Buffer, timeout?: number): Promise<Buffer> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const effectiveTimeout = timeout || this._options.timeout!;

      // Create timeout
      let timeoutId: NodeJS.Timeout | null = null;

      if (effectiveTimeout > 0) {
        timeoutId = setTimeout(() => {
          // Remove the handler to avoid memory leaks
          this.removeListener(TCPConnectionEvent.DATA, dataHandler);

          const error = new TimeoutError(
            `Response timeout after ${effectiveTimeout}ms`,
            effectiveTimeout,
          );

          reject(error);
        }, effectiveTimeout);
      }

      // Extract the transaction ID from the data
      const transactionId = data.readUInt16BE(0);

      // Set up data handler
      const dataHandler = (response: Buffer) => {
        // Check if the response matches this request's transaction ID
        if (response.length >= 2 && response.readUInt16BE(0) === transactionId) {
          // Remove the handler and clear the timeout
          this.removeListener(TCPConnectionEvent.DATA, dataHandler);

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Resolve with the response
          resolve(response);
        }
      };

      // Add the data handler
      this.on(TCPConnectionEvent.DATA, dataHandler);

      // Send the data
      this._client!.write(data, error => {
        if (error) {
          // Remove the handler and clear the timeout
          this.removeListener(TCPConnectionEvent.DATA, dataHandler);

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Reject with the error
          reject(new ConnectionError(`Send error: ${error.message}`, error));
        }
      });
    });
  }
}

/**
 * Modbus TCP client implementation
 */
export class ModbusTCPClient extends EventEmitter {
  private _connection: TCPConnection;
  private _unitId: number = 1;
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private _debugMode: boolean = false;
  private _options: ModbusTCPOptions;

  // Keep track of the last request time for debugging
  private _lastRequestTime: number = 0;

  /**
   * Create a new Modbus TCP client
   * @param options Connection options
   */
  constructor(options: ModbusTCPOptions) {
    super();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);

    this._options = options;
    this._connection = new TCPConnection(options);
    this._unitId = options.unitId || 1;

    // Set up connection event handlers
    this._connection.on(TCPConnectionEvent.CONNECTED, () => {
      this._updateConnectionState(ConnectionState.CONNECTED);
      this.emit(ModbusTCPClientEvent.CONNECTED);
    });

    this._connection.on(TCPConnectionEvent.DISCONNECTED, () => {
      this._updateConnectionState(ConnectionState.DISCONNECTED);
      this.emit(ModbusTCPClientEvent.DISCONNECTED);
    });

    this._connection.on(TCPConnectionEvent.ERROR, (error: Error) => {
      this._updateConnectionState(ConnectionState.ERROR);
      this.emit(ModbusTCPClientEvent.ERROR, error);
    });

    this._connection.on(TCPConnectionEvent.TIMEOUT, () => {
      this.emit(ModbusTCPClientEvent.TIMEOUT);
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
   * Connect to the Modbus TCP server
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
      this.emit(ModbusTCPClientEvent.CONNECTING);

      await this._connection.connect();
    } catch (error) {
      this._updateConnectionState(ConnectionState.ERROR);

      const communicationError = convertError(error);
      this.emit(ModbusTCPClientEvent.ERROR, communicationError);

      throw communicationError;
    }
  }

  /**
   * Disconnect from the Modbus TCP server
   */
  public async disconnect(): Promise<void> {
    if (this._connectionState === ConnectionState.DISCONNECTED) {
      return;
    }

    try {
      await this._connection.disconnect();
    } catch (error) {
      const communicationError = convertError(error);
      this.emit(ModbusTCPClientEvent.ERROR, communicationError);

      throw communicationError;
    }
  }

  /**
   * Check if connected to the Modbus TCP server
   * @returns True if connected
   */
  public isConnected(): boolean {
    return this._connectionState === ConnectionState.CONNECTED && this._connection.isConnected();
  }

  /**
   * Read coils from the Modbus server
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
        response.slice(7), // Remove MBAP header
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
   * Read discrete inputs from the Modbus server
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
        response.slice(7), // Remove MBAP header
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
   * Read holding registers from the Modbus server
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
        response.slice(7), // Remove MBAP header
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
   * Read input registers from the Modbus server
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
        response.slice(7), // Remove MBAP header
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
   * Write a single coil to the Modbus server
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
        response.slice(7), // Remove MBAP header
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
   * Write a single register to the Modbus server
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
        response.slice(7), // Remove MBAP header
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
   * Write multiple coils to the Modbus server
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
        response.slice(7), // Remove MBAP header
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
   * Write multiple registers to the Modbus server
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
        response.slice(7), // Remove MBAP header
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
      name: 'Modbus TCP',
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
   * Send a Modbus TCP request
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

    // Get the next transaction ID
    const transactionId = this._connection.getNextTransactionId();

    // Create the MBAP header (Modbus Application Protocol header)
    const header = Buffer.alloc(7);
    header.writeUInt16BE(transactionId, 0); // Transaction ID
    header.writeUInt16BE(0, 2); // Protocol ID (0 for Modbus TCP)
    header.writeUInt16BE(pdu.length + 1, 4); // Length (PDU + Unit ID)
    header.writeUInt8(this._unitId, 6); // Unit ID

    // Combine the header and PDU
    const request = Buffer.concat([header, pdu]);

    // Log the request if debug mode is enabled
    if (this._debugMode) {
      const operation = getOperationDescription(
        functionCode,
        pdu.readUInt16BE(1), // address
        pdu.length > 4 ? pdu.readUInt16BE(3) : 1, // quantity
      );

      console.log(`[Modbus TCP] TX: ${operation} (Transaction ID: ${transactionId})`);
      console.log(`[Modbus TCP] Request: ${request.toString('hex')}`);
    }

    // Emit pre-request event
    this.emit(ModbusTCPClientEvent.PRE_REQUEST, functionCode, request);

    // Record the request time
    this._lastRequestTime = Date.now();

    try {
      // Send the request and wait for the response
      const response = await this._connection.send(request, timeout);

      // Log the response if debug mode is enabled
      if (this._debugMode) {
        const responseTime = Date.now() - this._lastRequestTime;
        console.log(
          `[Modbus TCP] RX: Response received in ${responseTime}ms (Transaction ID: ${transactionId})`,
        );
        console.log(`[Modbus TCP] Response: ${response.toString('hex')}`);
      }

      // Emit post-request event
      this.emit(ModbusTCPClientEvent.POST_REQUEST, functionCode, request, response);

      // Validate the response
      this._validateResponse(response, transactionId, functionCode);

      return response;
    } catch (error) {
      // Log the error if debug mode is enabled
      if (this._debugMode) {
        const responseTime = Date.now() - this._lastRequestTime;
        console.error(
          `[Modbus TCP] Error after ${responseTime}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Convert to an appropriate error type
      const communicationError = convertError(error);

      // Emit post-request event with error
      this.emit(ModbusTCPClientEvent.POST_REQUEST, functionCode, request, null, communicationError);

      // Re-throw the error
      throw communicationError;
    }
  }

  /**
   * Validate a Modbus TCP response
   * @param response Response buffer
   * @param transactionId Expected transaction ID
   * @param functionCode Expected function code
   */
  private _validateResponse(response: Buffer, transactionId: number, functionCode: number): void {
    // Check if the response is valid
    if (!response || response.length < 8) {
      throw new Error('Invalid response: too short');
    }

    // Check the transaction ID
    const responseTransactionId = response.readUInt16BE(0);
    if (responseTransactionId !== transactionId) {
      throw new Error(
        `Transaction ID mismatch: expected ${transactionId}, got ${responseTransactionId}`,
      );
    }

    // Check the protocol ID
    const protocolId = response.readUInt16BE(2);
    if (protocolId !== 0) {
      throw new Error(`Invalid protocol ID: ${protocolId}`);
    }

    // Check the unit ID
    const unitId = response.readUInt8(6);
    if (unitId !== this._unitId) {
      throw new Error(`Unit ID mismatch: expected ${this._unitId}, got ${unitId}`);
    }

    // Check the function code (bit 7 set indicates an exception)
    const responseFunctionCode = response.readUInt8(7);
    if (responseFunctionCode !== functionCode) {
      if ((responseFunctionCode & 0x80) === 0x80) {
        // It's an exception response
        if (response.length < 9) {
          throw new Error('Invalid exception response: too short');
        }

        const exceptionCode = response.readUInt8(8);
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
    this.emit(ModbusTCPClientEvent.STATE_CHANGE, state);
  }
}