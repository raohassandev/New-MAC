# Modbus Value Parsing Guide

This document explains how Modbus register values are parsed in our application, especially for multi-register values like FLOAT32, INT32, and UINT32.

## Byte Ordering

Modbus devices can use different byte ordering conventions. The system supports the following byte orders:

1. **ABCD (Big-Endian)** - Most significant byte first
   - Example: A floating point value 123.456 might be represented as registers [0x4237, 0x42C8]
   - First register (0x4237) contains the high-order bytes
   - Second register (0x42C8) contains the low-order bytes
   
2. **CDAB** - Middle-endian ordering (swapped registers)
   - The same value would be represented as registers [0x42C8, 0x4237]
   - First register (0x42C8) contains the low-order bytes
   - Second register (0x4237) contains the high-order bytes

3. **BADC** - Mixed-endian byte ordering
   - Each 16-bit register has its bytes swapped
   - First register contains the swapped high-order bytes
   - Second register contains the swapped low-order bytes

4. **DCBA** - Fully reversed (Little-Endian)
   - The complete opposite of ABCD
   - Each register is byte-swapped, and the registers are in reverse order

## Supported Data Types

The system supports the following data types:

1. **FLOAT32** - IEEE 754 32-bit floating point value
   - Uses 2 registers (4 bytes)
   - Supports values with decimal places
   - Used for temperature, pressure, voltage readings, etc.

2. **INT32** - Signed 32-bit integer
   - Uses 2 registers (4 bytes)
   - Supports values from -2,147,483,648 to 2,147,483,647
   - Used for counter values, positions, etc.

3. **UINT32** - Unsigned 32-bit integer
   - Uses 2 registers (4 bytes)
   - Supports values from 0 to 4,294,967,295
   - Used for counters, runtime hours, etc.

4. **INT16** - Signed 16-bit integer
   - Uses 1 register (2 bytes)
   - Supports values from -32,768 to 32,767

5. **UINT16** - Unsigned 16-bit integer
   - Uses 1 register (2 bytes)
   - Supports values from 0 to 65,535

## Reading Multiple Registers

When reading values that span multiple registers (like FLOAT32, INT32, or UINT32), the system:

1. Reads consecutive registers in a single Modbus request (more efficient)
2. Takes the raw register values and calculates the relative index based on the start address
3. Combines the register values based on the data type and byte order
4. Applies any scaling or formatting defined in the parameter configuration

## Device-Specific Considerations

Different device manufacturers may use different conventions:

1. **China Energy Analyzers** typically use:
   - CDAB byte order for 32-bit values
   - Absolute register addressing (the register index in the configuration is the actual Modbus address)

2. **Schneider Electric** devices typically use:
   - ABCD byte order
   - Register indices may be offset by 1 (0-based vs. 1-based addressing)

3. **Siemens** devices typically use:
   - BADC byte order
   - Sometimes requires special handling of register ranges

## Troubleshooting

If you're having issues with register values:

1. Check the byte order setting for the parameter
2. Verify the register index/address is correct
3. Make sure the data type is appropriate for the value being read
4. Confirm that the scaling factor and decimal point settings are appropriate
5. Enable debug logging to see the raw register values and conversion process

## Example Conversion Process

For a FLOAT32 value with registers [0x4237, 0x42C8] using ABCD byte ordering:

1. Create a 4-byte buffer
2. Write the first register to bytes 0-1: [0x42, 0x37, 0x00, 0x00]
3. Write the second register to bytes 2-3: [0x42, 0x37, 0x42, 0xC8]
4. Read the buffer as a 32-bit floating point: 123.456

## Testing

A test script is available at `/server/src/client/utils/test-modbus-parser.ts` with examples of different data types and byte orderings.