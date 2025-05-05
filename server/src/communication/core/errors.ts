/**
 * Custom error classes for the communication module
 */

/**
 * Base error class for all communication module errors
 */
export class CommunicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommunicationError';
    Object.setPrototypeOf(this, CommunicationError.prototype);
  }
}

/**
 * Connection errors
 */
export class ConnectionError extends CommunicationError {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * Connection timeout error
 */
export class TimeoutError extends ConnectionError {
  constructor(message: string = 'Connection timed out') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error when the device is not connected
 */
export class NotConnectedError extends ConnectionError {
  constructor(message: string = 'Device is not connected') {
    super(message);
    this.name = 'NotConnectedError';
    Object.setPrototypeOf(this, NotConnectedError.prototype);
  }
}

/**
 * Protocol-specific errors
 */
export class ProtocolError extends CommunicationError {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
    Object.setPrototypeOf(this, ProtocolError.prototype);
  }
}

/**
 * Modbus-specific error with exception code
 */
export class ModbusError extends ProtocolError {
  public exceptionCode?: number;
  
  constructor(message: string, exceptionCode?: number) {
    super(message);
    this.name = 'ModbusError';
    this.exceptionCode = exceptionCode;
    Object.setPrototypeOf(this, ModbusError.prototype);
  }
  
  /**
   * Get the standard message for a Modbus exception code
   */
  static getExceptionMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Illegal Function';
      case 2:
        return 'Illegal Data Address';
      case 3:
        return 'Illegal Data Value';
      case 4:
        return 'Server Device Failure';
      case 5:
        return 'Acknowledge';
      case 6:
        return 'Server Device Busy';
      case 7:
        return 'Negative Acknowledge';
      case 8:
        return 'Memory Parity Error';
      case 10:
        return 'Gateway Path Unavailable';
      case 11:
        return 'Gateway Target Device Failed to Respond';
      default:
        return `Unknown Exception Code: ${code}`;
    }
  }
}

/**
 * Validation errors
 */
export class ValidationError extends CommunicationError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Data conversion errors
 */
export class ConversionError extends CommunicationError {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
    Object.setPrototypeOf(this, ConversionError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends CommunicationError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Utility function to create an appropriate error from an exception or code
 */
export function createError(error: any): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'number') {
    return new ModbusError(ModbusError.getExceptionMessage(error), error);
  }
  
  if (typeof error === 'string') {
    return new CommunicationError(error);
  }
  
  return new CommunicationError('Unknown error');
}

/**
 * Create an error from an exception (handles any type of exception)
 */
export function createErrorFromException(error: any): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new CommunicationError(error);
  }
  
  return new CommunicationError(
    typeof error === 'object' ? 
      JSON.stringify(error) : 
      `Unknown error: ${String(error)}`
  );
}

/**
 * Error handler type for consistent error handling
 */
export type ErrorHandler = (error: Error) => void;