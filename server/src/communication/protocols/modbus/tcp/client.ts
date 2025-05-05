/**
 * Modbus TCP client implementation
 */
import { EventEmitter } from 'events';
import { 
  ConnectionOptions, 
  ConnectionState, 
  DataType, 
  ModbusRequestOptions, 
  Parameter, 
  RegisterType,
  RequestResult
} from '../../../../core/types';
import { Protocol, RawOperations } from '../../../../core/protocol.interface';
import { 
  createConnectionStateEvent, 
  createDataEvent, 
  createEvent, 
  EventSource, 
  EventType 
} from '../../../../core/events';
import { ModbusTcpConnection, ModbusTcpConnectionOptions } from './connection';
import { 
  ModbusFunctionCode,
  getReadFunctionCode,
  getWriteSingleFunctionCode,
  getWriteMultipleFunctionCode
} from '../common/function-codes';
import { ModbusPDU } from '../common/pdu';
import { convertFromRegisters, convertToRegisters, getDataTypeSize } from '../common/data-types';
import { createError, ModbusError, ValidationError } from '../../../../core/errors';

/**
 * Modbus TCP client configuration
 */
export interface ModbusTcpClientConfig {
  host: string;
  port?: number;
  unitId?: number;
  connectionOptions?: ConnectionOptions;
}

/**
 * Modbus TCP client implementation
 */
export class ModbusTcpClient extends EventEmitter implements Protocol, RawOperations {
  readonly name: string = 'modbus-tcp';
  private connection: ModbusTcpConnection;
  private config: ModbusTcpClientConfig;
  private defaultUnitId: number;
  
  /**
   * Create a new Modbus TCP client
   * @param config Client configuration
   */
  constructor(config: ModbusTcpClientConfig) {
    super();
    this.config = config;
    this.defaultUnitId = config.unitId || 1;
    
    // Create connection
    const connectionOptions: ModbusTcpConnectionOptions = {
      host: config.host,
      port: config.port,
      timeout: config.connectionOptions?.timeout,
      retries: config.connectionOptions?.retries,
      retryInterval: config.connectionOptions?.retryInterval,
      autoReconnect: config.connectionOptions?.autoReconnect,
    };
    
    this.connection = new ModbusTcpConnection(connectionOptions);
    
    // Forward connection events
    this.connection.on('connecting', () => {
      this.emit('connecting');
      this.emit(EventType.CONNECTING, createConnectionStateEvent(
        this.name,
        ConnectionState.CONNECTING
      ));
    });
    
    this.connection.on('connected', () => {
      this.emit('connected');
      this.emit(EventType.CONNECTED, createConnectionStateEvent(
        this.name,
        ConnectionState.CONNECTED
      ));
    });
    
    this.connection.on('disconnected', (hadError) => {
      this.emit('disconnected', hadError);
      this.emit(EventType.DISCONNECTED, createConnectionStateEvent(
        this.name,
        ConnectionState.DISCONNECTED,
        hadError ? new Error('Connection closed with error') : undefined
      ));
    });
    
    this.connection.on('error', (err) => {
      this.emit('error', err);
      this.emit(EventType.ERROR, createEvent(
        EventType.ERROR,
        this.name,
        err
      ));
    });
  }
  
  /**
   * Get the current connection state
   */
  get connectionState(): ConnectionState {
    return this.connection.connectionState;
  }
  
  /**
   * Get whether the connection is established
   */
  get isConnected(): boolean {
    return this.connection.isConnected;
  }
  
  /**
   * Connect to the Modbus TCP server
   * @param options Optional connection options
   */
  async connect(options?: ConnectionOptions): Promise<void> {
    // Update connection options if provided
    if (options) {
      this.connection.autoReconnect = options.autoReconnect ?? this.connection.autoReconnect;
    }
    
    return this.connection.connect();
  }
  
  /**
   * Disconnect from the Modbus TCP server
   */
  async disconnect(): Promise<void> {
    return this.connection.disconnect();
  }
  
  /**
   * Read a single parameter
   * @param parameter Parameter to read
   */
  async readParameter(parameter: Parameter): Promise<RequestResult> {
    try {
      const { registerType, address, dataType, byteOrder } = parameter;
      
      // Determine the number of registers to read
      const registersToRead = getDataTypeSize(dataType, parameter.length);
      
      // Read the registers
      const result = await this.readRegisters(
        registerType,
        address,
        registersToRead
      );
      
      if (!result.success || !result.data) {
        return result;
      }
      
      // Convert the registers to the desired data type
      const registers: number[] = [];
      for (let i = 0; i < result.data.length; i += 2) {
        if (i + 1 < result.data.length) {
          registers.push(result.data.readUInt16BE(i));
        }
      }
      
      // Convert the registers to the parameter's data type
      const value = convertFromRegisters(registers, dataType, byteOrder);
      
      // Apply scaling if specified
      const scaledValue = parameter.scaling ? value * parameter.scaling : value;
      
      return {
        ...result,
        data: scaledValue
      };
    } catch (error) {
      return {
        success: false,
        error: createError(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Read multiple parameters
   * @param parameters Parameters to read
   */
  async readParameters(parameters: Parameter[]): Promise<RequestResult[]> {
    // Group parameters by register type and address range to optimize reads
    const groups = this.groupParametersByRegisterRange(parameters);
    
    const results: RequestResult[] = [];
    
    // Read each group of parameters
    for (const group of groups) {
      try {
        // Read the registers for this group
        const result = await this.readRegisters(
          group.registerType,
          group.startAddress,
          group.length
        );
        
        if (!result.success || !result.data) {
          // Add failed result for each parameter in the group
          for (const param of group.parameters) {
            results.push({
              success: false,
              error: result.error || new Error('Failed to read registers'),
              timestamp: result.timestamp
            });
          }
          continue;
        }
        
        // Convert the buffer to register values
        const registers: number[] = [];
        for (let i = 0; i < result.data.length; i += 2) {
          if (i + 1 < result.data.length) {
            registers.push(result.data.readUInt16BE(i));
          }
        }
        
        // Process each parameter in the group
        for (const param of group.parameters) {
          try {
            // Calculate the offset of this parameter in the register array
            const offset = param.address - group.startAddress;
            
            // Get the number of registers needed for this parameter
            const size = getDataTypeSize(param.dataType, param.length);
            
            // Extract the registers for this parameter
            const paramRegisters = registers.slice(offset, offset + size);
            
            // Convert the registers to the parameter's data type
            const value = convertFromRegisters(paramRegisters, param.dataType, param.byteOrder);
            
            // Apply scaling if specified
            const scaledValue = param.scaling ? value * param.scaling : value;
            
            results.push({
              success: true,
              data: scaledValue,
              timestamp: result.timestamp,
              duration: result.duration
            });
          } catch (error) {
            results.push({
              success: false,
              error: createError(error),
              timestamp: result.timestamp
            });
          }
        }
      } catch (error) {
        // Add failed result for each parameter in the group
        for (const param of group.parameters) {
          results.push({
            success: false,
            error: createError(error),
            timestamp: new Date()
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Write a value to a parameter
   * @param parameter Parameter to write to
   * @param value Value to write
   */
  async writeParameter(parameter: Parameter, value: any): Promise<RequestResult> {
    try {
      const { registerType, address, dataType, byteOrder } = parameter;
      
      // Validate write permission
      if (parameter.readOnly) {
        throw new ValidationError(`Parameter ${parameter.name} is read-only`);
      }
      
      // Validate register type (can't write to input registers or discrete inputs)
      if (registerType === RegisterType.INPUT_REGISTER || registerType === RegisterType.DISCRETE_INPUT) {
        throw new ValidationError(`Cannot write to ${registerType} register type`);
      }
      
      // Apply scaling if specified
      const scaledValue = parameter.scaling ? value / parameter.scaling : value;
      
      // Convert the value to registers
      const registers = convertToRegisters(scaledValue, dataType, byteOrder);
      
      // Write the registers
      if (registers.length === 1) {
        // Single register/coil
        if (registerType === RegisterType.COIL) {
          return await this.writeSingleRegister(registerType, address, Boolean(registers[0]));
        } else {
          return await this.writeSingleRegister(registerType, address, registers[0]);
        }
      } else {
        // Multiple registers/coils
        return await this.writeMultipleRegisters(registerType, address, registers);
      }
    } catch (error) {
      return {
        success: false,
        error: createError(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Write values to multiple parameters
   * @param parameters Parameters to write to
   * @param values Values to write
   */
  async writeParameters(parameters: Parameter[], values: any[]): Promise<RequestResult[]> {
    if (parameters.length !== values.length) {
      throw new ValidationError('Number of parameters and values must match');
    }
    
    const results: RequestResult[] = [];
    
    // Write each parameter individually
    // TODO: Optimize by grouping writes where possible
    for (let i = 0; i < parameters.length; i++) {
      results.push(await this.writeParameter(parameters[i], values[i]));
    }
    
    return results;
  }
  
  /**
   * Read registers
   * @param registerType Register type
   * @param startAddress Starting address
   * @param length Number of registers to read
   * @param unitId Unit/slave ID
   */
  async readRegisters(
    registerType: RegisterType,
    startAddress: number,
    length: number,
    unitId: number = this.defaultUnitId
  ): Promise<RequestResult<Buffer>> {
    try {
      const functionCode = getReadFunctionCode(registerType);
      let pdu: Buffer;
      
      switch (functionCode) {
        case ModbusFunctionCode.READ_COILS:
          pdu = ModbusPDU.readCoils(startAddress, length);
          break;
        case ModbusFunctionCode.READ_DISCRETE_INPUTS:
          pdu = ModbusPDU.readDiscreteInputs(startAddress, length);
          break;
        case ModbusFunctionCode.READ_HOLDING_REGISTERS:
          pdu = ModbusPDU.readHoldingRegisters(startAddress, length);
          break;
        case ModbusFunctionCode.READ_INPUT_REGISTERS:
          pdu = ModbusPDU.readInputRegisters(startAddress, length);
          break;
        default:
          throw new Error(`Unsupported function code: ${functionCode}`);
      }
      
      const startTime = Date.now();
      const response = await this.connection.sendRequest(pdu, unitId);
      const duration = Date.now() - startTime;
      
      // Extract the data based on the function code
      const byteCount = response.readUInt8(0);
      const data = response.slice(1, 1 + byteCount);
      
      return {
        success: true,
        data,
        timestamp: new Date(),
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: createError(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Write a single register/coil
   * @param registerType Register type
   * @param address Register address
   * @param value Value to write
   * @param unitId Unit/slave ID
   */
  async writeSingleRegister(
    registerType: RegisterType,
    address: number,
    value: number | boolean,
    unitId: number = this.defaultUnitId
  ): Promise<RequestResult> {
    try {
      const functionCode = getWriteSingleFunctionCode(registerType);
      let pdu: Buffer;
      
      switch (functionCode) {
        case ModbusFunctionCode.WRITE_SINGLE_COIL:
          pdu = ModbusPDU.writeSingleCoil(address, Boolean(value));
          break;
        case ModbusFunctionCode.WRITE_SINGLE_REGISTER:
          if (typeof value !== 'number') {
            throw new ValidationError('Value must be a number for holding registers');
          }
          pdu = ModbusPDU.writeSingleRegister(address, value);
          break;
        default:
          throw new Error(`Unsupported function code: ${functionCode}`);
      }
      
      const startTime = Date.now();
      await this.connection.sendRequest(pdu, unitId);
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        timestamp: new Date(),
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: createError(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Write multiple registers/coils
   * @param registerType Register type
   * @param startAddress Starting address
   * @param values Values to write
   * @param unitId Unit/slave ID
   */
  async writeMultipleRegisters(
    registerType: RegisterType,
    startAddress: number,
    values: (number | boolean)[],
    unitId: number = this.defaultUnitId
  ): Promise<RequestResult> {
    try {
      const functionCode = getWriteMultipleFunctionCode(registerType);
      let pdu: Buffer;
      
      switch (functionCode) {
        case ModbusFunctionCode.WRITE_MULTIPLE_COILS:
          pdu = ModbusPDU.writeMultipleCoils(
            startAddress,
            values.map(v => Boolean(v))
          );
          break;
        case ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS:
          if (!values.every(v => typeof v === 'number')) {
            throw new ValidationError('All values must be numbers for holding registers');
          }
          pdu = ModbusPDU.writeMultipleRegisters(
            startAddress,
            values as number[]
          );
          break;
        default:
          throw new Error(`Unsupported function code: ${functionCode}`);
      }
      
      const startTime = Date.now();
      await this.connection.sendRequest(pdu, unitId);
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        timestamp: new Date(),
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: createError(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Execute a custom function code
   * @param functionCode Function code
   * @param data Data buffer
   * @param unitId Unit/slave ID
   */
  async executeCustomFunction(
    functionCode: number,
    data: Buffer,
    unitId: number = this.defaultUnitId
  ): Promise<RequestResult<Buffer>> {
    try {
      // Create PDU
      const pdu = Buffer.alloc(data.length + 1);
      pdu.writeUInt8(functionCode, 0);
      data.copy(pdu, 1);
      
      const startTime = Date.now();
      const response = await this.connection.sendRequest(pdu, unitId);
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: response,
        timestamp: new Date(),
        duration
      };
    } catch (error) {
      return {
        success: false,
        error: createError(error),
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Group parameters by register type and address range
   * This optimizes read operations by combining adjacent registers
   * @param parameters Parameters to group
   */
  private groupParametersByRegisterRange(parameters: Parameter[]): Array<{
    registerType: RegisterType;
    startAddress: number;
    length: number;
    parameters: Parameter[];
  }> {
    const groups: Array<{
      registerType: RegisterType;
      startAddress: number;
      endAddress: number;
      parameters: Parameter[];
    }> = [];
    
    // Sort parameters by register type and address
    const sortedParams = [...parameters].sort((a, b) => {
      if (a.registerType !== b.registerType) {
        return a.registerType.localeCompare(b.registerType);
      }
      return a.address - b.address;
    });
    
    // Group parameters by register type and address range
    for (const param of sortedParams) {
      const size = getDataTypeSize(param.dataType, param.length);
      const paramEndAddress = param.address + size - 1;
      
      // Find if this parameter can be added to an existing group
      const existingGroup = groups.find(g => 
        g.registerType === param.registerType && 
        // Check if the parameter is adjacent to or overlaps with the group
        (param.address <= g.endAddress + 1)
      );
      
      if (existingGroup) {
        // Extend the group if needed
        existingGroup.endAddress = Math.max(existingGroup.endAddress, paramEndAddress);
        existingGroup.parameters.push(param);
      } else {
        // Create a new group
        groups.push({
          registerType: param.registerType,
          startAddress: param.address,
          endAddress: paramEndAddress,
          parameters: [param]
        });
      }
    }
    
    // Convert end address to length
    return groups.map(g => ({
      registerType: g.registerType,
      startAddress: g.startAddress,
      length: g.endAddress - g.startAddress + 1,
      parameters: g.parameters
    }));
  }
  
  // EventSource interface implementation
  on(type: string, listener: Function): this {
    return super.on(type, listener);
  }
  
  off(type: string, listener: Function): this {
    return super.off(type, listener);
  }
  
  once(type: string, listener: Function): this {
    return super.once(type, listener);
  }
  
  removeAllListeners(type?: string): this {
    return super.removeAllListeners(type);
  }
}