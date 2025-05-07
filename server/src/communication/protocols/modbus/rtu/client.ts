import { Protocol, RawOperations } from '../../../../core/protocol.interface';
import {
  DataType,
  RegisterType,
  ParameterValue,
  ReadResult,
  WriteResult,
  RtuConnectionOptions,
  ConnectionState,
} from '../../../../core/types';
import { ModbusError, ParameterError, ConnectionError, createError } from '../../../../core/errors';
import { EventEmitter } from '../../../../core/events';
import { ModbusRtuConnection } from './connection';
import {
  FunctionCode,
  registerTypeToReadFunctionCode,
  registerTypeToWriteFunctionCode,
  isWritable,
  createExceptionFromCode,
} from '../common/function-codes';
import {
  convertBufferToType,
  convertValueToBuffer,
  countRegistersForDataType,
  getRegisterCount,
} from '../common/data-types';
import { groupParameters, optimizeRegisterReads } from '../common/utils';

/**
 * Create an error from an exception (handles any type of exception)
 */
function createErrorFromException(error: any): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error(
    typeof error === 'object' ? JSON.stringify(error) : `Unknown error: ${String(error)}`,
  );
}

/**
 * Modbus RTU client implementation of the Protocol interface
 */
export class ModbusRtuClient extends EventEmitter implements Protocol, RawOperations {
  // Implement Protocol properties
  name: string = 'ModbusRTU';
  connectionState: ConnectionState = ConnectionState.DISCONNECTED;

  // Add missing event methods
  on(type: string, listener: Function): this {
    super.on(type, listener);
    return this;
  }

  off(type: string, listener: Function): this {
    super.off(type, listener);
    return this;
  }

  once(type: string, listener: Function): this {
    super.once(type, listener);
    return this;
  }

  removeAllListeners(type?: string): this {
    super.removeAllListeners(type);
    return this;
  }
  private connection: ModbusRtuConnection;
  private slaveAddress: number;
  private connected: boolean = false;

  /**
   * Create a Modbus RTU client
   * @param options Connection options
   * @param slaveAddress Slave address (1-247)
   */
  constructor(options: RtuConnectionOptions, slaveAddress: number = 1) {
    super();

    if (slaveAddress < 1 || slaveAddress > 247) {
      throw new Error(`Invalid slave address: ${slaveAddress}. Valid range is 1-247.`);
    }

    this.slaveAddress = slaveAddress;
    this.connection = new ModbusRtuConnection(options);

    // Forward connection events
    this.connection.on('connected', () => {
      this.connected = true;
      this.connectionState = ConnectionState.CONNECTED;
      this.emit('connected');
    });

    this.connection.on('disconnected', () => {
      this.connected = false;
      this.connectionState = ConnectionState.DISCONNECTED;
      this.emit('disconnected');
    });

    this.connection.on('error', error => {
      this.connectionState = ConnectionState.ERROR;
      this.emit('error', error);
    });

    this.connection.on('stateChanged', state => {
      this.connectionState = state;
      this.emit('stateChanged', state);
    });
  }

  /**
   * Check if client is connected
   */
  public get isConnected(): boolean {
    return this.connected;
  }

  /**
   * ReadParameter from the Protocol interface
   * @param parameter Parameter to read
   */
  public async readParameter(parameter: any): Promise<any> {
    throw new Error('Method not implemented yet');
  }

  /**
   * ReadParameters from the Protocol interface
   * @param parameters Parameters to read
   */
  public async readParameters(parameters: any[]): Promise<any[]> {
    throw new Error('Method not implemented yet');
  }

  /**
   * WriteParameter from the Protocol interface
   * @param parameter Parameter to write
   * @param value Value to write
   */
  public async writeParameter(parameter: any, value: any): Promise<any> {
    throw new Error('Method not implemented yet');
  }

  /**
   * WriteParameters from the Protocol interface
   * @param parameters Parameters to write
   * @param values Values to write
   */
  public async writeParameters(parameters: any[], values: any[]): Promise<any[]> {
    throw new Error('Method not implemented yet');
  }

  /**
   * ReadRegisters from the RawOperations interface
   */
  public async readRegisters(
    registerType: any,
    startAddress: number,
    length: number,
    unitId?: number,
  ): Promise<any> {
    throw new Error('Method not implemented yet');
  }

  /**
   * WriteSingleRegister from the RawOperations interface
   */
  public async writeSingleRegister(
    registerType: any,
    address: number,
    value: any,
    unitId?: number,
  ): Promise<any> {
    throw new Error('Method not implemented yet');
  }

  /**
   * WriteMultipleRegisters from the RawOperations interface
   */
  public async writeMultipleRegisters(
    registerType: any,
    startAddress: number,
    values: any[],
    unitId?: number,
  ): Promise<any> {
    throw new Error('Method not implemented yet');
  }

  /**
   * ExecuteCustomFunction from the RawOperations interface
   */
  public async executeCustomFunction(
    functionCode: number,
    data: Buffer,
    unitId?: number,
  ): Promise<any> {
    throw new Error('Method not implemented yet');
  }

  /**
   * Connect to the Modbus RTU slave
   */
  public async connect(): Promise<void> {
    try {
      await this.connection.connect();
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Disconnect from the Modbus RTU slave
   */
  public async disconnect(): Promise<void> {
    try {
      await this.connection.disconnect();
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Read a parameter from the device
   * @param address Register address (0-65535)
   * @param registerType Register type
   * @param dataType Data type
   */
  public async readParameter(
    address: number,
    registerType: RegisterType,
    dataType: DataType,
  ): Promise<ParameterValue> {
    try {
      const registerCount = countRegistersForDataType(dataType);
      const result = await this.readRegisters(address, registerCount, registerType);
      return convertBufferToType(result.buffer, dataType, 0);
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Read multiple parameters from the device
   * @param parameters Array of parameters to read
   * @param optimize Whether to optimize reads by grouping adjacent registers
   */
  public async readParameters(
    parameters: Array<{
      address: number;
      registerType: RegisterType;
      dataType: DataType;
    }>,
    optimize: boolean = true,
  ): Promise<Array<ParameterValue>> {
    if (parameters.length === 0) {
      return [];
    }

    try {
      // Group parameters by register type for optimized reading
      if (optimize) {
        const groupedParams = groupParameters(parameters);
        const results: Array<ParameterValue> = [];

        // Process each register type group
        for (const regType of Object.keys(groupedParams)) {
          const registerType = parseInt(regType) as RegisterType;
          const paramsOfType = groupedParams[registerType];

          // Optimize reads by combining adjacent registers
          const readOperations = optimizeRegisterReads(paramsOfType);

          // Execute each optimized read operation
          for (const operation of readOperations) {
            const result = await this.readRegisters(
              operation.startAddress,
              operation.registerCount,
              registerType,
            );

            // Extract individual parameter values from the result buffer
            for (const param of operation.parameters) {
              const offset = (param.address - operation.startAddress) * 2;
              const value = convertBufferToType(result.buffer, param.dataType, offset);

              // Store the parameter at its original index
              results[parameters.indexOf(param)] = value;
            }
          }
        }

        return results;
      } else {
        // Read parameters individually without optimization
        const promises = parameters.map(param =>
          this.readParameter(param.address, param.registerType, param.dataType),
        );

        return Promise.all(promises);
      }
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Write a parameter to the device
   * @param address Register address (0-65535)
   * @param registerType Register type (must be writable)
   * @param dataType Data type
   * @param value Value to write
   */
  public async writeParameter(
    address: number,
    registerType: RegisterType,
    dataType: DataType,
    value: ParameterValue,
  ): Promise<WriteResult> {
    // Check if register type is writable
    if (!isWritable(registerType)) {
      throw new ParameterError(`Register type ${registerType} is not writable`);
    }

    try {
      const registerCount = countRegistersForDataType(dataType);
      const buffer = convertValueToBuffer(value, dataType);

      const result = await this.writeRegisters(address, buffer, registerType);

      return {
        address,
        registerType,
        registerCount: registerCount,
        success: result.success,
      };
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Write multiple parameters to the device
   * @param parameters Array of parameters to write
   */
  public async writeParameters(
    parameters: Array<{
      address: number;
      registerType: RegisterType;
      dataType: DataType;
      value: ParameterValue;
    }>,
  ): Promise<Array<WriteResult>> {
    if (parameters.length === 0) {
      return [];
    }

    try {
      // Write parameters individually
      // (optimizing writes is more complex and less common than optimizing reads)
      const promises = parameters.map(param =>
        this.writeParameter(param.address, param.registerType, param.dataType, param.value),
      );

      return Promise.all(promises);
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Execute a custom function code
   * @param functionCode Function code
   * @param data Request data
   */
  public async executeCustomFunction(functionCode: number, data: Buffer): Promise<Buffer> {
    try {
      return await this.connection.sendRequest(this.slaveAddress, functionCode, data);
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Read registers from the device (low-level API)
   * @param address Starting register address (0-65535)
   * @param count Number of registers to read
   * @param registerType Register type
   */
  public async readRegisters(
    address: number,
    count: number,
    registerType: RegisterType,
  ): Promise<ReadResult> {
    // Validate parameters
    if (address < 0 || address > 65535) {
      throw new ParameterError(`Invalid register address: ${address}. Valid range is 0-65535.`);
    }

    if (count < 1 || count > 125) {
      throw new ParameterError(`Invalid register count: ${count}. Valid range is 1-125.`);
    }

    // Determine function code based on register type
    const functionCode = registerTypeToReadFunctionCode(registerType);
    if (functionCode === FunctionCode.INVALID) {
      throw new ParameterError(`Invalid or unsupported register type: ${registerType}`);
    }

    try {
      // Create request data
      const requestData = Buffer.alloc(4);
      requestData.writeUInt16BE(address, 0);

      // For coils and discrete inputs, count is in bits
      if (registerType === RegisterType.COIL || registerType === RegisterType.DISCRETE_INPUT) {
        requestData.writeUInt16BE(count, 2);
      } else {
        requestData.writeUInt16BE(count, 2);
      }

      // Send request
      const response = await this.connection.sendRequest(
        this.slaveAddress,
        functionCode,
        requestData,
      );

      // Process response
      if (response.length < 1) {
        throw new ModbusError('Invalid response: too short');
      }

      // Check for exception response
      if ((response[0] & 0x80) !== 0) {
        const exceptionCode = response[1];
        throw createExceptionFromCode(exceptionCode);
      }

      // Extract data from response
      const byteCount = response[0];
      if (response.length < byteCount + 1) {
        throw new ModbusError(
          `Invalid response: expected ${byteCount + 1} bytes, got ${response.length}`,
        );
      }

      const responseData = response.slice(1, byteCount + 1);

      return {
        address,
        registerType,
        registerCount: count,
        buffer: responseData,
      };
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Write registers to the device (low-level API)
   * @param address Starting register address (0-65535)
   * @param data Data to write
   * @param registerType Register type (must be writable)
   */
  public async writeRegisters(
    address: number,
    data: Buffer,
    registerType: RegisterType,
  ): Promise<WriteResult> {
    // Validate parameters
    if (address < 0 || address > 65535) {
      throw new ParameterError(`Invalid register address: ${address}. Valid range is 0-65535.`);
    }

    // Check if register type is writable
    if (!isWritable(registerType)) {
      throw new ParameterError(`Register type ${registerType} is not writable`);
    }

    // Determine function code and create request based on register type and data length
    let functionCode: FunctionCode;
    let requestData: Buffer;
    let registerCount = 0;

    if (registerType === RegisterType.COIL) {
      if (data.length === 1) {
        // Single coil
        functionCode = FunctionCode.WRITE_SINGLE_COIL;
        requestData = Buffer.alloc(4);
        requestData.writeUInt16BE(address, 0);
        // For single coil, 0xFF00 = ON, 0x0000 = OFF
        requestData.writeUInt16BE(data[0] ? 0xff00 : 0x0000, 2);
        registerCount = 1;
      } else {
        // Multiple coils
        functionCode = FunctionCode.WRITE_MULTIPLE_COILS;
        const bitCount = data.length * 8;
        const byteCount = Math.ceil(bitCount / 8);
        requestData = Buffer.alloc(5 + byteCount);
        requestData.writeUInt16BE(address, 0);
        requestData.writeUInt16BE(bitCount, 2);
        requestData.writeUInt8(byteCount, 4);
        data.copy(requestData, 5);
        registerCount = bitCount;
      }
    } else if (registerType === RegisterType.HOLDING_REGISTER) {
      if (data.length === 2) {
        // Single register
        functionCode = FunctionCode.WRITE_SINGLE_REGISTER;
        requestData = Buffer.alloc(4);
        requestData.writeUInt16BE(address, 0);
        data.copy(requestData, 2);
        registerCount = 1;
      } else {
        // Multiple registers
        functionCode = FunctionCode.WRITE_MULTIPLE_REGISTERS;
        const byteCount = data.length;
        registerCount = byteCount / 2;
        requestData = Buffer.alloc(5 + byteCount);
        requestData.writeUInt16BE(address, 0);
        requestData.writeUInt16BE(registerCount, 2);
        requestData.writeUInt8(byteCount, 4);
        data.copy(requestData, 5);
      }
    } else {
      throw new ParameterError(`Invalid or unsupported register type for writing: ${registerType}`);
    }

    try {
      // Send request
      const response = await this.connection.sendRequest(
        this.slaveAddress,
        functionCode,
        requestData,
      );

      // Process response
      if (response.length < 1) {
        throw new ModbusError('Invalid response: too short');
      }

      // Check for exception response
      if ((response[0] & 0x80) !== 0) {
        const exceptionCode = response[1];
        throw createExceptionFromCode(exceptionCode);
      }

      // For successful write operations, return success
      return {
        address,
        registerType,
        registerCount,
        success: true,
      };
    } catch (error) {
      throw createErrorFromException(error);
    }
  }

  /**
   * Read coils from the device
   * @param address Starting coil address (0-65535)
   * @param count Number of coils to read (1-2000)
   */
  public async readCoils(address: number, count: number): Promise<boolean[]> {
    const result = await this.readRegisters(address, count, RegisterType.COIL);
    const coils: boolean[] = [];

    for (let i = 0; i < count; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;

      if (byteIndex < result.buffer.length) {
        coils.push((result.buffer[byteIndex] & (1 << bitIndex)) !== 0);
      } else {
        break;
      }
    }

    return coils;
  }

  /**
   * Read discrete inputs from the device
   * @param address Starting input address (0-65535)
   * @param count Number of inputs to read (1-2000)
   */
  public async readDiscreteInputs(address: number, count: number): Promise<boolean[]> {
    const result = await this.readRegisters(address, count, RegisterType.DISCRETE_INPUT);
    const inputs: boolean[] = [];

    for (let i = 0; i < count; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;

      if (byteIndex < result.buffer.length) {
        inputs.push((result.buffer[byteIndex] & (1 << bitIndex)) !== 0);
      } else {
        break;
      }
    }

    return inputs;
  }

  /**
   * Read holding registers from the device
   * @param address Starting register address (0-65535)
   * @param count Number of registers to read (1-125)
   */
  public async readHoldingRegisters(address: number, count: number): Promise<number[]> {
    const result = await this.readRegisters(address, count, RegisterType.HOLDING_REGISTER);
    const registers: number[] = [];

    for (let i = 0; i < count; i++) {
      const byteIndex = i * 2;

      if (byteIndex + 1 < result.buffer.length) {
        registers.push(result.buffer.readUInt16BE(byteIndex));
      } else {
        break;
      }
    }

    return registers;
  }

  /**
   * Read input registers from the device
   * @param address Starting register address (0-65535)
   * @param count Number of registers to read (1-125)
   */
  public async readInputRegisters(address: number, count: number): Promise<number[]> {
    const result = await this.readRegisters(address, count, RegisterType.INPUT_REGISTER);
    const registers: number[] = [];

    for (let i = 0; i < count; i++) {
      const byteIndex = i * 2;

      if (byteIndex + 1 < result.buffer.length) {
        registers.push(result.buffer.readUInt16BE(byteIndex));
      } else {
        break;
      }
    }

    return registers;
  }

  /**
   * Write a single coil to the device
   * @param address Coil address (0-65535)
   * @param value Coil value (true = ON, false = OFF)
   */
  public async writeSingleCoil(address: number, value: boolean): Promise<WriteResult> {
    const buffer = Buffer.alloc(1);
    buffer.writeUInt8(value ? 1 : 0, 0);

    return this.writeRegisters(address, buffer, RegisterType.COIL);
  }

  /**
   * Write multiple coils to the device
   * @param address Starting coil address (0-65535)
   * @param values Array of coil values (true = ON, false = OFF)
   */
  public async writeMultipleCoils(address: number, values: boolean[]): Promise<WriteResult> {
    if (values.length === 0) {
      throw new ParameterError('No values provided');
    }

    if (values.length > 1968) {
      throw new ParameterError(`Too many values: ${values.length}. Maximum is 1968.`);
    }

    const byteCount = Math.ceil(values.length / 8);
    const buffer = Buffer.alloc(byteCount);

    for (let i = 0; i < values.length; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;

      if (values[i]) {
        buffer[byteIndex] |= 1 << bitIndex;
      }
    }

    return this.writeRegisters(address, buffer, RegisterType.COIL);
  }

  /**
   * Write a single holding register to the device
   * @param address Register address (0-65535)
   * @param value Register value (0-65535)
   */
  public async writeSingleRegister(address: number, value: number): Promise<WriteResult> {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(value, 0);

    return this.writeRegisters(address, buffer, RegisterType.HOLDING_REGISTER);
  }

  /**
   * Write multiple holding registers to the device
   * @param address Starting register address (0-65535)
   * @param values Array of register values (0-65535)
   */
  public async writeMultipleRegisters(address: number, values: number[]): Promise<WriteResult> {
    if (values.length === 0) {
      throw new ParameterError('No values provided');
    }

    if (values.length > 123) {
      throw new ParameterError(`Too many values: ${values.length}. Maximum is 123.`);
    }

    const buffer = Buffer.alloc(values.length * 2);

    for (let i = 0; i < values.length; i++) {
      buffer.writeUInt16BE(values[i], i * 2);
    }

    return this.writeRegisters(address, buffer, RegisterType.HOLDING_REGISTER);
  }

  /**
   * Change the slave address for subsequent requests
   * @param slaveAddress New slave address (1-247)
   */
  public setSlaveAddress(slaveAddress: number): void {
    if (slaveAddress < 1 || slaveAddress > 247) {
      throw new Error(`Invalid slave address: ${slaveAddress}. Valid range is 1-247.`);
    }

    this.slaveAddress = slaveAddress;
  }

  /**
   * Get the current slave address
   */
  public getSlaveAddress(): number {
    return this.slaveAddress;
  }
}
