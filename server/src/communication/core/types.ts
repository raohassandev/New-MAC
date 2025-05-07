/**
 * Core type definitions for the communication module
 */

// Device types
export enum RegisterType {
  COIL = 'coil',
  DISCRETE_INPUT = 'discrete_input',
  HOLDING_REGISTER = 'holding_register',
  INPUT_REGISTER = 'input_register',
}

export enum DataType {
  FLOAT32 = 'float32',
  INT16 = 'int16',
  UINT16 = 'uint16',
  INT32 = 'int32',
  UINT32 = 'uint32',
  BOOLEAN = 'boolean',
  STRING = 'string',
}

export enum ByteOrder {
  // 4-byte orders
  ABCD = 'abcd',
  DCBA = 'dcba',
  BADC = 'badc',
  CDAB = 'cdab',
  
  // 2-byte orders
  AB = 'ab',
  BA = 'ba',
}

// Client types
export interface ConnectionSettings {
  timeout?: number;
  retries?: number;
}

export interface TCPConnectionSettings extends ConnectionSettings {
  host: string;
  port: number;
  unitId?: number;
}

export interface RTUConnectionSettings extends ConnectionSettings {
  path: string;
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  unitId?: number;
}

// Parameter types
export interface DeviceParameterOptions {
  id: string;
  name: string;
  address: number;
  registerType: RegisterType;
  dataType: DataType;
  byteOrder: ByteOrder;
  scaling?: number; // Compatibility with legacy
  scalingFactor?: number;
  scalingEquation?: string;
  unit?: string; // Compatibility with legacy
  units?: string;
  description?: string;
}

// Device types
export interface DeviceOptions {
  id: string;
  name: string;
  client: any;
  parameters: DeviceParameterOptions[];
  enabled?: boolean;
}

// Client interfaces
export interface ModbusClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  readCoil(address: number): Promise<boolean>;
  readCoils(address: number, length: number): Promise<boolean[]>;
  readDiscreteInput(address: number): Promise<boolean>;
  readDiscreteInputs(address: number, length: number): Promise<boolean[]>;
  readHoldingRegister(address: number): Promise<number>;
  readHoldingRegisters(address: number, length: number): Promise<number[]>;
  readInputRegister(address: number): Promise<number>;
  readInputRegisters(address: number, length: number): Promise<number[]>;
  writeCoil(address: number, value: boolean): Promise<void>;
  writeCoils(address: number, values: boolean[]): Promise<void>;
  writeRegister(address: number, value: number): Promise<void>;
  writeRegisters(address: number, values: number[]): Promise<void>;
}