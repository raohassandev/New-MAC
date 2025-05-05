/**
 * Modbus Protocol Data Unit (PDU) handling
 * The PDU is the core of the Modbus protocol, consisting of a function code
 * and function-specific data.
 */

import { ModbusFunctionCode, isExceptionResponse, createModbusError, ModbusExceptionCode } from './function-codes';
import { ModbusError } from '../../../core/errors';

/**
 * Maximum PDU size in bytes (per Modbus spec)
 */
export const MAX_PDU_SIZE = 253;

/**
 * Functions for building Modbus PDUs
 */
export class ModbusPDU {
  /**
   * Create a PDU for reading coils
   * @param startAddress Starting address of coils to read
   * @param quantity Number of coils to read
   */
  static readCoils(startAddress: number, quantity: number): Buffer {
    if (quantity < 1 || quantity > 2000) {
      throw new Error('Quantity must be between 1 and 2000');
    }
    
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(ModbusFunctionCode.READ_COILS, 0);
    buffer.writeUInt16BE(startAddress, 1);
    buffer.writeUInt16BE(quantity, 3);
    
    return buffer;
  }
  
  /**
   * Create a PDU for reading discrete inputs
   * @param startAddress Starting address of inputs to read
   * @param quantity Number of inputs to read
   */
  static readDiscreteInputs(startAddress: number, quantity: number): Buffer {
    if (quantity < 1 || quantity > 2000) {
      throw new Error('Quantity must be between 1 and 2000');
    }
    
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(ModbusFunctionCode.READ_DISCRETE_INPUTS, 0);
    buffer.writeUInt16BE(startAddress, 1);
    buffer.writeUInt16BE(quantity, 3);
    
    return buffer;
  }
  
  /**
   * Create a PDU for reading holding registers
   * @param startAddress Starting address of registers to read
   * @param quantity Number of registers to read
   */
  static readHoldingRegisters(startAddress: number, quantity: number): Buffer {
    if (quantity < 1 || quantity > 125) {
      throw new Error('Quantity must be between 1 and 125');
    }
    
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(ModbusFunctionCode.READ_HOLDING_REGISTERS, 0);
    buffer.writeUInt16BE(startAddress, 1);
    buffer.writeUInt16BE(quantity, 3);
    
    return buffer;
  }
  
  /**
   * Create a PDU for reading input registers
   * @param startAddress Starting address of registers to read
   * @param quantity Number of registers to read
   */
  static readInputRegisters(startAddress: number, quantity: number): Buffer {
    if (quantity < 1 || quantity > 125) {
      throw new Error('Quantity must be between 1 and 125');
    }
    
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(ModbusFunctionCode.READ_INPUT_REGISTERS, 0);
    buffer.writeUInt16BE(startAddress, 1);
    buffer.writeUInt16BE(quantity, 3);
    
    return buffer;
  }
  
  /**
   * Create a PDU for writing a single coil
   * @param address Address of the coil to write
   * @param value Value to write (true/false)
   */
  static writeSingleCoil(address: number, value: boolean): Buffer {
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(ModbusFunctionCode.WRITE_SINGLE_COIL, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value ? 0xFF00 : 0x0000, 3);
    
    return buffer;
  }
  
  /**
   * Create a PDU for writing a single register
   * @param address Address of the register to write
   * @param value Value to write (0-65535)
   */
  static writeSingleRegister(address: number, value: number): Buffer {
    if (value < 0 || value > 0xFFFF) {
      throw new Error('Value must be between 0 and 65535');
    }
    
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(ModbusFunctionCode.WRITE_SINGLE_REGISTER, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value, 3);
    
    return buffer;
  }
  
  /**
   * Create a PDU for writing multiple coils
   * @param startAddress Starting address of coils to write
   * @param values Values to write (array of booleans)
   */
  static writeMultipleCoils(startAddress: number, values: boolean[]): Buffer {
    if (values.length < 1 || values.length > 1968) {
      throw new Error('Number of values must be between 1 and 1968');
    }
    
    // Calculate number of bytes needed to store the boolean values
    const byteCount = Math.ceil(values.length / 8);
    
    // Create a buffer for the PDU
    const buffer = Buffer.alloc(6 + byteCount);
    buffer.writeUInt8(ModbusFunctionCode.WRITE_MULTIPLE_COILS, 0);
    buffer.writeUInt16BE(startAddress, 1);
    buffer.writeUInt16BE(values.length, 3);
    buffer.writeUInt8(byteCount, 5);
    
    // Fill the data bytes with the boolean values
    for (let i = 0; i < byteCount; i++) {
      let byte = 0;
      
      for (let j = 0; j < 8; j++) {
        const valueIndex = i * 8 + j;
        
        if (valueIndex < values.length && values[valueIndex]) {
          byte |= (1 << j);
        }
      }
      
      buffer.writeUInt8(byte, 6 + i);
    }
    
    return buffer;
  }
  
  /**
   * Create a PDU for writing multiple registers
   * @param startAddress Starting address of registers to write
   * @param values Values to write (array of numbers)
   */
  static writeMultipleRegisters(startAddress: number, values: number[]): Buffer {
    if (values.length < 1 || values.length > 123) {
      throw new Error('Number of values must be between 1 and 123');
    }
    
    // Each value is 2 bytes
    const byteCount = values.length * 2;
    
    // Create a buffer for the PDU
    const buffer = Buffer.alloc(6 + byteCount);
    buffer.writeUInt8(ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS, 0);
    buffer.writeUInt16BE(startAddress, 1);
    buffer.writeUInt16BE(values.length, 3);
    buffer.writeUInt8(byteCount, 5);
    
    // Fill the data bytes with the register values
    for (let i = 0; i < values.length; i++) {
      if (values[i] < 0 || values[i] > 0xFFFF) {
        throw new Error(`Value at index ${i} must be between 0 and 65535`);
      }
      
      buffer.writeUInt16BE(values[i], 6 + i * 2);
    }
    
    return buffer;
  }
  
  /**
   * Create a PDU for the mask write register function
   * @param address Address of the register to modify
   * @param andMask AND mask to apply
   * @param orMask OR mask to apply
   */
  static maskWriteRegister(address: number, andMask: number, orMask: number): Buffer {
    if (andMask < 0 || andMask > 0xFFFF || orMask < 0 || orMask > 0xFFFF) {
      throw new Error('Mask values must be between 0 and 65535');
    }
    
    const buffer = Buffer.alloc(7);
    buffer.writeUInt8(ModbusFunctionCode.MASK_WRITE_REGISTER, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(andMask, 3);
    buffer.writeUInt16BE(orMask, 5);
    
    return buffer;
  }
  
  /**
   * Create a PDU for the read/write multiple registers function
   * @param readStartAddress Starting address of registers to read
   * @param readQuantity Number of registers to read
   * @param writeStartAddress Starting address of registers to write
   * @param writeValues Values to write (array of numbers)
   */
  static readWriteMultipleRegisters(
    readStartAddress: number,
    readQuantity: number,
    writeStartAddress: number,
    writeValues: number[]
  ): Buffer {
    if (readQuantity < 1 || readQuantity > 125) {
      throw new Error('Read quantity must be between 1 and 125');
    }
    
    if (writeValues.length < 1 || writeValues.length > 121) {
      throw new Error('Number of write values must be between 1 and 121');
    }
    
    // Each value is 2 bytes
    const byteCount = writeValues.length * 2;
    
    // Create a buffer for the PDU
    const buffer = Buffer.alloc(10 + byteCount);
    buffer.writeUInt8(ModbusFunctionCode.READ_WRITE_MULTIPLE_REGISTERS, 0);
    buffer.writeUInt16BE(readStartAddress, 1);
    buffer.writeUInt16BE(readQuantity, 3);
    buffer.writeUInt16BE(writeStartAddress, 5);
    buffer.writeUInt16BE(writeValues.length, 7);
    buffer.writeUInt8(byteCount, 9);
    
    // Fill the data bytes with the register values
    for (let i = 0; i < writeValues.length; i++) {
      if (writeValues[i] < 0 || writeValues[i] > 0xFFFF) {
        throw new Error(`Value at index ${i} must be between 0 and 65535`);
      }
      
      buffer.writeUInt16BE(writeValues[i], 10 + i * 2);
    }
    
    return buffer;
  }
  
  /**
   * Parse a Modbus response PDU
   * @param data The response PDU buffer
   * @param functionCode The expected function code
   */
  static parseResponse(data: Buffer, functionCode: ModbusFunctionCode): Buffer {
    if (data.length < 1) {
      throw new Error('Invalid Modbus response: too short');
    }
    
    const responseCode = data.readUInt8(0);
    
    // Check if this is an exception response
    if (isExceptionResponse(responseCode)) {
      if (data.length < 2) {
        throw new Error('Invalid Modbus exception response: too short');
      }
      
      const exceptionCode = data.readUInt8(1) as ModbusExceptionCode;
      throw createModbusError(exceptionCode);
    }
    
    // Check if the function code matches the expected one
    if (responseCode !== functionCode) {
      throw new ModbusError(`Unexpected function code in response: expected ${functionCode}, got ${responseCode}`);
    }
    
    // Return the data portion of the PDU (everything after the function code)
    return data.slice(1);
  }
  
  /**
   * Parse a response to a read coils request
   * @param data The response PDU
   * @param quantity The number of coils requested
   */
  static parseReadCoilsResponse(data: Buffer, quantity: number): boolean[] {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.READ_COILS);
    
    if (responsePdu.length < 1) {
      throw new Error('Invalid read coils response: missing byte count');
    }
    
    const byteCount = responsePdu.readUInt8(0);
    
    if (responsePdu.length !== byteCount + 1) {
      throw new Error(`Invalid read coils response: expected ${byteCount + 1} bytes, got ${responsePdu.length}`);
    }
    
    // Extract the boolean values
    const values: boolean[] = [];
    
    for (let i = 0; i < quantity; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      
      if (byteIndex < byteCount) {
        const byte = responsePdu.readUInt8(1 + byteIndex);
        values.push((byte & (1 << bitIndex)) !== 0);
      } else {
        values.push(false);
      }
    }
    
    return values;
  }
  
  /**
   * Parse a response to a read discrete inputs request
   * @param data The response PDU
   * @param quantity The number of inputs requested
   */
  static parseReadDiscreteInputsResponse(data: Buffer, quantity: number): boolean[] {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.READ_DISCRETE_INPUTS);
    
    if (responsePdu.length < 1) {
      throw new Error('Invalid read discrete inputs response: missing byte count');
    }
    
    const byteCount = responsePdu.readUInt8(0);
    
    if (responsePdu.length !== byteCount + 1) {
      throw new Error(`Invalid read discrete inputs response: expected ${byteCount + 1} bytes, got ${responsePdu.length}`);
    }
    
    // Extract the boolean values (same as for read coils)
    const values: boolean[] = [];
    
    for (let i = 0; i < quantity; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      
      if (byteIndex < byteCount) {
        const byte = responsePdu.readUInt8(1 + byteIndex);
        values.push((byte & (1 << bitIndex)) !== 0);
      } else {
        values.push(false);
      }
    }
    
    return values;
  }
  
  /**
   * Parse a response to a read holding registers request
   * @param data The response PDU
   */
  static parseReadHoldingRegistersResponse(data: Buffer): number[] {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.READ_HOLDING_REGISTERS);
    
    if (responsePdu.length < 1) {
      throw new Error('Invalid read holding registers response: missing byte count');
    }
    
    const byteCount = responsePdu.readUInt8(0);
    
    if (responsePdu.length !== byteCount + 1) {
      throw new Error(`Invalid read holding registers response: expected ${byteCount + 1} bytes, got ${responsePdu.length}`);
    }
    
    if (byteCount % 2 !== 0) {
      throw new Error('Invalid read holding registers response: byte count must be even');
    }
    
    // Extract the register values
    const values: number[] = [];
    const registerCount = byteCount / 2;
    
    for (let i = 0; i < registerCount; i++) {
      values.push(responsePdu.readUInt16BE(1 + i * 2));
    }
    
    return values;
  }
  
  /**
   * Parse a response to a read input registers request
   * @param data The response PDU
   */
  static parseReadInputRegistersResponse(data: Buffer): number[] {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.READ_INPUT_REGISTERS);
    
    if (responsePdu.length < 1) {
      throw new Error('Invalid read input registers response: missing byte count');
    }
    
    const byteCount = responsePdu.readUInt8(0);
    
    if (responsePdu.length !== byteCount + 1) {
      throw new Error(`Invalid read input registers response: expected ${byteCount + 1} bytes, got ${responsePdu.length}`);
    }
    
    if (byteCount % 2 !== 0) {
      throw new Error('Invalid read input registers response: byte count must be even');
    }
    
    // Extract the register values (same as for read holding registers)
    const values: number[] = [];
    const registerCount = byteCount / 2;
    
    for (let i = 0; i < registerCount; i++) {
      values.push(responsePdu.readUInt16BE(1 + i * 2));
    }
    
    return values;
  }
  
  /**
   * Parse a response to a write single coil request
   * @param data The response PDU
   */
  static parseWriteSingleCoilResponse(data: Buffer): { address: number; value: boolean } {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.WRITE_SINGLE_COIL);
    
    if (responsePdu.length !== 4) {
      throw new Error(`Invalid write single coil response: expected 4 bytes, got ${responsePdu.length}`);
    }
    
    const address = responsePdu.readUInt16BE(0);
    const value = responsePdu.readUInt16BE(2) === 0xFF00;
    
    return { address, value };
  }
  
  /**
   * Parse a response to a write single register request
   * @param data The response PDU
   */
  static parseWriteSingleRegisterResponse(data: Buffer): { address: number; value: number } {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.WRITE_SINGLE_REGISTER);
    
    if (responsePdu.length !== 4) {
      throw new Error(`Invalid write single register response: expected 4 bytes, got ${responsePdu.length}`);
    }
    
    const address = responsePdu.readUInt16BE(0);
    const value = responsePdu.readUInt16BE(2);
    
    return { address, value };
  }
  
  /**
   * Parse a response to a write multiple coils request
   * @param data The response PDU
   */
  static parseWriteMultipleCoilsResponse(data: Buffer): { startAddress: number; quantity: number } {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.WRITE_MULTIPLE_COILS);
    
    if (responsePdu.length !== 4) {
      throw new Error(`Invalid write multiple coils response: expected 4 bytes, got ${responsePdu.length}`);
    }
    
    const startAddress = responsePdu.readUInt16BE(0);
    const quantity = responsePdu.readUInt16BE(2);
    
    return { startAddress, quantity };
  }
  
  /**
   * Parse a response to a write multiple registers request
   * @param data The response PDU
   */
  static parseWriteMultipleRegistersResponse(data: Buffer): { startAddress: number; quantity: number } {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS);
    
    if (responsePdu.length !== 4) {
      throw new Error(`Invalid write multiple registers response: expected 4 bytes, got ${responsePdu.length}`);
    }
    
    const startAddress = responsePdu.readUInt16BE(0);
    const quantity = responsePdu.readUInt16BE(2);
    
    return { startAddress, quantity };
  }
  
  /**
   * Parse a response to a mask write register request
   * @param data The response PDU
   */
  static parseMaskWriteRegisterResponse(data: Buffer): { address: number; andMask: number; orMask: number } {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.MASK_WRITE_REGISTER);
    
    if (responsePdu.length !== 6) {
      throw new Error(`Invalid mask write register response: expected 6 bytes, got ${responsePdu.length}`);
    }
    
    const address = responsePdu.readUInt16BE(0);
    const andMask = responsePdu.readUInt16BE(2);
    const orMask = responsePdu.readUInt16BE(4);
    
    return { address, andMask, orMask };
  }
  
  /**
   * Parse a response to a read/write multiple registers request
   * @param data The response PDU
   */
  static parseReadWriteMultipleRegistersResponse(data: Buffer): number[] {
    // Validate the response
    const responsePdu = this.parseResponse(data, ModbusFunctionCode.READ_WRITE_MULTIPLE_REGISTERS);
    
    if (responsePdu.length < 1) {
      throw new Error('Invalid read/write multiple registers response: missing byte count');
    }
    
    const byteCount = responsePdu.readUInt8(0);
    
    if (responsePdu.length !== byteCount + 1) {
      throw new Error(`Invalid read/write multiple registers response: expected ${byteCount + 1} bytes, got ${responsePdu.length}`);
    }
    
    if (byteCount % 2 !== 0) {
      throw new Error('Invalid read/write multiple registers response: byte count must be even');
    }
    
    // Extract the register values (read values only, same format as read holding registers)
    const values: number[] = [];
    const registerCount = byteCount / 2;
    
    for (let i = 0; i < registerCount; i++) {
      values.push(responsePdu.readUInt16BE(1 + i * 2));
    }
    
    return values;
  }
}