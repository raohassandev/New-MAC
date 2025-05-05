/**
 * Utility functions for buffer manipulation and data conversion
 */

/**
 * Convert buffer to hexadecimal string representation
 * @param buffer Buffer to convert
 * @param separator Separator between bytes (default: space)
 */
export function bufferToHex(buffer: Buffer, separator: string = ' '): string {
    return Array.from(buffer)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(separator);
}

/**
 * Convert hexadecimal string to buffer
 * @param hex Hexadecimal string (with or without separators)
 */
export function hexToBuffer(hex: string): Buffer {
    // Remove any non-hex characters (spaces, colons, etc.)
    const cleanHex = hex.replace(/[^0-9A-Fa-f]/g, '');
    
    // Ensure even number of characters
    if (cleanHex.length % 2 !== 0) {
        throw new Error('Hex string must have an even number of characters');
    }
    
    const buffer = Buffer.alloc(cleanHex.length / 2);
    
    for (let i = 0; i < cleanHex.length; i += 2) {
        buffer[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    
    return buffer;
}

/**
 * Pad a buffer to a specified length
 * @param buffer Buffer to pad
 * @param length Target length
 * @param padByte Byte to pad with (default: 0)
 * @param padEnd Whether to pad at the end (default: true)
 */
export function padBuffer(
    buffer: Buffer,
    length: number,
    padByte: number = 0,
    padEnd: boolean = true
): Buffer {
    if (buffer.length >= length) {
        return buffer;
    }
    
    const padding = Buffer.alloc(length - buffer.length, padByte);
    
    return padEnd 
        ? Buffer.concat([buffer, padding]) 
        : Buffer.concat([padding, buffer]);
}

/**
 * Trim leading or trailing bytes from a buffer
 * @param buffer Buffer to trim
 * @param bytesToTrim Byte value to trim (default: 0)
 * @param trimStart Whether to trim from the start (default: true)
 * @param trimEnd Whether to trim from the end (default: true)
 */
export function trimBuffer(
    buffer: Buffer,
    bytesToTrim: number = 0,
    trimStart: boolean = true,
    trimEnd: boolean = true
): Buffer {
    if (buffer.length === 0) {
        return buffer;
    }
    
    let startIndex = 0;
    let endIndex = buffer.length - 1;
    
    if (trimStart) {
        while (startIndex <= endIndex && buffer[startIndex] === bytesToTrim) {
            startIndex++;
        }
    }
    
    if (trimEnd) {
        while (endIndex >= startIndex && buffer[endIndex] === bytesToTrim) {
            endIndex--;
        }
    }
    
    return buffer.slice(startIndex, endIndex + 1);
}

/**
 * Convert a number to a binary string representation
 * @param value Number to convert
 * @param bits Number of bits (default: 8)
 */
export function numberToBinary(value: number, bits: number = 8): string {
    return (value >>> 0).toString(2).padStart(bits, '0');
}

/**
 * Extract specific bits from a byte
 * @param byte Byte value
 * @param startBit Start bit (0-7, where 0 is LSB)
 * @param bitCount Number of bits to extract
 */
export function extractBits(byte: number, startBit: number, bitCount: number): number {
    if (startBit < 0 || startBit > 7 || bitCount < 1 || startBit + bitCount > 8) {
        throw new Error('Invalid bit range');
    }
    
    // Create a mask with the specified bits set
    const mask = ((1 << bitCount) - 1) << startBit;
    
    // Extract and shift the bits
    return (byte & mask) >> startBit;
}

/**
 * Set specific bits in a byte
 * @param byte Original byte value
 * @param value Value to set
 * @param startBit Start bit (0-7, where 0 is LSB)
 * @param bitCount Number of bits to set
 */
export function setBits(
    byte: number,
    value: number,
    startBit: number,
    bitCount: number
): number {
    if (startBit < 0 || startBit > 7 || bitCount < 1 || startBit + bitCount > 8) {
        throw new Error('Invalid bit range');
    }
    
    if (value < 0 || value >= (1 << bitCount)) {
        throw new Error(`Value out of range for ${bitCount} bits`);
    }
    
    // Create a mask with the specified bits set
    const mask = ((1 << bitCount) - 1) << startBit;
    
    // Clear the bits in the original byte
    const clearedByte = byte & ~mask;
    
    // Set the new bits
    return clearedByte | ((value << startBit) & mask);
}

/**
 * Read bits from a buffer at the specified position
 * @param buffer Buffer to read from
 * @param byteOffset Byte offset
 * @param bitOffset Bit offset within the byte (0-7, where 0 is LSB)
 * @param bitCount Number of bits to read
 */
export function readBits(
    buffer: Buffer,
    byteOffset: number,
    bitOffset: number,
    bitCount: number
): number {
    if (bitCount <= 0) {
        throw new Error('Bit count must be positive');
    }
    
    if (byteOffset < 0 || byteOffset >= buffer.length) {
        throw new Error('Byte offset out of range');
    }
    
    if (bitOffset < 0 || bitOffset > 7) {
        throw new Error('Bit offset must be between 0 and 7');
    }
    
    // Simple case: all bits are within a single byte
    if (bitOffset + bitCount <= 8) {
        return extractBits(buffer[byteOffset], bitOffset, bitCount);
    }
    
    // Complex case: bits span multiple bytes
    let result = 0;
    let remainingBits = bitCount;
    let currentByteOffset = byteOffset;
    let currentBitOffset = bitOffset;
    
    while (remainingBits > 0) {
        // Calculate how many bits we can read from the current byte
        const bitsToRead = Math.min(8 - currentBitOffset, remainingBits);
        
        // Read bits from the current byte
        const bitsValue = extractBits(
            buffer[currentByteOffset],
            currentBitOffset,
            bitsToRead
        );
        
        // Add the bits to the result
        result |= bitsValue << (bitCount - remainingBits);
        
        // Move to the next byte
        remainingBits -= bitsToRead;
        currentByteOffset++;
        currentBitOffset = 0;
    }
    
    return result;
}

/**
 * Write bits to a buffer at the specified position
 * @param buffer Buffer to write to
 * @param value Value to write
 * @param byteOffset Byte offset
 * @param bitOffset Bit offset within the byte (0-7, where 0 is LSB)
 * @param bitCount Number of bits to write
 */
export function writeBits(
    buffer: Buffer,
    value: number,
    byteOffset: number,
    bitOffset: number,
    bitCount: number
): void {
    if (bitCount <= 0) {
        throw new Error('Bit count must be positive');
    }
    
    if (byteOffset < 0 || byteOffset >= buffer.length) {
        throw new Error('Byte offset out of range');
    }
    
    if (bitOffset < 0 || bitOffset > 7) {
        throw new Error('Bit offset must be between 0 and 7');
    }
    
    if (value < 0 || value >= (1 << bitCount)) {
        throw new Error(`Value out of range for ${bitCount} bits`);
    }
    
    // Simple case: all bits are within a single byte
    if (bitOffset + bitCount <= 8) {
        buffer[byteOffset] = setBits(
            buffer[byteOffset],
            value,
            bitOffset,
            bitCount
        );
        return;
    }
    
    // Complex case: bits span multiple bytes
    let remainingBits = bitCount;
    let currentByteOffset = byteOffset;
    let currentBitOffset = bitOffset;
    
    while (remainingBits > 0) {
        // Calculate how many bits we can write to the current byte
        const bitsToWrite = Math.min(8 - currentBitOffset, remainingBits);
        
        // Extract the bits to write
        const bitsValue = (value >> (remainingBits - bitsToWrite)) & ((1 << bitsToWrite) - 1);
        
        // Write the bits to the current byte
        buffer[currentByteOffset] = setBits(
            buffer[currentByteOffset],
            bitsValue,
            currentBitOffset,
            bitsToWrite
        );
        
        // Move to the next byte
        remainingBits -= bitsToWrite;
        currentByteOffset++;
        currentBitOffset = 0;
    }
}

/**
 * Check if a buffer is all zeros
 * @param buffer Buffer to check
 */
export function isZeroBuffer(buffer: Buffer): boolean {
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0) {
            return false;
        }
    }
    return true;
}

/**
 * Create a buffer with a consistent hash value
 * Used for validating frame checksums
 * @param data Data to hash
 */
export function calculateCrc32(data: Buffer): number {
    let crc = 0xFFFFFFFF;
    
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        
        for (let j = 0; j < 8; j++) {
            crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
        }
    }
    
    return ~crc >>> 0;
}

/**
 * Swap the byte order of a 16-bit value
 * @param value 16-bit value to swap
 */
export function swapUint16(value: number): number {
    return ((value & 0xFF) << 8) | ((value & 0xFF00) >> 8);
}

/**
 * Swap the byte order of a 32-bit value
 * @param value 32-bit value to swap
 */
export function swapUint32(value: number): number {
    return (
        ((value & 0xFF) << 24) |
        ((value & 0xFF00) << 8) |
        ((value & 0xFF0000) >> 8) |
        ((value & 0xFF000000) >> 24)
    );
}

/**
 * Read a null-terminated string from a buffer
 * @param buffer Buffer to read from
 * @param offset Offset to start reading from
 * @param maxLength Maximum length to read
 * @param encoding String encoding (default: 'utf8')
 */
export function readNullTerminatedString(
    buffer: Buffer,
    offset: number = 0,
    maxLength: number = buffer.length - offset,
    encoding: BufferEncoding = 'utf8'
): string {
    let end = offset;
    
    while (end < buffer.length && end - offset < maxLength && buffer[end] !== 0) {
        end++;
    }
    
    return buffer.slice(offset, end).toString(encoding);
}

/**
 * Write a null-terminated string to a buffer
 * @param buffer Buffer to write to
 * @param string String to write
 * @param offset Offset to start writing at
 * @param maxLength Maximum length to write (including null terminator)
 * @param encoding String encoding (default: 'utf8')
 * @returns Number of bytes written (including null terminator)
 */
export function writeNullTerminatedString(
    buffer: Buffer,
    string: string,
    offset: number = 0,
    maxLength: number = buffer.length - offset,
    encoding: BufferEncoding = 'utf8'
): number {
    const stringBuffer = Buffer.from(string, encoding);
    const bytesToWrite = Math.min(stringBuffer.length, maxLength - 1);
    
    stringBuffer.copy(buffer, offset, 0, bytesToWrite);
    buffer[offset + bytesToWrite] = 0; // Add null terminator
    
    return bytesToWrite + 1;
}