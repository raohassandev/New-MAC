// client/src/types/device.types.ts

// Basic Device interface
export interface Device {
  _id: string;
  name: string;
  enabled: boolean;
  deviceType?: string; // Added for template categorization
  isTemplate?: boolean; // Flag to mark this as a template
  isDeviceDriver?: boolean; // Flag to mark this as a device driver
  lastSeen?: Date | string;
  make?: string;
  model?: string;
  description?: string;
  tags?: string[];

  // New consolidated structure
  connectionSetting?: ConnectionSetting;
  dataPoints?: DataPoint[];

  // Device driver linkage
  deviceDriverId?: string; // Reference to the template/driver this device is based on

  // Metadata fields
  usage?: string; // Usage category
  usageNotes?: string; // Additional notes about device usage
  location?: string; // Physical location information
  pollingInterval?: number; // Device-specific polling interval in milliseconds

  // Advanced communication settings
  advancedSettings?: AdvancedSettings;

  // Legacy fields for backward compatibility
  registerRanges?: RegisterRange[];
  parameterConfigs?: ParameterConfig[];
  registers?: any[]; // For DeviceDetails component

  // Connection properties (directly on Device for backward compatibility)
  connectionType?: string;
  ip?: string;
  port?: number | string;
  slaveId?: number | string;
  serialPort?: string;
  baudRate?: number | string;
  dataBits?: number | string;
  stopBits?: number | string;
  parity?: string;

  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: {
    userId: string;
    username: string;
    email: string;
  };
}

// Register range type
export interface RegisterRange {
  rangeName: string;
  startRegister: number;
  length: number;
  functionCode: number;
  dataParser?: ParameterConfig[]; // Optional array of parameter configurations
}

// Valid data types for parameter configuration
export enum DataType {
  INT16 = 'INT-16',
  UINT16 = 'UINT-16',
  INT32 = 'INT-32',
  UINT32 = 'UINT-32',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
}

// Valid byte orders for single register data types
export type SingleRegisterByteOrder = 'AB' | 'BA';

// Valid byte orders for multi-register data types
export type MultiRegisterByteOrder = 'ABCD' | 'DCBA' | 'BADC' | 'CDAB';

// Combined byte order type
export type ByteOrder = SingleRegisterByteOrder | MultiRegisterByteOrder;

// Parameter configuration interface
export interface ParameterConfig {
  name: string;
  dataType: string; // Changed from DataType enum to string to match form.types
  scalingFactor: number;
  decimalPoint: number;
  byteOrder: string; // Changed from ByteOrder to string to match form.types
  registerRange?: string; // Optional for standalone parameters
  registerIndex: number;
}

// Device reading interface
export interface DeviceReading {
  registerIndex: string | undefined;
  dataType(value: string | number | boolean | undefined, dataType: any): import("react").ReactNode;
  _id: string;
  deviceId: string;
  timestamp: Date | string;
  parameters: {
    [key: string]: number | boolean | string;
  };
  rawData?: Buffer | string;
  name?: string;
  address?: string;
  value?: number | string | boolean;
  unit?: string;
}

// TCP Connection Settings
export interface TcpSettings {
  ip?: string;
  port?: number;
  slaveId?: number;
}

// RTU Connection Settings
export interface RtuSettings {
  serialPort?: string;
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
  slaveId?: number;
}

// Connection Setting interface
export interface ConnectionSetting {
  connectionType: 'tcp' | 'rtu';
  tcp?: TcpSettings;
  rtu?: RtuSettings;
}

// Range interface for dataPoints
export interface Range {
  startAddress: number;
  count: number;
  fc: number;
}

// Parameter interface for parser
export interface Parameter {
  name: string;
  dataType: string;
  scalingFactor: number;
  decimalPoint: number;
  byteOrder: string;
  signed?: boolean;
  registerRange?: string;
  registerIndex: number;
  wordCount?: number;
}

// Parser interface for dataPoints
export interface Parser {
  parameters: Parameter[];
}

// DataPoint interface
export interface DataPoint {
  range: Range;
  parser: Parser;
}

// Connection types
export type ConnectionType = 'tcp' | 'rtu';

// Valid function codes for Modbus
export enum FunctionCode {
  ReadCoils = 1,
  ReadDiscreteInputs = 2,
  ReadHoldingRegisters = 3,
  ReadInputRegisters = 4,
  WriteSingleCoil = 5,
  WriteSingleRegister = 6,
  WriteMultipleCoils = 15,
  WriteMultipleRegisters = 16,
  MaskWriteRegister = 22,
  ReadWriteMultipleRegisters = 23,
}

// Valid parity options
export type Parity = 'none' | 'even' | 'odd';

// Device filter interface
export interface DeviceFilter {
  search?: string;
  status?: 'online' | 'offline';
  type?: string;
  tags?: string[];
  groups?: string[];
}

// Device Type definition
export interface DeviceType {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  specifications?: Record<string, any>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: {
    userId: string;
    username: string;
    email: string;
  };
}

// Connection options interface for advanced settings
export interface ConnectionOptions {
  timeout?: number;
  retries?: number;
  retryInterval?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

// Cache options interface
export interface CacheOptions {
  enabled?: boolean;
  defaultTtl?: number;
  maxSize?: number;
  checkInterval?: number;
}

// Log options interface
export interface LogOptions {
  level?: string;
  console?: boolean;
  file?: {
    enabled?: boolean;
    path?: string;
    maxSize?: number;
    maxFiles?: number;
  };
}

// Advanced settings interface
export interface AdvancedSettings {
  defaultPollInterval?: number;
  defaultRequestTimeout?: number;
  connectionOptions?: ConnectionOptions;
  cacheOptions?: CacheOptions;
  logOptions?: LogOptions;
}
