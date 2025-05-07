/**
 * Device interface definitions for the Communication Module
 */
import { EventEmitter } from 'events';
import {
  Parameter,
  ParameterValue,
  ConnectionState,
  RequestResult,
  ReadOptions,
  WriteOptions,
} from './types';

/**
 * Common interface for protocol clients
 */
export interface Protocol {
  // Connection state
  getConnectionState(): ConnectionState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Parameter operations
  readParameter(parameter: Parameter, options?: ReadOptions): Promise<RequestResult>;
  writeParameter(parameter: Parameter, value: any, options?: WriteOptions): Promise<RequestResult>;
  
  // Protocol information
  getProtocolInfo(): { name: string; version: string; capabilities: string[] };
}

/**
 * Interface for a device with communication capabilities
 */
export interface Device extends EventEmitter {
  // Device properties
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly protocol: Protocol;
  readonly parameters: Parameter[];

  // Connection state
  readonly connectionState: ConnectionState;

  // Connection methods
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): boolean;

  // Parameter operations
  readParameter(parameter: Parameter | string, options?: ReadOptions): Promise<RequestResult>;
  writeParameter(
    parameter: Parameter | string,
    value: any,
    options?: WriteOptions,
  ): Promise<RequestResult>;

  // Batch operations
  readParameters(
    parameters: (Parameter | string)[],
    options?: ReadOptions,
  ): Promise<RequestResult<ParameterValue[]>>;

  // Parameter management
  addParameter(parameter: Parameter): boolean;
  removeParameter(parameterNameOrIndex: string | number): boolean;
  getParameter(parameterNameOrIndex: string | number): Parameter | undefined;

  // Device metadata
  getLastValues(): Map<string, ParameterValue>;
}
