/**
 * Modbus Protocol Data Unit (PDU) utilities
 */
import { ModbusFunctionCode, ModbusExceptionCode } from './function-codes';
import { ModbusError } from '../../../core/errors';

/**
 * Create a Modbus PDU for reading coils
 * @param startAddress Starting address to read from
 * @param quantity Number of coils to read
 * @returns PDU buffer
 */
export function createReadCoilsPDU(startAddress: number, quantity: number): Buffer {
  const pdu = Buffer.alloc(5);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.READ_COILS, 0);

  // Starting address (2 bytes)
  pdu.writeUInt16BE(startAddress, 1);

  // Quantity of coils (2 bytes)
  pdu.writeUInt16BE(quantity, 3);

  return pdu;
}

/**
 * Create a Modbus PDU for reading discrete inputs
 * @param startAddress Starting address to read from
 * @param quantity Number of inputs to read
 * @returns PDU buffer
 */
export function createReadDiscreteInputsPDU(startAddress: number, quantity: number): Buffer {
  const pdu = Buffer.alloc(5);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.READ_DISCRETE_INPUTS, 0);

  // Starting address (2 bytes)
  pdu.writeUInt16BE(startAddress, 1);

  // Quantity of inputs (2 bytes)
  pdu.writeUInt16BE(quantity, 3);

  return pdu;
}

/**
 * Create a Modbus PDU for reading holding registers
 * @param startAddress Starting address to read from
 * @param quantity Number of registers to read
 * @returns PDU buffer
 */
export function createReadHoldingRegistersPDU(startAddress: number, quantity: number): Buffer {
  const pdu = Buffer.alloc(5);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.READ_HOLDING_REGISTERS, 0);

  // Starting address (2 bytes)
  pdu.writeUInt16BE(startAddress, 1);

  // Quantity of registers (2 bytes)
  pdu.writeUInt16BE(quantity, 3);

  return pdu;
}

/**
 * Create a Modbus PDU for reading input registers
 * @param startAddress Starting address to read from
 * @param quantity Number of registers to read
 * @returns PDU buffer
 */
export function createReadInputRegistersPDU(startAddress: number, quantity: number): Buffer {
  const pdu = Buffer.alloc(5);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.READ_INPUT_REGISTERS, 0);

  // Starting address (2 bytes)
  pdu.writeUInt16BE(startAddress, 1);

  // Quantity of registers (2 bytes)
  pdu.writeUInt16BE(quantity, 3);

  return pdu;
}

/**
 * Create a Modbus PDU for writing a single coil
 * @param address Address to write to
 * @param value Value to write (true = ON, false = OFF)
 * @returns PDU buffer
 */
export function createWriteSingleCoilPDU(address: number, value: boolean): Buffer {
  const pdu = Buffer.alloc(5);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.WRITE_SINGLE_COIL, 0);

  // Address (2 bytes)
  pdu.writeUInt16BE(address, 1);

  // Value (2 bytes) - 0xFF00 for ON, 0x0000 for OFF
  pdu.writeUInt16BE(value ? 0xff00 : 0x0000, 3);

  return pdu;
}

/**
 * Create a Modbus PDU for writing a single register
 * @param address Address to write to
 * @param value Value to write (16-bit integer)
 * @returns PDU buffer
 */
export function createWriteSingleRegisterPDU(address: number, value: number): Buffer {
  const pdu = Buffer.alloc(5);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.WRITE_SINGLE_REGISTER, 0);

  // Address (2 bytes)
  pdu.writeUInt16BE(address, 1);

  // Value (2 bytes)
  pdu.writeUInt16BE(value & 0xffff, 3);

  return pdu;
}

/**
 * Create a Modbus PDU for writing multiple coils
 * @param startAddress Starting address to write to
 * @param values Array of boolean values to write
 * @returns PDU buffer
 */
export function createWriteMultipleCoilsPDU(startAddress: number, values: boolean[]): Buffer {
  // Calculate the byte count needed for the values
  const byteCount = Math.ceil(values.length / 8);

  // Create the PDU buffer
  const pdu = Buffer.alloc(6 + byteCount);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.WRITE_MULTIPLE_COILS, 0);

  // Starting address (2 bytes)
  pdu.writeUInt16BE(startAddress, 1);

  // Quantity of coils (2 bytes)
  pdu.writeUInt16BE(values.length, 3);

  // Byte count (1 byte)
  pdu.writeUInt8(byteCount, 5);

  // Pack the boolean values into bytes
  const bytes = Buffer.alloc(byteCount);

  for (let i = 0; i < values.length; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = i % 8;

    if (values[i]) {
      bytes[byteIndex] |= 1 << bitIndex;
    }
  }

  // Copy the bytes into the PDU
  bytes.copy(pdu, 6);

  return pdu;
}

/**
 * Create a Modbus PDU for writing multiple registers
 * @param startAddress Starting address to write to
 * @param values Array of 16-bit values to write
 * @returns PDU buffer
 */
export function createWriteMultipleRegistersPDU(startAddress: number, values: number[]): Buffer {
  // Calculate the byte count
  const byteCount = values.length * 2;

  // Create the PDU buffer
  const pdu = Buffer.alloc(6 + byteCount);

  // Function code
  pdu.writeUInt8(ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS, 0);

  // Starting address (2 bytes)
  pdu.writeUInt16BE(startAddress, 1);

  // Quantity of registers (2 bytes)
  pdu.writeUInt16BE(values.length, 3);

  // Byte count (1 byte)
  pdu.writeUInt8(byteCount, 5);

  // Write the values
  for (let i = 0; i < values.length; i++) {
    pdu.writeUInt16BE(values[i] & 0xffff, 6 + i * 2);
  }

  return pdu;
}

/**
 * Parse a Modbus response PDU
 * @param pdu Response PDU buffer
 * @param expectedFunctionCode Expected function code
 * @returns Parsed response data
 */
export function parseResponsePDU(pdu: Buffer, expectedFunctionCode: number): any {
  if (!pdu || pdu.length === 0) {
    throw new Error('Empty or invalid PDU');
  }

  // Get the function code
  const functionCode = pdu.readUInt8(0);

  // Check if this is an exception response
  if (functionCode === (expectedFunctionCode | ModbusFunctionCode.EXCEPTION_MASK)) {
    // It's an exception - extract the exception code
    if (pdu.length < 2) {
      throw new Error('Invalid exception response PDU');
    }

    const exceptionCode = pdu.readUInt8(1);
    throw new ModbusError(
      `Modbus exception: ${exceptionCode}`,
      exceptionCode,
      expectedFunctionCode,
    );
  }

  // Verify the function code matches what we expected
  if (functionCode !== expectedFunctionCode) {
    throw new Error(
      `Unexpected function code in response. Expected: ${expectedFunctionCode}, Got: ${functionCode}`,
    );
  }

  // Parse based on function code
  switch (functionCode) {
    case ModbusFunctionCode.READ_COILS:
    case ModbusFunctionCode.READ_DISCRETE_INPUTS:
      return parseReadCoilsResponse(pdu);

    case ModbusFunctionCode.READ_HOLDING_REGISTERS:
    case ModbusFunctionCode.READ_INPUT_REGISTERS:
      return parseReadRegistersResponse(pdu);

    case ModbusFunctionCode.WRITE_SINGLE_COIL:
      return parseWriteSingleCoilResponse(pdu);

    case ModbusFunctionCode.WRITE_SINGLE_REGISTER:
      return parseWriteSingleRegisterResponse(pdu);

    case ModbusFunctionCode.WRITE_MULTIPLE_COILS:
      return parseWriteMultipleCoilsResponse(pdu);

    case ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS:
      return parseWriteMultipleRegistersResponse(pdu);

    default:
      throw new Error(`Unsupported function code: ${functionCode}`);
  }
}

/**
 * Parse a Modbus read coils/discrete inputs response
 * @param pdu Response PDU buffer
 * @returns Array of boolean values
 */
function parseReadCoilsResponse(pdu: Buffer): boolean[] {
  if (pdu.length < 2) {
    throw new Error('Invalid read coils response PDU');
  }

  // Get the byte count
  const byteCount = pdu.readUInt8(1);

  if (pdu.length < 2 + byteCount) {
    throw new Error('Response PDU is shorter than expected');
  }

  // Extract the coil values
  const values: boolean[] = [];

  for (let i = 0; i < byteCount; i++) {
    const byte = pdu.readUInt8(2 + i);

    // Each byte contains up to 8 coil values
    for (let bit = 0; bit < 8; bit++) {
      values.push((byte & (1 << bit)) !== 0);
    }
  }

  return values;
}

/**
 * Parse a Modbus read holding/input registers response
 * @param pdu Response PDU buffer
 * @returns Array of 16-bit register values
 */
function parseReadRegistersResponse(pdu: Buffer): number[] {
  if (pdu.length < 2) {
    throw new Error('Invalid read registers response PDU');
  }

  // Get the byte count
  const byteCount = pdu.readUInt8(1);

  if (pdu.length < 2 + byteCount) {
    throw new Error('Response PDU is shorter than expected');
  }

  // Calculate the number of registers
  const registerCount = byteCount / 2;

  // Extract the register values
  const values: number[] = [];

  for (let i = 0; i < registerCount; i++) {
    values.push(pdu.readUInt16BE(2 + i * 2));
  }

  return values;
}

/**
 * Parse a Modbus write single coil response
 * @param pdu Response PDU buffer
 * @returns Object with address and value
 */
function parseWriteSingleCoilResponse(pdu: Buffer): { address: number; value: boolean } {
  if (pdu.length < 5) {
    throw new Error('Invalid write single coil response PDU');
  }

  // Extract the address and value
  const address = pdu.readUInt16BE(1);
  const value = pdu.readUInt16BE(3) === 0xff00;

  return { address, value };
}

/**
 * Parse a Modbus write single register response
 * @param pdu Response PDU buffer
 * @returns Object with address and value
 */
function parseWriteSingleRegisterResponse(pdu: Buffer): { address: number; value: number } {
  if (pdu.length < 5) {
    throw new Error('Invalid write single register response PDU');
  }

  // Extract the address and value
  const address = pdu.readUInt16BE(1);
  const value = pdu.readUInt16BE(3);

  return { address, value };
}

/**
 * Parse a Modbus write multiple coils response
 * @param pdu Response PDU buffer
 * @returns Object with starting address and quantity
 */
function parseWriteMultipleCoilsResponse(pdu: Buffer): { address: number; quantity: number } {
  if (pdu.length < 5) {
    throw new Error('Invalid write multiple coils response PDU');
  }

  // Extract the address and quantity
  const address = pdu.readUInt16BE(1);
  const quantity = pdu.readUInt16BE(3);

  return { address, quantity };
}

/**
 * Parse a Modbus write multiple registers response
 * @param pdu Response PDU buffer
 * @returns Object with starting address and quantity
 */
function parseWriteMultipleRegistersResponse(pdu: Buffer): { address: number; quantity: number } {
  if (pdu.length < 5) {
    throw new Error('Invalid write multiple registers response PDU');
  }

  // Extract the address and quantity
  const address = pdu.readUInt16BE(1);
  const quantity = pdu.readUInt16BE(3);

  return { address, quantity };
}
