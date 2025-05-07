/**
 * CRC calculation functions for Modbus RTU
 */

/**
 * Calculate the CRC-16 (Modbus) for a buffer
 * @param buffer Buffer to calculate CRC for
 * @returns CRC value as a 16-bit number
 */
export function calculateCRC16(buffer: Buffer): number {
  let crc = 0xffff;

  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];

    for (let j = 0; j < 8; j++) {
      if ((crc & 0x0001) !== 0) {
        crc >>= 1;
        crc ^= 0xa001;
      } else {
        crc >>= 1;
      }
    }
  }

  return crc;
}

/**
 * Verify the CRC for a Modbus RTU message
 * The last 2 bytes of the buffer are expected to contain the CRC
 * @param buffer Buffer containing the message with CRC
 * @returns True if CRC is valid
 */
export function verifyCRC(buffer: Buffer): boolean {
  if (buffer.length < 2) {
    return false;
  }

  // Extract CRC from the message (last 2 bytes, little-endian)
  const messageCRC = buffer[buffer.length - 2] | (buffer[buffer.length - 1] << 8);

  // Calculate CRC for the message without the CRC bytes
  const calculatedCRC = calculateCRC16(buffer.subarray(0, buffer.length - 2));

  return messageCRC === calculatedCRC;
}

/**
 * Add CRC to a Modbus RTU message
 * @param buffer Buffer containing the message without CRC
 * @returns New buffer with CRC appended
 */
export function addCRC(buffer: Buffer): Buffer {
  const crc = calculateCRC16(buffer);

  // Create a new buffer with space for the CRC
  const result = Buffer.alloc(buffer.length + 2);

  // Copy the original message
  buffer.copy(result);

  // Add CRC (little-endian)
  result[buffer.length] = crc & 0xff;
  result[buffer.length + 1] = (crc >> 8) & 0xff;

  return result;
}
