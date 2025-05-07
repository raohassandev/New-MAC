/**
 * Modbus types - Replacement for the previously deleted communication module
 */

/**
 * Custom error class for Modbus communication errors
 */
export class ModbusError extends Error {
  public code?: number;
  
  constructor(message: string, code?: number) {
    super(message);
    this.name = 'ModbusError';
    this.code = code;
  }
}

/**
 * Custom error class for Modbus connection errors
 */
export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * Custom error class for Modbus timeout errors
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Modbus response types
 */
export interface ModbusResponse {
  data: number[] | boolean[];
  buffer?: Buffer;
}