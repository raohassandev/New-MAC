import { ByteOrder, DataType } from '../core/types';
import { swapUint16, swapUint32 } from './bufferUtils';

/**
 * Apply byte order transformation to a 16-bit value
 * @param value 16-bit value
 * @param byteOrder Byte order to apply
 */
export function applyByteOrder16(value: number, byteOrder: ByteOrder): number {
  switch (byteOrder) {
    case ByteOrder.AB:
      return value; // Big-endian (default)
    case ByteOrder.BA:
      return swapUint16(value); // Little-endian
    default:
      throw new Error(`Invalid byte order for 16-bit value: ${byteOrder}`);
  }
}

/**
 * Apply byte order transformation to a 32-bit value
 * @param value 32-bit value
 * @param byteOrder Byte order to apply
 */
export function applyByteOrder32(value: number, byteOrder: ByteOrder): number {
  switch (byteOrder) {
    case ByteOrder.ABCD:
      return value; // Big-endian (default)
    case ByteOrder.CDAB:
      return ((value & 0xffff) << 16) | ((value >> 16) & 0xffff); // Swap words
    case ByteOrder.BADC:
      return (swapUint16(value & 0xffff) << 16) | swapUint16((value >> 16) & 0xffff); // Swap bytes within words
    case ByteOrder.DCBA:
      return swapUint32(value); // Little-endian
    default:
      throw new Error(`Invalid byte order for 32-bit value: ${byteOrder}`);
  }
}

/**
 * Convert a buffer to a 16-bit signed integer
 * @param buffer Buffer containing the value
 * @param offset Offset in the buffer
 * @param byteOrder Byte order
 */
export function bufferToInt16(
  buffer: Buffer,
  offset: number = 0,
  byteOrder: ByteOrder = ByteOrder.AB,
): number {
  // Read as unsigned
  let value = buffer.readUInt16BE(offset);

  // Apply byte order
  value = applyByteOrder16(value, byteOrder);

  // Convert to signed
  return value > 0x7fff ? value - 0x10000 : value;
}

/**
 * Convert a buffer to a 16-bit unsigned integer
 * @param buffer Buffer containing the value
 * @param offset Offset in the buffer
 * @param byteOrder Byte order
 */
export function bufferToUint16(
  buffer: Buffer,
  offset: number = 0,
  byteOrder: ByteOrder = ByteOrder.AB,
): number {
  // Read as unsigned
  let value = buffer.readUInt16BE(offset);

  // Apply byte order
  return applyByteOrder16(value, byteOrder);
}

/**
 * Convert a buffer to a 32-bit signed integer
 * @param buffer Buffer containing the value
 * @param offset Offset in the buffer
 * @param byteOrder Byte order
 */
export function bufferToInt32(
  buffer: Buffer,
  offset: number = 0,
  byteOrder: ByteOrder = ByteOrder.ABCD,
): number {
  // Read as unsigned
  let value = buffer.readUInt32BE(offset);

  // Apply byte order
  value = applyByteOrder32(value, byteOrder);

  // Convert to signed
  return value > 0x7fffffff ? value - 0x100000000 : value;
}

/**
 * Convert a buffer to a 32-bit unsigned integer
 * @param buffer Buffer containing the value
 * @param offset Offset in the buffer
 * @param byteOrder Byte order
 */
export function bufferToUint32(
  buffer: Buffer,
  offset: number = 0,
  byteOrder: ByteOrder = ByteOrder.ABCD,
): number {
  // Read as unsigned
  let value = buffer.readUInt32BE(offset);

  // Apply byte order
  return applyByteOrder32(value, byteOrder);
}

/**
 * Convert a buffer to a 32-bit float
 * @param buffer Buffer containing the value
 * @param offset Offset in the buffer
 * @param byteOrder Byte order
 */
export function bufferToFloat32(
  buffer: Buffer,
  offset: number = 0,
  byteOrder: ByteOrder = ByteOrder.ABCD,
): number {
  // Create a temporary buffer to apply byte order
  const tempBuffer = Buffer.alloc(4);

  // Copy the original value
  buffer.copy(tempBuffer, 0, offset, offset + 4);

  // Apply byte order by rearranging bytes
  switch (byteOrder) {
    case ByteOrder.ABCD:
      // No change needed
      break;
    case ByteOrder.CDAB:
      // Swap the two 16-bit words
      [tempBuffer[0], tempBuffer[1], tempBuffer[2], tempBuffer[3]] = [
        tempBuffer[2],
        tempBuffer[3],
        tempBuffer[0],
        tempBuffer[1],
      ];
      break;
    case ByteOrder.BADC:
      // Swap bytes within each 16-bit word
      [tempBuffer[0], tempBuffer[1], tempBuffer[2], tempBuffer[3]] = [
        tempBuffer[1],
        tempBuffer[0],
        tempBuffer[3],
        tempBuffer[2],
      ];
      break;
    case ByteOrder.DCBA:
      // Reverse all bytes
      [tempBuffer[0], tempBuffer[1], tempBuffer[2], tempBuffer[3]] = [
        tempBuffer[3],
        tempBuffer[2],
        tempBuffer[1],
        tempBuffer[0],
      ];
      break;
    default:
      throw new Error(`Invalid byte order for 32-bit float: ${byteOrder}`);
  }

  // Read the float value from the rearranged buffer
  return tempBuffer.readFloatBE(0);
}

/**
 * Convert a buffer to a 64-bit float
 * @param buffer Buffer containing the value
 * @param offset Offset in the buffer
 * @param byteOrder Byte order (for 64-bit values, byte swapping is more complex)
 */
export function bufferToFloat64(
  buffer: Buffer,
  offset: number = 0,
  byteOrder: ByteOrder = ByteOrder.ABCD,
): number {
  // Create a temporary buffer to apply byte order
  const tempBuffer = Buffer.alloc(8);

  // Copy the original value
  buffer.copy(tempBuffer, 0, offset, offset + 8);

  // Apply byte order by rearranging bytes
  switch (byteOrder) {
    case ByteOrder.ABCD:
      // No change needed (big-endian)
      break;
    case ByteOrder.CDAB:
      // Swap the two 32-bit words
      [
        tempBuffer[0],
        tempBuffer[1],
        tempBuffer[2],
        tempBuffer[3],
        tempBuffer[4],
        tempBuffer[5],
        tempBuffer[6],
        tempBuffer[7],
      ] = [
        tempBuffer[4],
        tempBuffer[5],
        tempBuffer[6],
        tempBuffer[7],
        tempBuffer[0],
        tempBuffer[1],
        tempBuffer[2],
        tempBuffer[3],
      ];
      break;
    case ByteOrder.BADC:
      // Swap bytes within each 16-bit word
      [
        tempBuffer[0],
        tempBuffer[1],
        tempBuffer[2],
        tempBuffer[3],
        tempBuffer[4],
        tempBuffer[5],
        tempBuffer[6],
        tempBuffer[7],
      ] = [
        tempBuffer[1],
        tempBuffer[0],
        tempBuffer[3],
        tempBuffer[2],
        tempBuffer[5],
        tempBuffer[4],
        tempBuffer[7],
        tempBuffer[6],
      ];
      break;
    case ByteOrder.DCBA:
      // Reverse all bytes (little-endian)
      [
        tempBuffer[0],
        tempBuffer[1],
        tempBuffer[2],
        tempBuffer[3],
        tempBuffer[4],
        tempBuffer[5],
        tempBuffer[6],
        tempBuffer[7],
      ] = [
        tempBuffer[7],
        tempBuffer[6],
        tempBuffer[5],
        tempBuffer[4],
        tempBuffer[3],
        tempBuffer[2],
        tempBuffer[1],
        tempBuffer[0],
      ];
      break;
    default:
      throw new Error(`Invalid byte order for 64-bit float: ${byteOrder}`);
  }

  // Read the double value from the rearranged buffer
  return tempBuffer.readDoubleBE(0);
}

/**
 * Convert a buffer to a string
 * @param buffer Buffer containing the string
 * @param offset Offset in the buffer
 * @param length Length of the string in bytes
 * @param encoding String encoding (default: 'utf8')
 */
export function bufferToString(
  buffer: Buffer,
  offset: number = 0,
  length: number = buffer.length - offset,
  encoding: BufferEncoding = 'utf8',
): string {
  // Trim null characters at the end
  let end = offset + length;
  while (end > offset && buffer[end - 1] === 0) {
    end--;
  }

  return buffer.slice(offset, end).toString(encoding);
}

/**
 * Convert a 16-bit integer to a buffer
 * @param value Integer value
 * @param byteOrder Byte order
 */
export function int16ToBuffer(value: number, byteOrder: ByteOrder = ByteOrder.AB): Buffer {
  // Validate the value
  if (value < -32768 || value > 32767) {
    throw new Error(`Value out of range for 16-bit integer: ${value}`);
  }

  // Convert negative values to two's complement
  if (value < 0) {
    value = 0x10000 + value;
  }

  // Apply byte order
  value = applyByteOrder16(value, byteOrder);

  // Create buffer and write value
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value, 0);

  return buffer;
}

/**
 * Convert a 16-bit unsigned integer to a buffer
 * @param value Unsigned integer value
 * @param byteOrder Byte order
 */
export function uint16ToBuffer(value: number, byteOrder: ByteOrder = ByteOrder.AB): Buffer {
  // Validate the value
  if (value < 0 || value > 65535) {
    throw new Error(`Value out of range for 16-bit unsigned integer: ${value}`);
  }

  // Apply byte order
  value = applyByteOrder16(value, byteOrder);

  // Create buffer and write value
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value, 0);

  return buffer;
}

/**
 * Convert a 32-bit integer to a buffer
 * @param value Integer value
 * @param byteOrder Byte order
 */
export function int32ToBuffer(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): Buffer {
  // Validate the value
  if (value < -2147483648 || value > 2147483647) {
    throw new Error(`Value out of range for 32-bit integer: ${value}`);
  }

  // Convert negative values to two's complement
  if (value < 0) {
    value = 0x100000000 + value;
  }

  // Apply byte order
  value = applyByteOrder32(value, byteOrder);

  // Create buffer and write value
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);

  return buffer;
}

/**
 * Convert a 32-bit unsigned integer to a buffer
 * @param value Unsigned integer value
 * @param byteOrder Byte order
 */
export function uint32ToBuffer(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): Buffer {
  // Validate the value
  if (value < 0 || value > 4294967295) {
    throw new Error(`Value out of range for 32-bit unsigned integer: ${value}`);
  }

  // Apply byte order
  value = applyByteOrder32(value, byteOrder);

  // Create buffer and write value
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);

  return buffer;
}

/**
 * Convert a 32-bit float to a buffer
 * @param value Float value
 * @param byteOrder Byte order
 */
export function float32ToBuffer(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): Buffer {
  // Create buffer and write value in big-endian format
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(value, 0);

  // Apply byte order by rearranging bytes if needed
  switch (byteOrder) {
    case ByteOrder.ABCD:
      // No change needed
      break;
    case ByteOrder.CDAB:
      // Swap the two 16-bit words
      [buffer[0], buffer[1], buffer[2], buffer[3]] = [buffer[2], buffer[3], buffer[0], buffer[1]];
      break;
    case ByteOrder.BADC:
      // Swap bytes within each 16-bit word
      [buffer[0], buffer[1], buffer[2], buffer[3]] = [buffer[1], buffer[0], buffer[3], buffer[2]];
      break;
    case ByteOrder.DCBA:
      // Reverse all bytes
      [buffer[0], buffer[1], buffer[2], buffer[3]] = [buffer[3], buffer[2], buffer[1], buffer[0]];
      break;
    default:
      throw new Error(`Invalid byte order for 32-bit float: ${byteOrder}`);
  }

  return buffer;
}

/**
 * Convert a 64-bit float to a buffer
 * @param value Float value
 * @param byteOrder Byte order
 */
export function float64ToBuffer(value: number, byteOrder: ByteOrder = ByteOrder.ABCD): Buffer {
  // Create buffer and write value in big-endian format
  const buffer = Buffer.alloc(8);
  buffer.writeDoubleBE(value, 0);

  // Apply byte order by rearranging bytes if needed
  switch (byteOrder) {
    case ByteOrder.ABCD:
      // No change needed
      break;
    case ByteOrder.CDAB:
      // Swap the two 32-bit words
      [buffer[0], buffer[1], buffer[2], buffer[3], buffer[4], buffer[5], buffer[6], buffer[7]] = [
        buffer[4],
        buffer[5],
        buffer[6],
        buffer[7],
        buffer[0],
        buffer[1],
        buffer[2],
        buffer[3],
      ];
      break;
    case ByteOrder.BADC:
      // Swap bytes within each 16-bit word
      [buffer[0], buffer[1], buffer[2], buffer[3], buffer[4], buffer[5], buffer[6], buffer[7]] = [
        buffer[1],
        buffer[0],
        buffer[3],
        buffer[2],
        buffer[5],
        buffer[4],
        buffer[7],
        buffer[6],
      ];
      break;
    case ByteOrder.DCBA:
      // Reverse all bytes
      [buffer[0], buffer[1], buffer[2], buffer[3], buffer[4], buffer[5], buffer[6], buffer[7]] = [
        buffer[7],
        buffer[6],
        buffer[5],
        buffer[4],
        buffer[3],
        buffer[2],
        buffer[1],
        buffer[0],
      ];
      break;
    default:
      throw new Error(`Invalid byte order for 64-bit float: ${byteOrder}`);
  }

  return buffer;
}

/**
 * Convert a string to a buffer
 * @param value String value
 * @param length Length of the resulting buffer (for padding)
 * @param padChar Character to use for padding (default: null character)
 * @param encoding String encoding (default: 'utf8')
 */
export function stringToBuffer(
  value: string,
  length?: number,
  padChar: number = 0,
  encoding: BufferEncoding = 'utf8',
): Buffer {
  // Convert the string to a buffer
  const stringBuffer = Buffer.from(value, encoding);

  // If length is specified, pad or truncate the buffer
  if (length !== undefined) {
    if (stringBuffer.length > length) {
      // Truncate if too long
      return stringBuffer.slice(0, length);
    } else if (stringBuffer.length < length) {
      // Pad if too short
      const paddedBuffer = Buffer.alloc(length, padChar);
      stringBuffer.copy(paddedBuffer);
      return paddedBuffer;
    }
  }

  return stringBuffer;
}

/**
 * Convert a boolean to a buffer
 * @param value Boolean value
 */
export function booleanToBuffer(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0]);
}

/**
 * Convert a value to a buffer based on its data type
 * @param value Value to convert
 * @param dataType Data type
 * @param byteOrder Byte order
 * @param stringLength Length for string conversion (optional)
 */
export function valueToBuffer(
  value: any,
  dataType: DataType,
  byteOrder: ByteOrder = ByteOrder.ABCD,
  stringLength?: number,
): Buffer {
  switch (dataType) {
    case DataType.BOOLEAN:
      return booleanToBuffer(Boolean(value));
    case DataType.INT16:
      return int16ToBuffer(Number(value), byteOrder);
    case DataType.UINT16:
      return uint16ToBuffer(Number(value), byteOrder);
    case DataType.INT32:
      return int32ToBuffer(Number(value), byteOrder);
    case DataType.UINT32:
      return uint32ToBuffer(Number(value), byteOrder);
    case DataType.FLOAT32:
      return float32ToBuffer(Number(value), byteOrder);
    case DataType.FLOAT64:
      return float64ToBuffer(Number(value), byteOrder);
    case DataType.STRING:
      return stringToBuffer(String(value), stringLength);
    case DataType.BYTE_ARRAY:
      if (Buffer.isBuffer(value)) {
        return value;
      }
      if (Array.isArray(value)) {
        return Buffer.from(value);
      }
      throw new Error('Invalid value for BYTE_ARRAY conversion');
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

/**
 * Convert a buffer to a value based on the data type
 * @param buffer Buffer containing the value
 * @param dataType Data type
 * @param offset Offset in the buffer
 * @param byteOrder Byte order
 * @param stringLength Length for string conversion (optional)
 */
export function bufferToValue(
  buffer: Buffer,
  dataType: DataType,
  offset: number = 0,
  byteOrder: ByteOrder = ByteOrder.ABCD,
  stringLength?: number,
): any {
  switch (dataType) {
    case DataType.BOOLEAN:
      return buffer[offset] !== 0;
    case DataType.INT16:
      return bufferToInt16(buffer, offset, byteOrder);
    case DataType.UINT16:
      return bufferToUint16(buffer, offset, byteOrder);
    case DataType.INT32:
      return bufferToInt32(buffer, offset, byteOrder);
    case DataType.UINT32:
      return bufferToUint32(buffer, offset, byteOrder);
    case DataType.FLOAT32:
      return bufferToFloat32(buffer, offset, byteOrder);
    case DataType.FLOAT64:
      return bufferToFloat64(buffer, offset, byteOrder);
    case DataType.STRING:
      return bufferToString(buffer, offset, stringLength || buffer.length - offset);
    case DataType.BYTE_ARRAY:
      return buffer.slice(offset, stringLength !== undefined ? offset + stringLength : undefined);
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

/**
 * Get the size in bytes for a data type
 * @param dataType Data type
 * @param stringLength Length for string data type
 */
export function getDataTypeSize(dataType: DataType, stringLength?: number): number {
  switch (dataType) {
    case DataType.BOOLEAN:
      return 1;
    case DataType.INT16:
    case DataType.UINT16:
      return 2;
    case DataType.INT32:
    case DataType.UINT32:
    case DataType.FLOAT32:
      return 4;
    case DataType.FLOAT64:
    case DataType.INT64:
    case DataType.UINT64:
      return 8;
    case DataType.STRING:
    case DataType.BYTE_ARRAY:
      if (stringLength === undefined) {
        throw new Error('String length must be specified for STRING or BYTE_ARRAY data type');
      }
      return stringLength;
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

/**
 * Get the number of Modbus registers (16-bit) required for a data type
 * @param dataType Data type
 * @param stringLength Length for string data type
 */
export function getRegistersForDataType(dataType: DataType, stringLength?: number): number {
  const byteSize = getDataTypeSize(dataType, stringLength);
  return Math.ceil(byteSize / 2);
}
