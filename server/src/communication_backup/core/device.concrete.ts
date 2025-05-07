/**
 * Concrete implementation of the Device interface
 */
import { EventEmitter } from 'events';
import { Device } from './device.interface';
import { Protocol } from './protocol.interface';
import {
  Parameter,
  ParameterValue,
  ConnectionState,
  RequestResult,
  ReadOptions,
  WriteOptions,
} from './types';
import { DeviceEvent } from './events';
import { CommunicationError, ValidationError, convertError } from './errors';

/**
 * Base concrete implementation of a Device
 */
export class DeviceBase extends EventEmitter implements Device {
  // Private properties
  private _parameters: Map<string, Parameter> = new Map();
  private _lastValues: Map<string, ParameterValue> = new Map();
  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private _connectPromise: Promise<boolean> | null = null;
  private _disconnectPromise: Promise<boolean> | null = null;
  private _debugMode = false;

  /**
   * Create a new device
   * @param id Unique device identifier
   * @param name Human-readable device name
   * @param protocol Communication protocol implementation
   * @param parameters Initial device parameters
   * @param description Optional device description
   */
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly protocol: Protocol,
    parameters: Parameter[] = [],
    public readonly description: string = '',
  ) {
    super();

    // Set max listeners to avoid Node.js warnings
    this.setMaxListeners(50);

    // Add initial parameters
    parameters.forEach(param => this.addParameter(param));

    // Log debug info if debug mode is enabled
    this.on(DeviceEvent.ERROR, error => {
      if (this._debugMode) {
        console.error(`[DEVICE:${this.id}] Error: ${error.message}`);
      }
    });
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
  }

  /**
   * Get the current connection state
   */
  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  /**
   * Get the list of device parameters
   */
  get parameters(): Parameter[] {
    return Array.from(this._parameters.values());
  }

  /**
   * Connect to the device
   * @returns Promise resolving to true if connected successfully
   */
  async connect(): Promise<boolean> {
    // If we're already connected, return true
    if (this._connectionState === ConnectionState.CONNECTED) {
      return true;
    }

    // If we're already connecting, return the existing promise
    if (this._connectPromise && this._connectionState === ConnectionState.CONNECTING) {
      return this._connectPromise;
    }

    // Update state and emit event
    this._updateConnectionState(ConnectionState.CONNECTING);

    // Create connect promise
    this._connectPromise = (async () => {
      try {
        if (this._debugMode) {
          console.log(`[DEVICE:${this.id}] Connecting to ${this.name}...`);
        }

        // Connect via protocol
        await this.protocol.connect();

        // Update state on success
        this._updateConnectionState(ConnectionState.CONNECTED);

        if (this._debugMode) {
          console.log(`[DEVICE:${this.id}] Connected to ${this.name}`);
        }

        return true;
      } catch (error) {
        // Update state on error
        this._updateConnectionState(ConnectionState.ERROR);

        // Convert to appropriate error type
        const communicationError = convertError(error);

        if (this._debugMode) {
          console.error(`[DEVICE:${this.id}] Connection error: ${communicationError.message}`);
        }

        // Emit error event
        this.emit(DeviceEvent.CONNECTION_ERROR, communicationError);

        // Clear promise
        this._connectPromise = null;

        throw communicationError;
      }
    })();

    try {
      return await this._connectPromise;
    } finally {
      // Always clear promise when complete
      this._connectPromise = null;
    }
  }

  /**
   * Disconnect from the device
   * @returns Promise resolving to true if disconnected successfully
   */
  async disconnect(): Promise<boolean> {
    // If we're already disconnected, return true
    if (this._connectionState === ConnectionState.DISCONNECTED) {
      return true;
    }

    // If we're already disconnecting, return the existing promise
    if (this._disconnectPromise) {
      return this._disconnectPromise;
    }

    // Create disconnect promise
    this._disconnectPromise = (async () => {
      try {
        if (this._debugMode) {
          console.log(`[DEVICE:${this.id}] Disconnecting from ${this.name}...`);
        }

        // Disconnect via protocol
        await this.protocol.disconnect();

        // Update state on success
        this._updateConnectionState(ConnectionState.DISCONNECTED);

        if (this._debugMode) {
          console.log(`[DEVICE:${this.id}] Disconnected from ${this.name}`);
        }

        return true;
      } catch (error) {
        // Convert to appropriate error type
        const communicationError = convertError(error);

        if (this._debugMode) {
          console.error(`[DEVICE:${this.id}] Disconnection error: ${communicationError.message}`);
        }

        // Emit error event
        this.emit(DeviceEvent.ERROR, communicationError);

        // Clear promise
        this._disconnectPromise = null;

        throw communicationError;
      }
    })();

    try {
      return await this._disconnectPromise;
    } finally {
      // Always clear promise when complete
      this._disconnectPromise = null;
    }
  }

  /**
   * Check if the device is currently connected
   */
  isConnected(): boolean {
    return this._connectionState === ConnectionState.CONNECTED && this.protocol.isConnected();
  }

  /**
   * Read a parameter from the device
   * @param parameter Parameter or parameter name to read
   * @param options Read options
   * @returns Promise resolving to the request result
   */
  async readParameter(
    parameter: Parameter | string,
    options?: ReadOptions,
  ): Promise<RequestResult> {
    const param = this._resolveParameter(parameter);

    if (!param) {
      const error = new ValidationError(
        `Parameter not found: ${typeof parameter === 'string' ? parameter : parameter.name}`,
        typeof parameter === 'string' ? parameter : parameter.name,
      );

      return {
        success: false,
        error,
        timestamp: new Date(),
      };
    }

    try {
      if (this._debugMode) {
        console.log(`[DEVICE:${this.id}] Reading parameter: ${param.name}`);
      }

      // Ensure connected before reading
      if (!this.isConnected()) {
        await this.connect();
      }

      // Read via protocol
      const result = await this.protocol.readParameter(param, options);

      if (result.success && result.data !== undefined) {
        // Store the value
        const paramValue: ParameterValue = {
          parameter: param,
          value: result.data,
          timestamp: result.timestamp,
          quality: 'GOOD',
        };

        this._lastValues.set(param.name, paramValue);

        // Emit event
        this.emit(DeviceEvent.PARAMETER_READ, paramValue);
        this.emit(DeviceEvent.DATA_UPDATED, param.name, result.data);

        if (this._debugMode) {
          console.log(`[DEVICE:${this.id}] Parameter ${param.name} = ${result.data}`);
        }
      } else if (result.error) {
        // Store error value
        const paramValue: ParameterValue = {
          parameter: param,
          value: null,
          timestamp: result.timestamp,
          quality: 'BAD',
          error: result.error.message,
        };

        this._lastValues.set(param.name, paramValue);

        if (this._debugMode) {
          console.error(`[DEVICE:${this.id}] Error reading ${param.name}: ${result.error.message}`);
        }
      }

      return result;
    } catch (error) {
      // Convert to appropriate error type
      const communicationError = convertError(error);

      if (this._debugMode) {
        console.error(
          `[DEVICE:${this.id}] Error reading ${param.name}: ${communicationError.message}`,
        );
      }

      // Store error value
      const paramValue: ParameterValue = {
        parameter: param,
        value: null,
        timestamp: new Date(),
        quality: 'BAD',
        error: communicationError.message,
      };

      this._lastValues.set(param.name, paramValue);

      // Emit error event
      this.emit(DeviceEvent.ERROR, communicationError);

      return {
        success: false,
        error: communicationError,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Write a value to a device parameter
   * @param parameter Parameter or parameter name to write
   * @param value Value to write
   * @param options Write options
   * @returns Promise resolving to the request result
   */
  async writeParameter(
    parameter: Parameter | string,
    value: any,
    options?: WriteOptions,
  ): Promise<RequestResult> {
    const param = this._resolveParameter(parameter);

    if (!param) {
      const error = new ValidationError(
        `Parameter not found: ${typeof parameter === 'string' ? parameter : parameter.name}`,
        typeof parameter === 'string' ? parameter : parameter.name,
      );

      return {
        success: false,
        error,
        timestamp: new Date(),
      };
    }

    // Check if parameter is read-only
    if (param.readOnly) {
      const error = new ValidationError(`Parameter ${param.name} is read-only`, param.name, value);

      return {
        success: false,
        error,
        timestamp: new Date(),
      };
    }

    try {
      if (this._debugMode) {
        console.log(`[DEVICE:${this.id}] Writing parameter: ${param.name} = ${value}`);
      }

      // Validate value if not skipping validation
      if (!options?.skipValidation) {
        // Check min/max constraints
        if (param.min !== undefined && typeof value === 'number' && value < param.min) {
          const error = new ValidationError(
            `Value ${value} is below minimum ${param.min} for parameter ${param.name}`,
            param.name,
            value,
            { min: `Value must be >= ${param.min}` },
          );

          return {
            success: false,
            error,
            timestamp: new Date(),
          };
        }

        if (param.max !== undefined && typeof value === 'number' && value > param.max) {
          const error = new ValidationError(
            `Value ${value} is above maximum ${param.max} for parameter ${param.name}`,
            param.name,
            value,
            { max: `Value must be <= ${param.max}` },
          );

          return {
            success: false,
            error,
            timestamp: new Date(),
          };
        }

        // TODO: Add more validation checks for specific data types
      }

      // Ensure connected before writing
      if (!this.isConnected()) {
        await this.connect();
      }

      // Write via protocol
      const result = await this.protocol.writeParameter(param, value, options);

      if (result.success) {
        // Store the value on successful write
        const paramValue: ParameterValue = {
          parameter: param,
          value,
          timestamp: result.timestamp,
          quality: 'GOOD',
        };

        this._lastValues.set(param.name, paramValue);

        // Emit event
        this.emit(DeviceEvent.PARAMETER_WRITE, paramValue);
        this.emit(DeviceEvent.DATA_UPDATED, param.name, value);

        if (this._debugMode) {
          console.log(`[DEVICE:${this.id}] Successfully wrote ${param.name} = ${value}`);
        }
      } else if (result.error) {
        if (this._debugMode) {
          console.error(`[DEVICE:${this.id}] Error writing ${param.name}: ${result.error.message}`);
        }
      }

      return result;
    } catch (error) {
      // Convert to appropriate error type
      const communicationError = convertError(error);

      if (this._debugMode) {
        console.error(
          `[DEVICE:${this.id}] Error writing ${param.name}: ${communicationError.message}`,
        );
      }

      // Emit error event
      this.emit(DeviceEvent.ERROR, communicationError);

      return {
        success: false,
        error: communicationError,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Read multiple parameters in a batch operation
   * @param parameters Parameters or parameter names to read
   * @param options Read options
   * @returns Promise resolving to the request result with an array of parameter values
   */
  async readParameters(
    parameters: (Parameter | string)[],
    options?: ReadOptions,
  ): Promise<RequestResult<ParameterValue[]>> {
    // Validate parameters
    const params: Parameter[] = [];
    const invalidParams: string[] = [];

    for (const param of parameters) {
      const resolvedParam = this._resolveParameter(param);
      if (resolvedParam) {
        params.push(resolvedParam);
      } else {
        invalidParams.push(typeof param === 'string' ? param : param.name);
      }
    }

    if (invalidParams.length > 0) {
      const error = new ValidationError(
        `Parameters not found: ${invalidParams.join(', ')}`,
        invalidParams.join(', '),
      );

      return {
        success: false,
        error,
        timestamp: new Date(),
      };
    }

    try {
      if (this._debugMode) {
        console.log(`[DEVICE:${this.id}] Reading ${params.length} parameters in batch`);
      }

      // Ensure connected before reading
      if (!this.isConnected()) {
        await this.connect();
      }

      const results: ParameterValue[] = [];

      // TODO: Optimize by grouping parameters that can be read together
      // For now, read each parameter individually
      for (const param of params) {
        try {
          const result = await this.readParameter(param, options);

          if (result.success && result.data !== undefined) {
            const paramValue = this._lastValues.get(param.name);
            if (paramValue) {
              results.push(paramValue);
            }
          } else if (result.error) {
            // Create error parameter value
            const paramValue: ParameterValue = {
              parameter: param,
              value: null,
              timestamp: result.timestamp,
              quality: 'BAD',
              error: result.error.message,
            };

            results.push(paramValue);
          }
        } catch (paramError) {
          // Handle individual parameter errors
          const communicationError = convertError(paramError);

          // Create error parameter value
          const paramValue: ParameterValue = {
            parameter: param,
            value: null,
            timestamp: new Date(),
            quality: 'BAD',
            error: communicationError.message,
          };

          results.push(paramValue);
        }
      }

      if (this._debugMode) {
        console.log(`[DEVICE:${this.id}] Completed batch read of ${results.length} parameters`);
      }

      return {
        success: true,
        data: results,
        timestamp: new Date(),
      };
    } catch (error) {
      // Convert to appropriate error type
      const communicationError = convertError(error);

      if (this._debugMode) {
        console.error(`[DEVICE:${this.id}] Error in batch read: ${communicationError.message}`);
      }

      // Emit error event
      this.emit(DeviceEvent.ERROR, communicationError);

      return {
        success: false,
        error: communicationError,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Add a parameter to the device
   * @param parameter Parameter to add
   * @returns True if parameter was added successfully
   */
  addParameter(parameter: Parameter): boolean {
    if (!parameter.name || this._parameters.has(parameter.name)) {
      return false;
    }

    this._parameters.set(parameter.name, parameter);
    return true;
  }

  /**
   * Remove a parameter from the device
   * @param parameterNameOrIndex Parameter name or index to remove
   * @returns True if parameter was removed successfully
   */
  removeParameter(parameterNameOrIndex: string | number): boolean {
    if (typeof parameterNameOrIndex === 'string') {
      // Remove by name
      return this._parameters.delete(parameterNameOrIndex);
    } else {
      // Remove by index
      const parameters = this.parameters;
      if (parameterNameOrIndex >= 0 && parameterNameOrIndex < parameters.length) {
        const param = parameters[parameterNameOrIndex];
        return this._parameters.delete(param.name);
      }
      return false;
    }
  }

  /**
   * Get a parameter by name or index
   * @param parameterNameOrIndex Parameter name or index
   * @returns The parameter or undefined if not found
   */
  getParameter(parameterNameOrIndex: string | number): Parameter | undefined {
    if (typeof parameterNameOrIndex === 'string') {
      // Get by name
      return this._parameters.get(parameterNameOrIndex);
    } else {
      // Get by index
      const parameters = this.parameters;
      if (parameterNameOrIndex >= 0 && parameterNameOrIndex < parameters.length) {
        return parameters[parameterNameOrIndex];
      }
      return undefined;
    }
  }

  /**
   * Get the last values read for all parameters
   * @returns Map of parameter names to their values
   */
  getLastValues(): Map<string, ParameterValue> {
    return new Map(this._lastValues);
  }

  /**
   * Update the connection state and emit events
   * @param state New connection state
   */
  private _updateConnectionState(state: ConnectionState): void {
    const oldState = this._connectionState;

    if (oldState === state) {
      return;
    }

    this._connectionState = state;

    // Emit appropriate events
    switch (state) {
      case ConnectionState.CONNECTING:
        this.emit(DeviceEvent.CONNECTING);
        break;
      case ConnectionState.CONNECTED:
        this.emit(DeviceEvent.CONNECTED);
        break;
      case ConnectionState.DISCONNECTED:
        this.emit(DeviceEvent.DISCONNECTED);
        break;
      case ConnectionState.ERROR:
        // The specific error is emitted separately
        break;
    }

    // Always emit state change event
    this.emit(DeviceEvent.STATE_CHANGED, state);
  }

  /**
   * Resolve a parameter reference to an actual parameter
   * @param parameter Parameter or parameter name
   * @returns Resolved parameter or undefined if not found
   */
  private _resolveParameter(parameter: Parameter | string): Parameter | undefined {
    if (typeof parameter === 'string') {
      return this._parameters.get(parameter);
    }

    // If it's already a Parameter, check if it's one of ours
    const existingParam = this._parameters.get(parameter.name);

    if (existingParam) {
      return existingParam;
    }

    // Not one of our parameters, but we'll allow it for flexibility
    return parameter;
  }
}
