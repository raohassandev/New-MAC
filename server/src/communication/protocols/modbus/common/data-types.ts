/**
 * Modbus data type conversions
 * Handles conversion between Modbus register values and JavaScript types
 */

import { ByteOrder, DataType } from '../../../core/types';
import { ConversionError } from '../../../core/errors';

/**
 * Interface for a data type converter
 */
export interface DataTypeConverter {
  /**
   * Convert from raw register values to a typed value
   * @param registers Array of 16-bit register values to convert
   * @param byteOrder Byte ordering
   */
  fromRegisters(registers: number[], byteOrder?: ByteOrder): any;
  
  /**
   * Convert from a typed value to raw register values
   * @param value Value to convert
   * @param byteOrder Byte ordering
   */
  toRegisters(value: any, byteOrder?: ByteOrder): number[];
  
  /**
   * Get the size of this data type in registers
   */
  size: number;
}

/**
 * Boolean data type converter (1 bit)
 */
export const BooleanConverter: DataTypeConverter = {
  fromRegisters(registers: number[]): boolean {
    if (registers.length < 1) {
      throw new ConversionError('Not enough registers for Boolean conversion');
    }
    return registers[0] !== 0;
  },
  
  toRegisters(value: boolean): number[] {
    return [value ? 1 : 0];
  },
  
  size: 1
};

/**
 * Int16 data type converter (16-bit signed integer)
 */
export const Int16Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.AB): number {
    if (registers.length < 1) {
      throw new ConversionError('Not enough registers for Int16 conversion');
    }
    
    let value = registers[0];
    
    // Apply byte swapping if needed
    if (byteOrder === ByteOrder.BA) {
      value = ((value & 0xFF) << 8) | ((value >> 8) & 0xFF);
    }
    
    // Convert to signed
    if (value > 0x7FFF) {
      value = value - 0x10000;
    }
    
    return value;
  },
  
  toRegisters(value: number, byteOrder: ByteOrder = ByteOrder.AB): number[] {
    if (value < -32768 || value > 32767) {
      throw new ConversionError('Value out of range for Int16');
    }
    
    // Convert to unsigned 16-bit
    let unsignedValue = value < 0 ? value + 0x10000 : value;
    
    // Apply byte swapping if needed
    if (byteOrder === ByteOrder.BA) {
      unsignedValue = ((unsignedValue & 0xFF) << 8) | ((unsignedValue >> 8) & 0xFF);
    }
    
    return [unsignedValue];
  },
  
  size: 1
};

/**
 * UInt16 data type converter (16-bit unsigned integer)
 */
export const UInt16Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.AB): number {
    if (registers.length < 1) {
      throw new ConversionError('Not enough registers for UInt16 conversion');
    }
    
    let value = registers[0];
    
    // Apply byte swapping if needed
    if (byteOrder === ByteOrder.BA) {
      value = ((value & 0xFF) << 8) | ((value >> 8) & 0xFF);
    }
    
    return value;
  },
  
  toRegisters(value: number, byteOrder: ByteOrder = ByteOrder.AB): number[] {
    if (value < 0 || value > 65535) {
      throw new ConversionError('Value out of range for UInt16');
    }
    
    // Apply byte swapping if needed
    let unsignedValue = value;
    if (byteOrder === ByteOrder.BA) {
      unsignedValue = ((unsignedValue & 0xFF) << 8) | ((unsignedValue >> 8) & 0xFF);
    }
    
    return [unsignedValue];
  },
  
  size: 1
};

/**
 * Int32 data type converter (32-bit signed integer)
 */
export const Int32Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.ABCD): number {
    if (registers.length < 2) {
      throw new ConversionError('Not enough registers for Int32 conversion');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(4);
    
    // Fill the buffer based on the byte order
    switch (byteOrder) {
      case ByteOrder.ABCD:
        buffer.writeUInt16BE(registers[0], 0);
        buffer.writeUInt16BE(registers[1], 2);
        break;
      case ByteOrder.CDAB:
        buffer.writeUInt16BE(registers[1], 0);
        buffer.writeUInt16BE(registers[0], 2);
        break;
      case ByteOrder.BADC:
        buffer.writeUInt16LE(registers[0], 2);
        buffer.writeUInt16LE(registers[1], 0);
        break;
      case ByteOrder.DCBA:
        buffer.writeUInt16LE(registers[0], 0);
        buffer.writeUInt16LE(registers[1], 2);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Int32: ${byteOrder}`);
    }
    
    return buffer.readInt32BE(0);
  },
  
  toRegisters(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): number[] {
    if (value < -2147483648 || value > 2147483647) {
      throw new ConversionError('Value out of range for Int32');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(4);
    
    // Write the value to the buffer
    buffer.writeInt32BE(value, 0);
    
    // Read the registers based on the byte order
    let highWord, lowWord;
    switch (byteOrder) {
      case ByteOrder.ABCD:
        highWord = buffer.readUInt16BE(0);
        lowWord = buffer.readUInt16BE(2);
        break;
      case ByteOrder.CDAB:
        highWord = buffer.readUInt16BE(2);
        lowWord = buffer.readUInt16BE(0);
        break;
      case ByteOrder.BADC:
        highWord = buffer.readUInt16LE(2);
        lowWord = buffer.readUInt16LE(0);
        break;
      case ByteOrder.DCBA:
        highWord = buffer.readUInt16LE(0);
        lowWord = buffer.readUInt16LE(2);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Int32: ${byteOrder}`);
    }
    
    return [highWord, lowWord];
  },
  
  size: 2
};

/**
 * UInt32 data type converter (32-bit unsigned integer)
 */
export const UInt32Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.ABCD): number {
    if (registers.length < 2) {
      throw new ConversionError('Not enough registers for UInt32 conversion');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(4);
    
    // Fill the buffer based on the byte order
    switch (byteOrder) {
      case ByteOrder.ABCD:
        buffer.writeUInt16BE(registers[0], 0);
        buffer.writeUInt16BE(registers[1], 2);
        break;
      case ByteOrder.CDAB:
        buffer.writeUInt16BE(registers[1], 0);
        buffer.writeUInt16BE(registers[0], 2);
        break;
      case ByteOrder.BADC:
        buffer.writeUInt16LE(registers[0], 2);
        buffer.writeUInt16LE(registers[1], 0);
        break;
      case ByteOrder.DCBA:
        buffer.writeUInt16LE(registers[0], 0);
        buffer.writeUInt16LE(registers[1], 2);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for UInt32: ${byteOrder}`);
    }
    
    return buffer.readUInt32BE(0);
  },
  
  toRegisters(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): number[] {
    if (value < 0 || value > 4294967295) {
      throw new ConversionError('Value out of range for UInt32');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(4);
    
    // Write the value to the buffer
    buffer.writeUInt32BE(value, 0);
    
    // Read the registers based on the byte order
    let highWord, lowWord;
    switch (byteOrder) {
      case ByteOrder.ABCD:
        highWord = buffer.readUInt16BE(0);
        lowWord = buffer.readUInt16BE(2);
        break;
      case ByteOrder.CDAB:
        highWord = buffer.readUInt16BE(2);
        lowWord = buffer.readUInt16BE(0);
        break;
      case ByteOrder.BADC:
        highWord = buffer.readUInt16LE(2);
        lowWord = buffer.readUInt16LE(0);
        break;
      case ByteOrder.DCBA:
        highWord = buffer.readUInt16LE(0);
        lowWord = buffer.readUInt16LE(2);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for UInt32: ${byteOrder}`);
    }
    
    return [highWord, lowWord];
  },
  
  size: 2
};

/**
 * Float32 data type converter (32-bit floating point)
 */
export const Float32Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.ABCD): number {
    if (registers.length < 2) {
      throw new ConversionError('Not enough registers for Float32 conversion');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(4);
    
    // Fill the buffer based on the byte order
    switch (byteOrder) {
      case ByteOrder.ABCD:
        buffer.writeUInt16BE(registers[0], 0);
        buffer.writeUInt16BE(registers[1], 2);
        break;
      case ByteOrder.CDAB:
        buffer.writeUInt16BE(registers[1], 0);
        buffer.writeUInt16BE(registers[0], 2);
        break;
      case ByteOrder.BADC:
        buffer.writeUInt16LE(registers[0], 2);
        buffer.writeUInt16LE(registers[1], 0);
        break;
      case ByteOrder.DCBA:
        buffer.writeUInt16LE(registers[0], 0);
        buffer.writeUInt16LE(registers[1], 2);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Float32: ${byteOrder}`);
    }
    
    return buffer.readFloatBE(0);
  },
  
  toRegisters(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): number[] {
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(4);
    
    // Write the value to the buffer
    buffer.writeFloatBE(value, 0);
    
    // Read the registers based on the byte order
    let highWord, lowWord;
    switch (byteOrder) {
      case ByteOrder.ABCD:
        highWord = buffer.readUInt16BE(0);
        lowWord = buffer.readUInt16BE(2);
        break;
      case ByteOrder.CDAB:
        highWord = buffer.readUInt16BE(2);
        lowWord = buffer.readUInt16BE(0);
        break;
      case ByteOrder.BADC:
        highWord = buffer.readUInt16LE(2);
        lowWord = buffer.readUInt16LE(0);
        break;
      case ByteOrder.DCBA:
        highWord = buffer.readUInt16LE(0);
        lowWord = buffer.readUInt16LE(2);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Float32: ${byteOrder}`);
    }
    
    return [highWord, lowWord];
  },
  
  size: 2
};

/**
 * Float64 data type converter (64-bit floating point)
 */
export const Float64Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.ABCD): number {
    if (registers.length < 4) {
      throw new ConversionError('Not enough registers for Float64 conversion');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(8);
    
    // Fill the buffer based on the byte order
    switch (byteOrder) {
      case ByteOrder.ABCD:
        buffer.writeUInt16BE(registers[0], 0);
        buffer.writeUInt16BE(registers[1], 2);
        buffer.writeUInt16BE(registers[2], 4);
        buffer.writeUInt16BE(registers[3], 6);
        break;
      case ByteOrder.CDAB:
        buffer.writeUInt16BE(registers[1], 0);
        buffer.writeUInt16BE(registers[0], 2);
        buffer.writeUInt16BE(registers[3], 4);
        buffer.writeUInt16BE(registers[2], 6);
        break;
      case ByteOrder.BADC:
        buffer.writeUInt16LE(registers[0], 2);
        buffer.writeUInt16LE(registers[1], 0);
        buffer.writeUInt16LE(registers[2], 6);
        buffer.writeUInt16LE(registers[3], 4);
        break;
      case ByteOrder.DCBA:
        buffer.writeUInt16LE(registers[0], 0);
        buffer.writeUInt16LE(registers[1], 2);
        buffer.writeUInt16LE(registers[2], 4);
        buffer.writeUInt16LE(registers[3], 6);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Float64: ${byteOrder}`);
    }
    
    return buffer.readDoubleBE(0);
  },
  
  toRegisters(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): number[] {
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(8);
    
    // Write the value to the buffer
    buffer.writeDoubleBE(value, 0);
    
    // Read the registers based on the byte order
    const result = new Array(4);
    switch (byteOrder) {
      case ByteOrder.ABCD:
        result[0] = buffer.readUInt16BE(0);
        result[1] = buffer.readUInt16BE(2);
        result[2] = buffer.readUInt16BE(4);
        result[3] = buffer.readUInt16BE(6);
        break;
      case ByteOrder.CDAB:
        result[0] = buffer.readUInt16BE(2);
        result[1] = buffer.readUInt16BE(0);
        result[2] = buffer.readUInt16BE(6);
        result[3] = buffer.readUInt16BE(4);
        break;
      case ByteOrder.BADC:
        result[0] = buffer.readUInt16LE(2);
        result[1] = buffer.readUInt16LE(0);
        result[2] = buffer.readUInt16LE(6);
        result[3] = buffer.readUInt16LE(4);
        break;
      case ByteOrder.DCBA:
        result[0] = buffer.readUInt16LE(0);
        result[1] = buffer.readUInt16LE(2);
        result[2] = buffer.readUInt16LE(4);
        result[3] = buffer.readUInt16LE(6);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Float64: ${byteOrder}`);
    }
    
    return result;
  },
  
  size: 4
};

/**
 * Int64 data type converter (64-bit signed integer)
 * Note: JavaScript can only represent integers up to 2^53 - 1 accurately
 */
export const Int64Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.ABCD): bigint {
    if (registers.length < 4) {
      throw new ConversionError('Not enough registers for Int64 conversion');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(8);
    
    // Fill the buffer based on the byte order
    switch (byteOrder) {
      case ByteOrder.ABCD:
        buffer.writeUInt16BE(registers[0], 0);
        buffer.writeUInt16BE(registers[1], 2);
        buffer.writeUInt16BE(registers[2], 4);
        buffer.writeUInt16BE(registers[3], 6);
        break;
      case ByteOrder.CDAB:
        buffer.writeUInt16BE(registers[1], 0);
        buffer.writeUInt16BE(registers[0], 2);
        buffer.writeUInt16BE(registers[3], 4);
        buffer.writeUInt16BE(registers[2], 6);
        break;
      case ByteOrder.BADC:
        buffer.writeUInt16LE(registers[0], 2);
        buffer.writeUInt16LE(registers[1], 0);
        buffer.writeUInt16LE(registers[2], 6);
        buffer.writeUInt16LE(registers[3], 4);
        break;
      case ByteOrder.DCBA:
        buffer.writeUInt16LE(registers[0], 0);
        buffer.writeUInt16LE(registers[1], 2);
        buffer.writeUInt16LE(registers[2], 4);
        buffer.writeUInt16LE(registers[3], 6);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Int64: ${byteOrder}`);
    }
    
    return buffer.readBigInt64BE(0);
  },
  
  toRegisters(value: bigint, byteOrder: ByteOrder = ByteOrder.ABCD): number[] {
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(8);
    
    // Write the value to the buffer
    buffer.writeBigInt64BE(value, 0);
    
    // Read the registers based on the byte order
    const result = new Array(4);
    switch (byteOrder) {
      case ByteOrder.ABCD:
        result[0] = buffer.readUInt16BE(0);
        result[1] = buffer.readUInt16BE(2);
        result[2] = buffer.readUInt16BE(4);
        result[3] = buffer.readUInt16BE(6);
        break;
      case ByteOrder.CDAB:
        result[0] = buffer.readUInt16BE(2);
        result[1] = buffer.readUInt16BE(0);
        result[2] = buffer.readUInt16BE(6);
        result[3] = buffer.readUInt16BE(4);
        break;
      case ByteOrder.BADC:
        result[0] = buffer.readUInt16LE(2);
        result[1] = buffer.readUInt16LE(0);
        result[2] = buffer.readUInt16LE(6);
        result[3] = buffer.readUInt16LE(4);
        break;
      case ByteOrder.DCBA:
        result[0] = buffer.readUInt16LE(0);
        result[1] = buffer.readUInt16LE(2);
        result[2] = buffer.readUInt16LE(4);
        result[3] = buffer.readUInt16LE(6);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for Int64: ${byteOrder}`);
    }
    
    return result;
  },
  
  size: 4
};

/**
 * UInt64 data type converter (64-bit unsigned integer)
 * Note: JavaScript can only represent integers up to 2^53 - 1 accurately
 */
export const UInt64Converter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.ABCD): bigint {
    if (registers.length < 4) {
      throw new ConversionError('Not enough registers for UInt64 conversion');
    }
    
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(8);
    
    // Fill the buffer based on the byte order
    switch (byteOrder) {
      case ByteOrder.ABCD:
        buffer.writeUInt16BE(registers[0], 0);
        buffer.writeUInt16BE(registers[1], 2);
        buffer.writeUInt16BE(registers[2], 4);
        buffer.writeUInt16BE(registers[3], 6);
        break;
      case ByteOrder.CDAB:
        buffer.writeUInt16BE(registers[1], 0);
        buffer.writeUInt16BE(registers[0], 2);
        buffer.writeUInt16BE(registers[3], 4);
        buffer.writeUInt16BE(registers[2], 6);
        break;
      case ByteOrder.BADC:
        buffer.writeUInt16LE(registers[0], 2);
        buffer.writeUInt16LE(registers[1], 0);
        buffer.writeUInt16LE(registers[2], 6);
        buffer.writeUInt16LE(registers[3], 4);
        break;
      case ByteOrder.DCBA:
        buffer.writeUInt16LE(registers[0], 0);
        buffer.writeUInt16LE(registers[1], 2);
        buffer.writeUInt16LE(registers[2], 4);
        buffer.writeUInt16LE(registers[3], 6);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for UInt64: ${byteOrder}`);
    }
    
    return buffer.readBigUInt64BE(0);
  },
  
  toRegisters(value: bigint, byteOrder: ByteOrder = ByteOrder.ABCD): number[] {
    // Create a buffer to hold the bytes
    const buffer = Buffer.alloc(8);
    
    // Write the value to the buffer
    buffer.writeBigUInt64BE(value, 0);
    
    // Read the registers based on the byte order
    const result = new Array(4);
    switch (byteOrder) {
      case ByteOrder.ABCD:
        result[0] = buffer.readUInt16BE(0);
        result[1] = buffer.readUInt16BE(2);
        result[2] = buffer.readUInt16BE(4);
        result[3] = buffer.readUInt16BE(6);
        break;
      case ByteOrder.CDAB:
        result[0] = buffer.readUInt16BE(2);
        result[1] = buffer.readUInt16BE(0);
        result[2] = buffer.readUInt16BE(6);
        result[3] = buffer.readUInt16BE(4);
        break;
      case ByteOrder.BADC:
        result[0] = buffer.readUInt16LE(2);
        result[1] = buffer.readUInt16LE(0);
        result[2] = buffer.readUInt16LE(6);
        result[3] = buffer.readUInt16LE(4);
        break;
      case ByteOrder.DCBA:
        result[0] = buffer.readUInt16LE(0);
        result[1] = buffer.readUInt16LE(2);
        result[2] = buffer.readUInt16LE(4);
        result[3] = buffer.readUInt16LE(6);
        break;
      default:
        throw new ConversionError(`Unsupported byte order for UInt64: ${byteOrder}`);
    }
    
    return result;
  },
  
  size: 4
};

/**
 * String data type converter (ASCII string)
 */
export const StringConverter: DataTypeConverter = {
  fromRegisters(registers: number[], byteOrder: ByteOrder = ByteOrder.AB): string {
    if (registers.length < 1) {
      throw new ConversionError('Not enough registers for String conversion');
    }
    
    // Create a buffer to hold all the bytes
    const buffer = Buffer.alloc(registers.length * 2);
    
    // Fill the buffer based on the byte order
    for (let i = 0; i < registers.length; i++) {
      if (byteOrder === ByteOrder.AB) {
        buffer.writeUInt16BE(registers[i], i * 2);
      } else if (byteOrder === ByteOrder.BA) {
        buffer.writeUInt16LE(registers[i], i * 2);
      } else {
        throw new ConversionError(`Unsupported byte order for String: ${byteOrder}`);
      }
    }
    
    // Convert buffer to string and trim nulls
    let string = buffer.toString('ascii');
    const nullIndex = string.indexOf('\0');
    if (nullIndex !== -1) {
      string = string.substring(0, nullIndex);
    }
    
    return string;
  },
  
  toRegisters(value: string, byteOrder: ByteOrder = ByteOrder.AB): number[] {
    const stringBuffer = Buffer.from(value, 'ascii');
    const registers: number[] = [];
    
    // Ensure even length
    const buffer = Buffer.alloc(Math.ceil(stringBuffer.length / 2) * 2);
    stringBuffer.copy(buffer);
    
    // Convert bytes to registers based on byte order
    for (let i = 0; i < buffer.length; i += 2) {
      if (byteOrder === ByteOrder.AB) {
        registers.push(buffer.readUInt16BE(i));
      } else if (byteOrder === ByteOrder.BA) {
        registers.push(buffer.readUInt16LE(i));
      } else {
        throw new ConversionError(`Unsupported byte order for String: ${byteOrder}`);
      }
    }
    
    return registers;
  },
  
  get size(): number {
    throw new Error('Size of String is variable');
  }
};

/**
 * Convert registers to a value based on the specified data type
 * @param registers Register values to convert
 * @param dataType Target data type
 * @param byteOrder Byte ordering
 */
export function convertFromRegisters(registers: number[], dataType: DataType, byteOrder?: ByteOrder): any {
  switch (dataType) {
    case DataType.BOOLEAN:
      return BooleanConverter.fromRegisters(registers);
    case DataType.INT16:
      return Int16Converter.fromRegisters(registers, byteOrder);
    case DataType.UINT16:
      return UInt16Converter.fromRegisters(registers, byteOrder);
    case DataType.INT32:
      return Int32Converter.fromRegisters(registers, byteOrder);
    case DataType.UINT32:
      return UInt32Converter.fromRegisters(registers, byteOrder);
    case DataType.FLOAT32:
      return Float32Converter.fromRegisters(registers, byteOrder);
    case DataType.FLOAT64:
      return Float64Converter.fromRegisters(registers, byteOrder);
    case DataType.INT64:
      return Int64Converter.fromRegisters(registers, byteOrder);
    case DataType.UINT64:
      return UInt64Converter.fromRegisters(registers, byteOrder);
    case DataType.STRING:
      return StringConverter.fromRegisters(registers, byteOrder);
    case DataType.BYTE_ARRAY:
      // Just return the raw register values
      return registers;
    default:
      throw new ConversionError(`Unsupported data type: ${dataType}`);
  }
}

/**
 * Convert a value to registers based on the specified data type
 * @param value Value to convert
 * @param dataType Source data type
 * @param byteOrder Byte ordering
 */
export function convertToRegisters(value: any, dataType: DataType, byteOrder?: ByteOrder): number[] {
  switch (dataType) {
    case DataType.BOOLEAN:
      return BooleanConverter.toRegisters(value);
    case DataType.INT16:
      return Int16Converter.toRegisters(value, byteOrder);
    case DataType.UINT16:
      return UInt16Converter.toRegisters(value, byteOrder);
    case DataType.INT32:
      return Int32Converter.toRegisters(value, byteOrder);
    case DataType.UINT32:
      return UInt32Converter.toRegisters(value, byteOrder);
    case DataType.FLOAT32:
      return Float32Converter.toRegisters(value, byteOrder);
    case DataType.FLOAT64:
      return Float64Converter.toRegisters(value, byteOrder);
    case DataType.INT64:
      return Int64Converter.toRegisters(value, byteOrder);
    case DataType.UINT64:
      return UInt64Converter.toRegisters(value, byteOrder);
    case DataType.STRING:
      return StringConverter.toRegisters(value, byteOrder);
    case DataType.BYTE_ARRAY:
      // Ensure the value is an array of numbers
      if (!Array.isArray(value) || !value.every(v => typeof v === 'number')) {
        throw new ConversionError('BYTE_ARRAY expects an array of numbers');
      }
      return value;
    default:
      throw new ConversionError(`Unsupported data type: ${dataType}`);
  }
}

/**
 * Get the size of a data type in 16-bit registers
 * @param dataType Data type
 * @param length Length for variable-sized types (e.g. STRING)
 */
export function getDataTypeSize(dataType: DataType, length?: number): number {
  switch (dataType) {
    case DataType.BOOLEAN:
    case DataType.INT16:
    case DataType.UINT16:
      return 1;
    case DataType.INT32:
    case DataType.UINT32:
    case DataType.FLOAT32:
      return 2;
    case DataType.INT64:
    case DataType.UINT64:
    case DataType.FLOAT64:
      return 4;
    case DataType.STRING:
    case DataType.BYTE_ARRAY:
      if (length === undefined) {
        throw new ConversionError(`Length must be specified for ${dataType}`);
      }
      return Math.ceil(length / 2);
    default:
      throw new ConversionError(`Unsupported data type: ${dataType}`);
  }
}