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
import { Protocol } from './protocol.interface';

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
