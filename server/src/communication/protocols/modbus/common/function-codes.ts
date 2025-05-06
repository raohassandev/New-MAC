/**
 * Standard Modbus function codes and their implementations
 * Based on the Modbus Application Protocol Specification V1.1b3
 */

import { ModbusError } from '../../../core/errors';
import { RegisterType } from '../../../core/types';

/**
 * Standard Modbus function codes
 */
export enum ModbusFunctionCode {
  // Bit access
  READ_COILS = 0x01,
  READ_DISCRETE_INPUTS = 0x02,
  WRITE_SINGLE_COIL = 0x05,
  WRITE_MULTIPLE_COILS = 0x0f,

  // 16-bit word access
  READ_HOLDING_REGISTERS = 0x03,
  READ_INPUT_REGISTERS = 0x04,
  WRITE_SINGLE_REGISTER = 0x06,
  WRITE_MULTIPLE_REGISTERS = 0x10,

  // File record access
  READ_FILE_RECORD = 0x14,
  WRITE_FILE_RECORD = 0x15,

  // Diagnostics
  READ_EXCEPTION_STATUS = 0x07,
  DIAGNOSTIC = 0x08,
  GET_COM_EVENT_COUNTER = 0x0b,
  GET_COM_EVENT_LOG = 0x0c,
  REPORT_SERVER_ID = 0x11,

  // Other
  READ_FIFO_QUEUE = 0x18,
  ENCAPSULATED_INTERFACE_TRANSPORT = 0x2b,

  // MEI Transport for Device Identification
  READ_DEVICE_IDENTIFICATION = 0x2b,

  // Bit/register combined operations
  MASK_WRITE_REGISTER = 0x16,
  READ_WRITE_MULTIPLE_REGISTERS = 0x17,
}

/**
 * Map RegisterType to the corresponding read function code
 */
export function getReadFunctionCode(registerType: RegisterType): ModbusFunctionCode {
  switch (registerType) {
    case RegisterType.COIL:
      return ModbusFunctionCode.READ_COILS;
    case RegisterType.DISCRETE_INPUT:
      return ModbusFunctionCode.READ_DISCRETE_INPUTS;
    case RegisterType.INPUT_REGISTER:
      return ModbusFunctionCode.READ_INPUT_REGISTERS;
    case RegisterType.HOLDING_REGISTER:
      return ModbusFunctionCode.READ_HOLDING_REGISTERS;
    default:
      throw new Error(`Unsupported register type: ${registerType}`);
  }
}

/**
 * Map RegisterType to the corresponding write function code
 * @throws Error if register type is read-only
 */
export function getWriteSingleFunctionCode(registerType: RegisterType): ModbusFunctionCode {
  switch (registerType) {
    case RegisterType.COIL:
      return ModbusFunctionCode.WRITE_SINGLE_COIL;
    case RegisterType.HOLDING_REGISTER:
      return ModbusFunctionCode.WRITE_SINGLE_REGISTER;
    case RegisterType.DISCRETE_INPUT:
    case RegisterType.INPUT_REGISTER:
      throw new Error(`Cannot write to read-only register type: ${registerType}`);
    default:
      throw new Error(`Unsupported register type: ${registerType}`);
  }
}

/**
 * Map RegisterType to the corresponding write multiple function code
 * @throws Error if register type is read-only
 */
export function getWriteMultipleFunctionCode(registerType: RegisterType): ModbusFunctionCode {
  switch (registerType) {
    case RegisterType.COIL:
      return ModbusFunctionCode.WRITE_MULTIPLE_COILS;
    case RegisterType.HOLDING_REGISTER:
      return ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS;
    case RegisterType.DISCRETE_INPUT:
    case RegisterType.INPUT_REGISTER:
      throw new Error(`Cannot write to read-only register type: ${registerType}`);
    default:
      throw new Error(`Unsupported register type: ${registerType}`);
  }
}

/**
 * Exception codes defined by the Modbus specification
 */
export enum ModbusExceptionCode {
  ILLEGAL_FUNCTION = 0x01,
  ILLEGAL_DATA_ADDRESS = 0x02,
  ILLEGAL_DATA_VALUE = 0x03,
  SERVER_DEVICE_FAILURE = 0x04,
  ACKNOWLEDGE = 0x05,
  SERVER_DEVICE_BUSY = 0x06,
  NEGATIVE_ACKNOWLEDGE = 0x07,
  MEMORY_PARITY_ERROR = 0x08,
  GATEWAY_PATH_UNAVAILABLE = 0x0a,
  GATEWAY_TARGET_DEVICE_FAILED_TO_RESPOND = 0x0b,
}

/**
 * Check if the function code is a read function
 */
export function isReadFunction(functionCode: ModbusFunctionCode): boolean {
  return [
    ModbusFunctionCode.READ_COILS,
    ModbusFunctionCode.READ_DISCRETE_INPUTS,
    ModbusFunctionCode.READ_HOLDING_REGISTERS,
    ModbusFunctionCode.READ_INPUT_REGISTERS,
  ].includes(functionCode);
}

/**
 * Check if the function code is a write function
 */
export function isWriteFunction(functionCode: ModbusFunctionCode): boolean {
  return [
    ModbusFunctionCode.WRITE_SINGLE_COIL,
    ModbusFunctionCode.WRITE_MULTIPLE_COILS,
    ModbusFunctionCode.WRITE_SINGLE_REGISTER,
    ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS,
  ].includes(functionCode);
}

/**
 * Check if the function code is a bit access function
 */
export function isBitFunction(functionCode: ModbusFunctionCode): boolean {
  return [
    ModbusFunctionCode.READ_COILS,
    ModbusFunctionCode.READ_DISCRETE_INPUTS,
    ModbusFunctionCode.WRITE_SINGLE_COIL,
    ModbusFunctionCode.WRITE_MULTIPLE_COILS,
  ].includes(functionCode);
}

/**
 * Check if the function code is a word access function
 */
export function isWordFunction(functionCode: ModbusFunctionCode): boolean {
  return [
    ModbusFunctionCode.READ_HOLDING_REGISTERS,
    ModbusFunctionCode.READ_INPUT_REGISTERS,
    ModbusFunctionCode.WRITE_SINGLE_REGISTER,
    ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS,
  ].includes(functionCode);
}

/**
 * Check if a received packet is an exception response
 * @param functionCode The received function code
 */
export function isExceptionResponse(functionCode: number): boolean {
  return (functionCode & 0x80) !== 0;
}

/**
 * Create a Modbus error from an exception code
 * @param exceptionCode The exception code
 */
export function createModbusError(exceptionCode: ModbusExceptionCode): ModbusError {
  let message = 'Unknown Modbus Exception';

  switch (exceptionCode) {
    case ModbusExceptionCode.ILLEGAL_FUNCTION:
      message =
        'Illegal Function: The function code received in the query is not recognized or allowed by the server';
      break;
    case ModbusExceptionCode.ILLEGAL_DATA_ADDRESS:
      message =
        'Illegal Data Address: The data address received in the query is not an allowable address for the server';
      break;
    case ModbusExceptionCode.ILLEGAL_DATA_VALUE:
      message =
        'Illegal Data Value: A value contained in the query data field is not an allowable value for the server';
      break;
    case ModbusExceptionCode.SERVER_DEVICE_FAILURE:
      message =
        'Server Device Failure: An unrecoverable error occurred while the server was attempting to perform the requested action';
      break;
    case ModbusExceptionCode.ACKNOWLEDGE:
      message =
        'Acknowledge: The server has accepted the request but will require a long time to process it';
      break;
    case ModbusExceptionCode.SERVER_DEVICE_BUSY:
      message = 'Server Device Busy: The server is engaged in processing a long-duration command';
      break;
    case ModbusExceptionCode.NEGATIVE_ACKNOWLEDGE:
      message =
        'Negative Acknowledge: The server cannot perform the program function received in the query';
      break;
    case ModbusExceptionCode.MEMORY_PARITY_ERROR:
      message = 'Memory Parity Error: The server detected a parity error in the extended memory';
      break;
    case ModbusExceptionCode.GATEWAY_PATH_UNAVAILABLE:
      message =
        'Gateway Path Unavailable: The gateway was unable to allocate an internal communication path';
      break;
    case ModbusExceptionCode.GATEWAY_TARGET_DEVICE_FAILED_TO_RESPOND:
      message = 'Gateway Target Device Failed to Respond: The target device failed to respond';
      break;
  }

  return new ModbusError(message, exceptionCode);
}
