/**
 * Core type definitions for the communication module
 */

/**
 * RegisterType enum - Defines the standard Modbus register types
 */
export enum RegisterType {
  COIL = 'coil',                   // Read/Write 1-bit registers (FC01, FC05, FC15)
  DISCRETE_INPUT = 'discreteInput', // Read-only 1-bit registers (FC02)
  INPUT_REGISTER = 'inputRegister', // Read-only 16-bit registers (FC04)
  HOLDING_REGISTER = 'holdingRegister' // Read/Write 16-bit registers (FC03, FC06, FC16)
}

/**
 * RegisterRange - Represents a range of registers to be read
 */
export interface RegisterRange {
  type: RegisterType;
  startAddress: number;
  length: number;
  name?: string; // Optional name for the range
}

/**
 * DataType enum - Standard data types supported for conversion
 */
export enum DataType {
  BOOLEAN = 'boolean',
  INT16 = 'int16',
  UINT16 = 'uint16',
  INT32 = 'int32',
  UINT32 = 'uint32',
  FLOAT32 = 'float32',
  FLOAT64 = 'float64',
  INT64 = 'int64',
  UINT64 = 'uint64',
  STRING = 'string',
  BYTE_ARRAY = 'byteArray'
}

/**
 * ByteOrder enum - Byte ordering options
 */
export enum ByteOrder {
  // Single register (16-bit) byte orders
  AB = 'AB', // Big-endian (A is MSB, B is LSB)
  BA = 'BA', // Little-endian (B is MSB, A is LSB)
  
  // Double register (32-bit) byte orders
  ABCD = 'ABCD', // Big-endian
  CDAB = 'CDAB', // Big-endian byte swapped
  BADC = 'BADC', // Little-endian byte swapped
  DCBA = 'DCBA'  // Little-endian
}

/**
 * ConnectionState enum - Possible states for a connection
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

/**
 * ConnectionOptions - Common connection options
 */
export interface ConnectionOptions {
  timeout?: number;
  retries?: number;
  retryInterval?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

/**
 * TcpConnectionOptions - Options for TCP connections
 */
export interface TcpConnectionOptions extends ConnectionOptions {
  host: string;
  port?: number;
}

/**
 * RtuConnectionOptions - Options for RTU connections
 */
export interface RtuConnectionOptions extends ConnectionOptions {
  path: string;
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 1.5 | 2;
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
}

/**
 * Parameter interface - Represents a single parameter to be read from a device
 */
export interface Parameter {
  name: string;
  registerType: RegisterType;
  address: number;
  dataType: DataType;
  byteOrder?: ByteOrder;
  scaling?: number;
  units?: string;
  description?: string;
  readOnly?: boolean;
  length?: number; // For string data types
  bitIndex?: number; // For bit-level access within registers
}

/**
 * ParameterValue - The value of a parameter read from a device
 */
export interface ParameterValue {
  parameter: Parameter;
  value: any;
  timestamp: Date;
  quality: 'good' | 'bad' | 'uncertain';
  error?: Error;
}

/**
 * ModbusRequestOptions - Options for a single Modbus request
 */
export interface ModbusRequestOptions {
  unitId?: number;
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'normal' | 'low';
  skipCache?: boolean;
}

/**
 * RequestResult - The result of a request to a device
 */
export interface RequestResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  timestamp: Date;
  duration?: number; // Time taken to complete the request in ms
}

/**
 * Statistics - Communication statistics
 */
export interface Statistics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  lastRequestTime?: Date;
  lastSuccessTime?: Date;
  lastErrorTime?: Date;
  averageResponseTime: number;
  uptime: number;
}

/**
 * LogLevel enum - Defines logging severity levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * LogEntry - A single log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
}