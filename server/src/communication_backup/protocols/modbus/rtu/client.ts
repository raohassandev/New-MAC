/**
 * Modbus RTU client implementation
 */
import { EventEmitter } from 'events';
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
import { Protocol } from '../../../core/protocol.interface';
import { RTUConnection, RTUConnectionEvent } from './connection';
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
  convertError,
} from '../../../core/errors';

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
 * Modbus RTU client implementation
 */
export class ModbusRTUClient extends EventEmitter implements Protocol {
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
