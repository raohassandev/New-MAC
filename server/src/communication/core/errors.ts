/**
 * Error definitions for the Communication Module
 */

/**
 * Base error class for communication module errors
 */
export class CommunicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommunicationError';
    Object.setPrototypeOf(this, CommunicationError.prototype);
  }
}

/**
 * Error class for Modbus protocol specific errors
 */
export class ModbusError extends CommunicationError {
  public readonly modbusCode?: number;
  public readonly functionCode?: number;

  constructor(message: string, modbusCode?: number, functionCode?: number) {
    super(message);
    this.name = 'ModbusError';
    this.modbusCode = modbusCode;
    this.functionCode = functionCode;
    Object.setPrototypeOf(this, ModbusError.prototype);
  }

  /**
   * Get human-readable description of the Modbus exception code
   */
  getExceptionDescription(): string {
    if (!this.modbusCode) return 'Unknown Modbus Error';

    switch (this.modbusCode) {
      case 1:
        return 'Illegal Function (Code 01): The function code received in the query is not recognized or allowed by the device.';
      case 2:
        return 'Illegal Data Address (Code 02): The data address received in the query is not an allowable address for the device.';
      case 3:
        return 'Illegal Data Value (Code 03): A value contained in the query data field is not an allowable value for the device.';
      case 4:
        return 'Server Device Failure (Code 04): An unrecoverable error occurred while the device was attempting to perform the requested action.';
      case 5:
        return 'Acknowledge (Code 05): The device has accepted the request and is processing it, but a long duration of time is required.';
      case 6:
        return 'Server Device Busy (Code 06): The device is engaged in processing a long-duration command. The client should retry later.';
      case 7:
        return 'Negative Acknowledge (Code 07): The device cannot perform the programming function received in the query.';
      case 8:
        return 'Memory Parity Error (Code 08): The device detected a parity error in the memory.';
      case 10:
        return 'Gateway Path Unavailable (Code 0A): The gateway was unable to establish a path to the slave device.';
      case 11:
        return 'Gateway Target Device Failed to Respond (Code 0B): The gateway did not receive a response from the target device.';
      default:
        return `Unknown Modbus Exception Code (${this.modbusCode})`;
    }
  }
}

/**
 * Error class for connection related errors
 */
export class ConnectionError extends CommunicationError {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ConnectionError';
    this.cause = cause;
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * Error class for timeout errors
 */
export class TimeoutError extends CommunicationError {
  public readonly duration: number;

  constructor(message: string, durationMs: number) {
    super(message);
    this.name = 'TimeoutError';
    this.duration = durationMs;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error class for data parsing errors
 */
export class ParsingError extends CommunicationError {
  public readonly dataType: string;
  public readonly rawData: any;

  constructor(message: string, dataType: string, rawData: any) {
    super(message);
    this.name = 'ParsingError';
    this.dataType = dataType;
    this.rawData = rawData;
    Object.setPrototypeOf(this, ParsingError.prototype);
  }
}

/**
 * Error class for configuration errors
 */
export class ConfigurationError extends CommunicationError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error class for parameter validation errors
 */
export class ValidationError extends CommunicationError {
  public readonly parameter?: string;
  public readonly value?: any;
  public readonly constraints?: Record<string, string>;

  constructor(
    message: string,
    parameter?: string,
    value?: any,
    constraints?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ValidationError';
    this.parameter = parameter;
    this.value = value;
    this.constraints = constraints;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Helper function to convert raw error to appropriate communication error type
 * @param error The error to convert
 * @returns A CommunicationError instance
 */
export function convertError(error: any): CommunicationError {
  // If it's already a CommunicationError, return it
  if (error instanceof CommunicationError) {
    return error;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Try to determine the error type based on the message or name
    const message = error.message || '';
    const name = error.name || '';

    if (name === 'ModbusError' || message.includes('Modbus') || message.includes('modbus')) {
      return new ModbusError(message);
    }

    if (name === 'TimeoutError' || message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError(message, 0);
    }

    if (
      name === 'ConnectionError' ||
      message.includes('connect') ||
      message.includes('connection') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ECONNRESET')
    ) {
      return new ConnectionError(message, error);
    }

    if (name === 'ParsingError' || message.includes('parse') || message.includes('parsing')) {
      return new ParsingError(message, 'unknown', null);
    }

    // Default to general communication error
    return new CommunicationError(message);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return new CommunicationError(error);
  }

  // Handle unknown error types
  return new CommunicationError(typeof error === 'object' ? JSON.stringify(error) : String(error));
}
