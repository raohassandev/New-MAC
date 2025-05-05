/**
 * Calculates the CRC-16 for Modbus RTU
 * @param buffer Data buffer for CRC calculation
 * @returns CRC-16 value
 */
export function crc16modbus(buffer: Buffer): number {
    let crc = 0xFFFF;
    
    for (let i = 0; i < buffer.length; i++) {
        crc ^= buffer[i];
        
        for (let j = 0; j < 8; j++) {
            const lsb = crc & 0x0001;
            crc >>= 1;
            
            if (lsb === 1) {
                crc ^= 0xA001;
            }
        }
    }
    
    return crc;
}

/**
 * Validates that a buffer has a valid Modbus CRC
 * @param buffer Buffer including the CRC at the end (last 2 bytes)
 * @returns true if CRC is valid, false otherwise
 */
export function validateCrc(buffer: Buffer): boolean {
    if (buffer.length < 2) {
        return false;
    }
    
    const receivedCrc = buffer.readUInt16LE(buffer.length - 2);
    const calculatedCrc = crc16modbus(buffer.slice(0, buffer.length - 2));
    
    return receivedCrc === calculatedCrc;
}

/**
 * Appends CRC to a Modbus RTU message
 * @param buffer Message buffer without CRC
 * @returns New buffer with CRC appended
 */
export function appendCrc(buffer: Buffer): Buffer {
    const crc = crc16modbus(buffer);
    const result = Buffer.alloc(buffer.length + 2);
    
    buffer.copy(result);
    result.writeUInt16LE(crc, buffer.length);
    
    return result;
}