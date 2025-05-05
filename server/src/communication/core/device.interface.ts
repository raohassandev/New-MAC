/**
 * Device interface - Defines the contract for communication devices
 */
import { ConnectionOptions, ConnectionState, Parameter, ParameterValue, RequestResult, Statistics } from './types';
import { EventSource } from './events';
import { Protocol } from './protocol.interface';

/**
 * DeviceConfig interface - Base configuration for all devices
 */
export interface DeviceConfig {
  id: string;
  name: string;
  description?: string;
  protocol: string;
  parameters?: Parameter[];
  connectionOptions?: ConnectionOptions;
  [key: string]: any; // Additional protocol-specific configuration
}

/**
 * Device interface - Base interface for all communication devices
 */
export interface Device extends EventSource {
  /**
   * Get the device ID
   */
  readonly id: string;
  
  /**
   * Get the device name
   */
  readonly name: string;
  
  /**
   * Get the device description
   */
  readonly description: string;
  
  /**
   * Get the protocol instance
   */
  readonly protocol: Protocol;
  
  /**
   * Get the connection state
   */
  readonly connectionState: ConnectionState;
  
  /**
   * Get whether the device is connected
   */
  readonly isConnected: boolean;
  
  /**
   * Get the device configuration
   */
  readonly config: DeviceConfig;
  
  /**
   * Get the device parameters
   */
  readonly parameters: Parameter[];
  
  /**
   * Get the last values read from the device
   */
  readonly values: Map<string, ParameterValue>;
  
  /**
   * Get communication statistics
   */
  readonly statistics: Statistics;
  
  /**
   * Initialize the device
   */
  initialize(): Promise<void>;
  
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
   * Read a parameter by name
   * @param parameterName Parameter name
   */
  read(parameterName: string): Promise<ParameterValue>;
  
  /**
   * Read multiple parameters by name
   * @param parameterNames Parameter names
   */
  readMultiple(parameterNames: string[]): Promise<ParameterValue[]>;
  
  /**
   * Read all parameters
   */
  readAll(): Promise<ParameterValue[]>;
  
  /**
   * Write a value to a parameter
   * @param parameterName Parameter name
   * @param value Value to write
   */
  write(parameterName: string, value: any): Promise<RequestResult>;
  
  /**
   * Write values to multiple parameters
   * @param parameterNames Parameter names
   * @param values Values to write
   */
  writeMultiple(parameterNames: string[], values: any[]): Promise<RequestResult[]>;
  
  /**
   * Get a parameter by name
   * @param name Parameter name
   */
  getParameter(name: string): Parameter | undefined;
  
  /**
   * Add a parameter
   * @param parameter Parameter to add
   */
  addParameter(parameter: Parameter): void;
  
  /**
   * Remove a parameter
   * @param name Parameter name
   */
  removeParameter(name: string): boolean;
  
  /**
   * Update a parameter
   * @param name Parameter name
   * @param parameter Updated parameter
   */
  updateParameter(name: string, parameter: Partial<Parameter>): boolean;
  
  /**
   * Get the last value of a parameter
   * @param name Parameter name
   */
  getLastValue(name: string): ParameterValue | undefined;
}

/**
 * AbstractDevice - Base class that implements common device functionality
 */
export abstract class AbstractDevice implements Device {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly protocol: Protocol;
  readonly parameters: Parameter[] = [];
  readonly values: Map<string, ParameterValue> = new Map();
  protected _statistics: Statistics = {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    uptime: 0
  };
  
  constructor(config: DeviceConfig, protocol: Protocol) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description || '';
    this.protocol = protocol;
    
    // Initialize parameters if provided
    if (config.parameters) {
      this.parameters = [...config.parameters];
    }
  }
  
  /**
   * Get the current connection state
   */
  get connectionState(): ConnectionState {
    return this.protocol.connectionState;
  }
  
  /**
   * Get whether the device is connected
   */
  get isConnected(): boolean {
    return this.protocol.isConnected;
  }
  
  /**
   * Get the device configuration
   */
  abstract get config(): DeviceConfig;
  
  /**
   * Get communication statistics
   */
  get statistics(): Statistics {
    return this._statistics;
  }
  
  /**
   * Initialize the device
   * This should be implemented by derived classes
   */
  abstract initialize(): Promise<void>;
  
  /**
   * Connect to the device
   * @param options Optional connection options
   */
  async connect(options?: ConnectionOptions): Promise<void> {
    return this.protocol.connect(options);
  }
  
  /**
   * Disconnect from the device
   */
  async disconnect(): Promise<void> {
    return this.protocol.disconnect();
  }
  
  /**
   * Read a parameter by name
   * @param parameterName Parameter name
   */
  abstract read(parameterName: string): Promise<ParameterValue>;
  
  /**
   * Read multiple parameters by name
   * @param parameterNames Parameter names
   */
  abstract readMultiple(parameterNames: string[]): Promise<ParameterValue[]>;
  
  /**
   * Read all parameters
   */
  abstract readAll(): Promise<ParameterValue[]>;
  
  /**
   * Write a value to a parameter
   * @param parameterName Parameter name
   * @param value Value to write
   */
  abstract write(parameterName: string, value: any): Promise<RequestResult>;
  
  /**
   * Write values to multiple parameters
   * @param parameterNames Parameter names
   * @param values Values to write
   */
  abstract writeMultiple(parameterNames: string[], values: any[]): Promise<RequestResult[]>;
  
  /**
   * Get a parameter by name
   * @param name Parameter name
   */
  getParameter(name: string): Parameter | undefined {
    return this.parameters.find(p => p.name === name);
  }
  
  /**
   * Add a parameter
   * @param parameter Parameter to add
   */
  addParameter(parameter: Parameter): void {
    if (this.getParameter(parameter.name)) {
      throw new Error(`Parameter with name ${parameter.name} already exists`);
    }
    this.parameters.push(parameter);
  }
  
  /**
   * Remove a parameter
   * @param name Parameter name
   */
  removeParameter(name: string): boolean {
    const index = this.parameters.findIndex(p => p.name === name);
    if (index !== -1) {
      this.parameters.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Update a parameter
   * @param name Parameter name
   * @param parameter Updated parameter
   */
  updateParameter(name: string, parameter: Partial<Parameter>): boolean {
    const index = this.parameters.findIndex(p => p.name === name);
    if (index !== -1) {
      this.parameters[index] = { ...this.parameters[index], ...parameter };
      return true;
    }
    return false;
  }
  
  /**
   * Get the last value of a parameter
   * @param name Parameter name
   */
  getLastValue(name: string): ParameterValue | undefined {
    return this.values.get(name);
  }
  
  /**
   * Update the last value of a parameter
   * @param name Parameter name
   * @param value Parameter value
   */
  protected updateValue(name: string, value: ParameterValue): void {
    this.values.set(name, value);
  }
  
  /**
   * Update statistics
   * @param success Whether the request was successful
   * @param duration Request duration in ms
   */
  protected updateStatistics(success: boolean, duration?: number): void {
    this._statistics.requestCount++;
    
    if (success) {
      this._statistics.successCount++;
      this._statistics.lastSuccessTime = new Date();
    } else {
      this._statistics.errorCount++;
      this._statistics.lastErrorTime = new Date();
    }
    
    this._statistics.lastRequestTime = new Date();
    
    if (duration) {
      this._statistics.averageResponseTime = 
        (this._statistics.averageResponseTime * (this._statistics.requestCount - 1) + duration) / 
        this._statistics.requestCount;
    }
  }
  
  // Event methods to be implemented by derived classes
  abstract on(type: string, listener: Function): void;
  abstract off(type: string, listener: Function): void;
  abstract once(type: string, listener: Function): void;
  abstract removeAllListeners(type?: string): void;
}