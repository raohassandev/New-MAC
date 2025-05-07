/**
 * Core type definitions for the Communication Module
 */

/**
 * Enum representing Modbus register types
 */
export enum RegisterType {
  COIL = 'COIL',
  DISCRETE_INPUT = 'DISCRETE_INPUT',
  INPUT_REGISTER = 'INPUT_REGISTER',
  HOLDING_REGISTER = 'HOLDING_REGISTER',
}

/**
 * Function code mapping for Modbus register types
 */
export const RegisterTypeToFunctionCode = {
  [RegisterType.COIL]: 1,
  [RegisterType.DISCRETE_INPUT]: 2,
  [RegisterType.INPUT_REGISTER]: 4,
  [RegisterType.HOLDING_REGISTER]: 3,
};

/**
 * Data type enumeration for parameter values
 */
export enum DataType {
  BOOLEAN = 'BOOLEAN',
  INT16 = 'INT16',
  UINT16 = 'UINT16',
  INT32 = 'INT32',
  UINT32 = 'UINT32',
  FLOAT32 = 'FLOAT32',
  FLOAT64 = 'FLOAT64',
  STRING = 'STRING',
  RAW = 'RAW',   // Raw values for direct register operations
}

/**
 * Word count for different data types
 */
export const DataTypeWordCount = {
  [DataType.BOOLEAN]: 1,
  [DataType.INT16]: 1,
  [DataType.UINT16]: 1,
  [DataType.INT32]: 2,
  [DataType.UINT32]: 2,
  [DataType.FLOAT32]: 2,
  [DataType.FLOAT64]: 4,
  [DataType.STRING]: 1, // String length is variable, this is per character (2 bytes)
  [DataType.RAW]: 1,    // RAW defaults to 1 but can be overridden with wordCount param
};

/**
 * Enum for byte ordering options
 */
export enum ByteOrder {
  // For 16-bit values
  AB = 'AB',
  BA = 'BA',

  // For 32-bit values (FLOAT32, INT32, etc.)
  ABCD = 'ABCD', // Big-endian
  CDAB = 'CDAB', // Little-endian
  BADC = 'BADC', // Big-endian with byte swap
  DCBA = 'DCBA', // Little-endian with byte swap
}

/**
 * Enum for connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

/**
 * Interface for a device parameter
 */
export interface Parameter {
  id?: string;        // Unique identifier used in some implementations
  name: string;
  description?: string;
  registerType: RegisterType;
  address: number;
  dataType: DataType;
  byteOrder?: ByteOrder;
  wordCount?: number;
  scaling?: number;
  scalingFactor?: number; // Alias for scaling used in some implementations
  scalingEquation?: string;
  units?: string;
  unit?: string;      // Alias for units used in some implementations
  readOnly?: boolean;
  decimalPoint?: number;
  min?: number;
  max?: number;
}

/**
 * Interface for a parameter value
 */
export interface ParameterValue {
  parameter: Parameter;
  value: any;
  timestamp: Date;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  error?: string;
}

/**
 * Interface for device configuration
 */
export interface DeviceConfig {
  id: string;
  name: string;
  description?: string;
  protocol: 'MODBUS_TCP' | 'MODBUS_RTU';
  connectionOptions: ModbusTCPOptions | ModbusRTUOptions;
  parameters: Parameter[];
  pollingInterval?: number; // in milliseconds
}

/**
 * Base interface for connection options
 */
export interface ConnectionOptions {
  timeout?: number;
  retries?: number;
  retryInterval?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

/**
 * Modbus TCP specific connection options
 */
export interface ModbusTCPOptions extends ConnectionOptions {
  host: string;
  port?: number;
  unitId?: number;
}

/**
 * Modbus RTU specific connection options
 */
export interface ModbusRTUOptions extends ConnectionOptions {
  path: string;
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  unitId?: number;
}

/**
 * Interface for request result
 */
export interface RequestResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  timestamp: Date;
}

/**
 * Interface for read operation options
 */
export interface ReadOptions {
  timeout?: number;
  retries?: number;
}

/**
 * Interface for write operation options
 */
export interface WriteOptions extends ReadOptions {
  skipValidation?: boolean;
}

/**
 * Log levels for the logging service
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Modbus response data
 */
export interface ModbusResponse {
  data: number[] | boolean[];
  buffer?: Buffer;
}

/**
 * Parameter read group - for optimizing reads
 */
export interface ParameterGroup {
  registerType: RegisterType;
  startAddress: number;
  endAddress: number;
  parameters: Parameter[];
}
