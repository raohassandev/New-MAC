/**
 * Modbus Function Codes
 */

/**
 * Modbus function codes as defined in the Modbus specification
 */
export enum ModbusFunctionCode {
  // Read operations
  READ_COILS = 0x01,
  READ_DISCRETE_INPUTS = 0x02,
  READ_HOLDING_REGISTERS = 0x03,
  READ_INPUT_REGISTERS = 0x04,

  // Write operations
  WRITE_SINGLE_COIL = 0x05,
  WRITE_SINGLE_REGISTER = 0x06,
  WRITE_MULTIPLE_COILS = 0x0f,
  WRITE_MULTIPLE_REGISTERS = 0x10,

  // Diagnostics
  READ_EXCEPTION_STATUS = 0x07,
  DIAGNOSTICS = 0x08,
  GET_COMM_EVENT_COUNTER = 0x0b,
  GET_COMM_EVENT_LOG = 0x0c,
  REPORT_SERVER_ID = 0x11,

  // File operations
  READ_FILE_RECORD = 0x14,
  WRITE_FILE_RECORD = 0x15,

  // Advanced
  MASK_WRITE_REGISTER = 0x16,
  READ_WRITE_MULTIPLE_REGISTERS = 0x17,
  READ_FIFO_QUEUE = 0x18,

  // Exception response (MSB set to 1)
  EXCEPTION_MASK = 0x80,
}

/**
 * Exception codes as defined in the Modbus specification
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
 * Diagnostic subfunctions for function code 0x08
 */
export enum ModbusDiagnosticSubfunction {
  RETURN_QUERY_DATA = 0x0000,
  RESTART_COMMUNICATIONS_OPTION = 0x0001,
  RETURN_DIAGNOSTIC_REGISTER = 0x0002,
  CHANGE_ASCII_INPUT_DELIMITER = 0x0003,
  FORCE_LISTEN_ONLY_MODE = 0x0004,
  CLEAR_COUNTERS_AND_DIAGNOSTIC_REGISTER = 0x000a,
  RETURN_BUS_MESSAGE_COUNT = 0x000b,
  RETURN_BUS_COMMUNICATION_ERROR_COUNT = 0x000c,
  RETURN_BUS_EXCEPTION_ERROR_COUNT = 0x000d,
  RETURN_SERVER_MESSAGE_COUNT = 0x000e,
  RETURN_SERVER_NO_RESPONSE_COUNT = 0x000f,
  RETURN_SERVER_NAK_COUNT = 0x0010,
  RETURN_SERVER_BUSY_COUNT = 0x0011,
  RETURN_BUS_CHARACTER_OVERRUN_COUNT = 0x0012,
  CLEAR_OVERRUN_COUNTER_AND_FLAG = 0x0014,
}

/**
 * Get human-readable name for a function code
 * @param code Modbus function code
 * @returns Human-readable name
 */
export function getFunctionCodeName(code: number): string {
  // Check if this is an exception response
  if ((code & ModbusFunctionCode.EXCEPTION_MASK) !== 0) {
    const originalCode = code & ~ModbusFunctionCode.EXCEPTION_MASK;
    return `EXCEPTION RESPONSE TO ${getFunctionCodeName(originalCode)}`;
  }

  switch (code) {
    case ModbusFunctionCode.READ_COILS:
      return 'Read Coils';
    case ModbusFunctionCode.READ_DISCRETE_INPUTS:
      return 'Read Discrete Inputs';
    case ModbusFunctionCode.READ_HOLDING_REGISTERS:
      return 'Read Holding Registers';
    case ModbusFunctionCode.READ_INPUT_REGISTERS:
      return 'Read Input Registers';
    case ModbusFunctionCode.WRITE_SINGLE_COIL:
      return 'Write Single Coil';
    case ModbusFunctionCode.WRITE_SINGLE_REGISTER:
      return 'Write Single Register';
    case ModbusFunctionCode.WRITE_MULTIPLE_COILS:
      return 'Write Multiple Coils';
    case ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS:
      return 'Write Multiple Registers';
    case ModbusFunctionCode.READ_EXCEPTION_STATUS:
      return 'Read Exception Status';
    case ModbusFunctionCode.DIAGNOSTICS:
      return 'Diagnostics';
    case ModbusFunctionCode.GET_COMM_EVENT_COUNTER:
      return 'Get Comm Event Counter';
    case ModbusFunctionCode.GET_COMM_EVENT_LOG:
      return 'Get Comm Event Log';
    case ModbusFunctionCode.REPORT_SERVER_ID:
      return 'Report Server ID';
    case ModbusFunctionCode.READ_FILE_RECORD:
      return 'Read File Record';
    case ModbusFunctionCode.WRITE_FILE_RECORD:
      return 'Write File Record';
    case ModbusFunctionCode.MASK_WRITE_REGISTER:
      return 'Mask Write Register';
    case ModbusFunctionCode.READ_WRITE_MULTIPLE_REGISTERS:
      return 'Read Write Multiple Registers';
    case ModbusFunctionCode.READ_FIFO_QUEUE:
      return 'Read FIFO Queue';
    default:
      return `Unknown Function Code (${code})`;
  }
}

/**
 * Get human-readable description for an exception code
 * @param code Modbus exception code
 * @returns Human-readable description
 */
export function getExceptionCodeDescription(code: number): string {
  switch (code) {
    case ModbusExceptionCode.ILLEGAL_FUNCTION:
      return 'Illegal Function (Code 01): The function code received in the query is not recognized or allowed by the device.';
    case ModbusExceptionCode.ILLEGAL_DATA_ADDRESS:
      return 'Illegal Data Address (Code 02): The data address received in the query is not an allowable address for the device.';
    case ModbusExceptionCode.ILLEGAL_DATA_VALUE:
      return 'Illegal Data Value (Code 03): A value contained in the query data field is not an allowable value for the device.';
    case ModbusExceptionCode.SERVER_DEVICE_FAILURE:
      return 'Server Device Failure (Code 04): An unrecoverable error occurred while the device was attempting to perform the requested action.';
    case ModbusExceptionCode.ACKNOWLEDGE:
      return 'Acknowledge (Code 05): The device has accepted the request and is processing it, but a long duration of time is required.';
    case ModbusExceptionCode.SERVER_DEVICE_BUSY:
      return 'Server Device Busy (Code 06): The device is engaged in processing a long-duration command. The client should retry later.';
    case ModbusExceptionCode.NEGATIVE_ACKNOWLEDGE:
      return 'Negative Acknowledge (Code 07): The device cannot perform the programming function received in the query.';
    case ModbusExceptionCode.MEMORY_PARITY_ERROR:
      return 'Memory Parity Error (Code 08): The device detected a parity error in the memory.';
    case ModbusExceptionCode.GATEWAY_PATH_UNAVAILABLE:
      return 'Gateway Path Unavailable (Code 0A): The gateway was unable to establish a path to the slave device.';
    case ModbusExceptionCode.GATEWAY_TARGET_DEVICE_FAILED_TO_RESPOND:
      return 'Gateway Target Device Failed to Respond (Code 0B): The gateway did not receive a response from the target device.';
    default:
      return `Unknown Exception Code (${code})`;
  }
}
