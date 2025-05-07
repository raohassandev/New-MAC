/**
 * Protocol interface - Defines the contract for communication protocols
 */
import {
  ConnectionOptions,
  ConnectionState,
  Parameter,
  RegisterType,
  RequestResult,
} from './types';
import { EventSource } from './events';

/**
 * Protocol interface - Base interface for all communication protocols
 */
export interface Protocol extends EventSource {
  /**
   * Get the protocol name
   */
  readonly name: string;

  /**
   * Get the current connection state
   */
  readonly connectionState: ConnectionState;

  /**
   * Get whether the protocol is connected
   */
  readonly isConnected: boolean;

  /**
   * Connect to the device
   * @param options Optional connection options
   */
  connect(options?: ConnectionOptions): Promise<void>;

  /**
   * Disconnect from the device
   */
  disconnect(): Promise<void>;

  /**
   * Read a single parameter
   * @param parameter Parameter to read
   */
  readParameter(parameter: Parameter): Promise<RequestResult>;

  /**
   * Read multiple parameters
   * @param parameters Parameters to read
   */
  readParameters(parameters: Parameter[]): Promise<RequestResult[]>;

  /**
   * Write a value to a parameter
   * @param parameter Parameter to write to
   * @param value Value to write
   */
  writeParameter(parameter: Parameter, value: any): Promise<RequestResult>;

  /**
   * Write values to multiple parameters
   * @param parameters Parameters to write to
   * @param values Values to write
   */
  writeParameters(parameters: Parameter[], values: any[]): Promise<RequestResult[]>;
}

/**
 * Raw read/write operations exposed by the protocol
 */
export interface RawOperations {
  /**
   * Read registers
   * @param registerType Register type
   * @param startAddress Starting address
   * @param length Number of registers to read
   * @param unitId Unit/slave ID
   */
  readRegisters(
    registerType: RegisterType,
    startAddress: number,
    length: number,
    unitId?: number,
  ): Promise<RequestResult<Buffer>>;

  /**
   * Write a single register/coil
   * @param registerType Register type
   * @param address Register address
   * @param value Value to write
   * @param unitId Unit/slave ID
   */
  writeSingleRegister(
    registerType: RegisterType,
    address: number,
    value: number | boolean,
    unitId?: number,
  ): Promise<RequestResult>;

  /**
   * Write multiple registers/coils
   * @param registerType Register type
   * @param startAddress Starting address
   * @param values Values to write
   * @param unitId Unit/slave ID
   */
  writeMultipleRegisters(
    registerType: RegisterType,
    startAddress: number,
    values: (number | boolean)[],
    unitId?: number,
  ): Promise<RequestResult>;

  /**
   * Execute a custom function code
   * @param functionCode Function code
   * @param data Data buffer
   * @param unitId Unit/slave ID
   */
  executeCustomFunction(
    functionCode: number,
    data: Buffer,
    unitId?: number,
  ): Promise<RequestResult<Buffer>>;
}

/**
 * Protocol factory interface
 */
export interface ProtocolFactory {
  /**
   * Create a protocol instance
   * @param config Configuration options
   */
  create(config: any): Protocol;

  /**
   * Check if the factory supports a protocol
   * @param name Protocol name
   */
  supports(name: string): boolean;
}

/**
 * Protocol registry interface
 */
export interface ProtocolRegistry {
  /**
   * Register a protocol factory
   * @param factory Protocol factory
   */
  register(factory: ProtocolFactory): void;

  /**
   * Get a protocol factory by name
   * @param name Protocol name
   */
  getFactory(name: string): ProtocolFactory | undefined;

  /**
   * Create a protocol instance
   * @param name Protocol name
   * @param config Configuration options
   */
  create(name: string, config: any): Protocol;
}
