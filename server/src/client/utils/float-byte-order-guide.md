# Guide for Debugging FLOAT32 Register Values

When FLOAT32 values are showing as 0 or extremely small numbers, it's usually due to a byte order mismatch. This guide helps you identify and fix the issue.

## Common Byte Orders for FLOAT32 Values

1. **ABCD (Big-Endian)**: 
   - Most significant byte first
   - Default in many devices
   - Example: Original value 123.456 → Registers [0x4237, 0x42C8]

2. **CDAB**:
   - Register order swapped
   - Common in Chinese energy meters
   - Example: Original value 123.456 → Registers [0x42C8, 0x4237]
   
3. **BADC**:
   - Bytes within each register swapped
   - Used by Siemens and some other manufacturers 
   - Example: Original value 123.456 → Registers [0x3742, 0xC842]

4. **DCBA (Little-Endian)**:
   - Complete byte order reversal
   - Used by some PLCs and microcontrollers
   - Example: Original value 123.456 → Registers [0xC842, 0x3742]

## How to Debug Register Problems

1. **Check Raw Register Values**:
   - Look at the log for "Register values: [X, Y]"
   - Note these values in hexadecimal: e.g. [0x007b, 0x436b]

2. **Try Different Byte Orders**:
   - If you're getting very small values (e.g. 1.13e-38) or zeros, try changing the byte order:
   - ABCD → CDAB (most common fix)
   - ABCD → BADC (if the above doesn't work)
   - ABCD → DCBA (last resort)

3. **Device-Specific Notes**:
   - Chinese energy analyzers: Usually CDAB 
   - Schneider Electric: Usually ABCD
   - Siemens: Often BADC
   - ABB: Varies by model, check documentation

4. **To Manually Calculate**:
   1. Write down the registers in hex (e.g. [0x007b, 0x436b])
   2. Arrange bytes according to the byte order:
      - ABCD: [0x00, 0x7b, 0x43, 0x6b]
      - CDAB: [0x43, 0x6b, 0x00, 0x7b]
      - BADC: [0x7b, 0x00, 0x6b, 0x43]
      - DCBA: [0x6b, 0x43, 0x7b, 0x00]
   3. Use an IEEE-754 calculator to convert the hex to a floating point value
   
5. **Update Device Configuration**:
   - Once you find the correct byte order, update the device's parameter configuration
   
Remember: When you see extremely small values like 1.13e-38, it's almost always a byte order issue!