/**
 * Data type conversion utilities for Modbus
 */
import { DataType, ByteOrder } from '../../../core/types';

/**
 * Swap bytes in a 16-bit word
 * @param word 16-bit word to swap bytes in
 * @returns Word with bytes swapped
 */
export function swapBytes(value: number): number {
  return ((value & 0xff) << 8) | ((value >> 8) & 0xff);
}

/**
 * Convert raw Modbus registers to a typed value
 * @param registers Array of 16-bit register values
 * @param dataType Data type to convert to
 * @param byteOrder Byte order for multi-register values
 * @returns Converted value
 */
export function registersToValue(
  registers: number[],
  dataType: DataType,
  byteOrder: ByteOrder = ByteOrder.ABCD,
): any {
  // Ensure we have registers to process
  if (!registers || registers.length === 0) {
    throw new Error('No registers provided for conversion');
  }

  // Create a buffer to hold the register data
  const buffer = Buffer.alloc(registers.length * 2);

  // Fill the buffer based on the data type and byte order
  switch (dataType) {
    case DataType.BOOLEAN:
      // For booleans, just check if the first register is non-zero
      return registers[0] !== 0;

    case DataType.INT16:
      if (byteOrder === ByteOrder.AB) {
        buffer.writeUInt16BE(registers[0], 0);
        const value = buffer.readInt16BE(0);
        return value;
      } else {
        // BA byte order (swapped)
        buffer.writeUInt16BE(swapBytes(registers[0]), 0);
        const value = buffer.readInt16BE(0);
        return value;
      }

    case DataType.UINT16:
      if (byteOrder === ByteOrder.AB) {
        return registers[0];
      } else {
        // BA byte order (swapped)
        return swapBytes(registers[0]);
      }

    case DataType.INT32:
      if (registers.length < 2) {
        throw new Error('INT32 requires at least 2 registers');
      }

      switch (byteOrder) {
        case ByteOrder.ABCD:
          // Big-endian (ABCD)
          buffer.writeUInt16BE(registers[0], 0);
          buffer.writeUInt16BE(registers[1], 2);
          return buffer.readInt32BE(0);

        case ByteOrder.CDAB:
          // Little-endian (CDAB)
          buffer.writeUInt16BE(registers[1], 0);
          buffer.writeUInt16BE(registers[0], 2);
          return buffer.readInt32BE(0);

        case ByteOrder.BADC:
          // Big-endian with byte swap (BADC)
          buffer.writeUInt16BE(swapBytes(registers[0]), 0);
          buffer.writeUInt16BE(swapBytes(registers[1]), 2);
          return buffer.readInt32BE(0);

        case ByteOrder.DCBA:
          // Little-endian with byte swap (DCBA)
          buffer.writeUInt16BE(swapBytes(registers[1]), 0);
          buffer.writeUInt16BE(swapBytes(registers[0]), 2);
          return buffer.readInt32BE(0);

        default:
          throw new Error(`Unsupported byte order for INT32: ${byteOrder}`);
      }

    case DataType.UINT32:
      if (registers.length < 2) {
        throw new Error('UINT32 requires at least 2 registers');
      }

      switch (byteOrder) {
        case ByteOrder.ABCD:
          // Big-endian (ABCD)
          buffer.writeUInt16BE(registers[0], 0);
          buffer.writeUInt16BE(registers[1], 2);
          return buffer.readUInt32BE(0);

        case ByteOrder.CDAB:
          // Little-endian (CDAB)
          buffer.writeUInt16BE(registers[1], 0);
          buffer.writeUInt16BE(registers[0], 2);
          return buffer.readUInt32BE(0);

        case ByteOrder.BADC:
          // Big-endian with byte swap (BADC)
          buffer.writeUInt16BE(swapBytes(registers[0]), 0);
          buffer.writeUInt16BE(swapBytes(registers[1]), 2);
          return buffer.readUInt32BE(0);

        case ByteOrder.DCBA:
          // Little-endian with byte swap (DCBA)
          buffer.writeUInt16BE(swapBytes(registers[1]), 0);
          buffer.writeUInt16BE(swapBytes(registers[0]), 2);
          return buffer.readUInt32BE(0);

        default:
          throw new Error(`Unsupported byte order for UINT32: ${byteOrder}`);
      }

    case DataType.FLOAT32:
      if (registers.length < 2) {
        throw new Error('FLOAT32 requires at least 2 registers');
      }

      switch (byteOrder) {
        case ByteOrder.ABCD:
          // Big-endian (ABCD)
          buffer.writeUInt16BE(registers[0], 0);
          buffer.writeUInt16BE(registers[1], 2);
          return buffer.readFloatBE(0);

        case ByteOrder.CDAB:
          // Little-endian (CDAB)
          buffer.writeUInt16BE(registers[1], 0);
          buffer.writeUInt16BE(registers[0], 2);
          return buffer.readFloatBE(0);

        case ByteOrder.BADC:
          // Big-endian with byte swap (BADC)
          buffer.writeUInt16BE(swapBytes(registers[0]), 0);
          buffer.writeUInt16BE(swapBytes(registers[1]), 2);
          return buffer.readFloatBE(0);

        case ByteOrder.DCBA:
          // Little-endian with byte swap (DCBA)
          buffer.writeUInt16BE(swapBytes(registers[1]), 0);
          buffer.writeUInt16BE(swapBytes(registers[0]), 2);
          return buffer.readFloatBE(0);

        default:
          throw new Error(`Unsupported byte order for FLOAT32: ${byteOrder}`);
      }

    case DataType.FLOAT64:
      if (registers.length < 4) {
        throw new Error('FLOAT64 requires at least 4 registers');
      }

      switch (byteOrder) {
        case ByteOrder.ABCD:
          // Big-endian (ABCDEFGH)
          buffer.writeUInt16BE(registers[0], 0);
          buffer.writeUInt16BE(registers[1], 2);
          buffer.writeUInt16BE(registers[2], 4);
          buffer.writeUInt16BE(registers[3], 6);
          return buffer.readDoubleBE(0);

        case ByteOrder.CDAB:
          // Little-endian (GHEFCDAB)
          buffer.writeUInt16BE(registers[3], 0);
          buffer.writeUInt16BE(registers[2], 2);
          buffer.writeUInt16BE(registers[1], 4);
          buffer.writeUInt16BE(registers[0], 6);
          return buffer.readDoubleBE(0);

        case ByteOrder.BADC:
          // Big-endian with byte swap (BADCFEHG)
          buffer.writeUInt16BE(swapBytes(registers[0]), 0);
          buffer.writeUInt16BE(swapBytes(registers[1]), 2);
          buffer.writeUInt16BE(swapBytes(registers[2]), 4);
          buffer.writeUInt16BE(swapBytes(registers[3]), 6);
          return buffer.readDoubleBE(0);

        case ByteOrder.DCBA:
          // Little-endian with byte swap (HGFEDCBA)
          buffer.writeUInt16BE(swapBytes(registers[3]), 0);
          buffer.writeUInt16BE(swapBytes(registers[2]), 2);
          buffer.writeUInt16BE(swapBytes(registers[1]), 4);
          buffer.writeUInt16BE(swapBytes(registers[0]), 6);
          return buffer.readDoubleBE(0);

        default:
          throw new Error(`Unsupported byte order for FLOAT64: ${byteOrder}`);
      }

    case DataType.STRING:
      // For strings, just convert each register to a character
      // This assumes ASCII encoding (one character per byte)
      let result = '';

      for (let i = 0; i < registers.length; i++) {
        const reg = registers[i];

        // Get high byte and low byte
        const highByte = (reg >> 8) & 0xff;
        const lowByte = reg & 0xff;

        // Add characters if they're printable (not null)
        if (highByte !== 0) {
          result += String.fromCharCode(highByte);
        }

        if (lowByte !== 0) {
          result += String.fromCharCode(lowByte);
        }
      }

      return result;
      
    case DataType.RAW:
      // For RAW data type, just return the registers as-is without conversion
      return registers;

    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

/**
 * Convert a typed value to raw Modbus registers
 * @param value Value to convert
 * @param dataType Data type of the value
 * @param byteOrder Byte order for multi-register values
 * @returns Array of 16-bit register values
 */
export function valueToRegisters(
  value: any,
  dataType: DataType,
  byteOrder: ByteOrder = ByteOrder.ABCD,
): number[] {
  // Create a temporary buffer for conversions
  let buffer: Buffer;

  switch (dataType) {
    case DataType.BOOLEAN:
      // For booleans, return 1 for true and 0 for false
      return [value ? 1 : 0];

    case DataType.INT16:
    case DataType.UINT16:
      // Convert to number if needed
      const val = Number(value);

      if (byteOrder === ByteOrder.AB) {
        return [val & 0xffff];
      } else {
        // BA byte order (swapped)
        return [swapBytes(val & 0xffff)];
      }

    case DataType.INT32:
    case DataType.UINT32:
      // Create a buffer for the 32-bit value
      buffer = Buffer.alloc(4);

      if (dataType === DataType.INT32) {
        buffer.writeInt32BE(Number(value), 0);
      } else {
        buffer.writeUInt32BE(Number(value), 0);
      }

      // Extract registers based on byte order
      switch (byteOrder) {
        case ByteOrder.ABCD:
          // Big-endian (ABCD)
          return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];

        case ByteOrder.CDAB:
          // Little-endian (CDAB)
          return [buffer.readUInt16BE(2), buffer.readUInt16BE(0)];

        case ByteOrder.BADC:
          // Big-endian with byte swap (BADC)
          return [swapBytes(buffer.readUInt16BE(0)), swapBytes(buffer.readUInt16BE(2))];

        case ByteOrder.DCBA:
          // Little-endian with byte swap (DCBA)
          return [swapBytes(buffer.readUInt16BE(2)), swapBytes(buffer.readUInt16BE(0))];

        default:
          throw new Error(`Unsupported byte order for INT32/UINT32: ${byteOrder}`);
      }

    case DataType.FLOAT32:
      // Create a buffer for the float value
      buffer = Buffer.alloc(4);
      buffer.writeFloatBE(Number(value), 0);

      // Extract registers based on byte order
      switch (byteOrder) {
        case ByteOrder.ABCD:
          // Big-endian (ABCD)
          return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];

        case ByteOrder.CDAB:
          // Little-endian (CDAB)
          return [buffer.readUInt16BE(2), buffer.readUInt16BE(0)];

        case ByteOrder.BADC:
          // Big-endian with byte swap (BADC)
          return [swapBytes(buffer.readUInt16BE(0)), swapBytes(buffer.readUInt16BE(2))];

        case ByteOrder.DCBA:
          // Little-endian with byte swap (DCBA)
          return [swapBytes(buffer.readUInt16BE(2)), swapBytes(buffer.readUInt16BE(0))];

        default:
          throw new Error(`Unsupported byte order for FLOAT32: ${byteOrder}`);
      }

    case DataType.FLOAT64:
      // Create a buffer for the double value
      buffer = Buffer.alloc(8);
      buffer.writeDoubleBE(Number(value), 0);

      // Extract registers based on byte order
      switch (byteOrder) {
        case ByteOrder.ABCD:
          // Big-endian (ABCDEFGH)
          return [
            buffer.readUInt16BE(0),
            buffer.readUInt16BE(2),
            buffer.readUInt16BE(4),
            buffer.readUInt16BE(6),
          ];

        case ByteOrder.CDAB:
          // Little-endian (GHEFCDAB)
          return [
            buffer.readUInt16BE(6),
            buffer.readUInt16BE(4),
            buffer.readUInt16BE(2),
            buffer.readUInt16BE(0),
          ];

        case ByteOrder.BADC:
          // Big-endian with byte swap (BADCFEHG)
          return [
            swapBytes(buffer.readUInt16BE(0)),
            swapBytes(buffer.readUInt16BE(2)),
            swapBytes(buffer.readUInt16BE(4)),
            swapBytes(buffer.readUInt16BE(6)),
          ];

        case ByteOrder.DCBA:
          // Little-endian with byte swap (HGFEDCBA)
          return [
            swapBytes(buffer.readUInt16BE(6)),
            swapBytes(buffer.readUInt16BE(4)),
            swapBytes(buffer.readUInt16BE(2)),
            swapBytes(buffer.readUInt16BE(0)),
          ];

        default:
          throw new Error(`Unsupported byte order for FLOAT64: ${byteOrder}`);
      }

    case DataType.STRING:
      // Convert the string to 16-bit registers
      // Each register holds 2 ASCII characters
      const str = String(value);
      const registers: number[] = [];

      for (let i = 0; i < str.length; i += 2) {
        const highByte = str.charCodeAt(i);
        const lowByte = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;

        registers.push((highByte << 8) | lowByte);
      }

      return registers;
      
    case DataType.RAW:
      // For RAW data type, assume value is already an array of register values
      // or convert if it's a single value
      if (Array.isArray(value)) {
        return value.map(v => Number(v) & 0xffff); // Ensure values are 16-bit
      } else {
        return [Number(value) & 0xffff]; // Convert single value to 16-bit
      }

    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

/**
 * Apply scaling to a value
 * @param value Raw value
 * @param scaling Scaling factor
 * @param scalingEquation Scaling equation (uses x as the value)
 * @param decimalPoint Number of decimal places to round to
 * @returns Scaled value
 */
export function applyScaling(
  value: number,
  scaling?: number,
  scalingEquation?: string,
  decimalPoint?: number,
): number {
  let result = value;

  // Apply scaling factor if defined
  if (scaling !== undefined && scaling !== 0 && scaling !== 1) {
    result = result * scaling;
  }

  // Apply scaling equation if defined
  if (scalingEquation) {
    try {
      // Simple equation evaluation (x is the value)
      const x = result;
      // Use Function constructor to safely evaluate the equation
      result = new Function('x', `return ${scalingEquation}`)(x);
    } catch (error) {
      throw new Error(`Error applying scaling equation "${scalingEquation}": ${error}`);
    }
  }

  // Round to decimal places if defined
  if (decimalPoint !== undefined && decimalPoint >= 0) {
    const factor = Math.pow(10, decimalPoint);
    result = Math.round(result * factor) / factor;
  }

  return result;
}
