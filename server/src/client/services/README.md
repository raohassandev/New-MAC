# Device Services

This directory contains modular services for device operations, especially for Modbus communication.

## Device Service

The `deviceService.ts` file contains functions for working with Modbus devices:

### Main Functions

- `readDeviceRegisters(deviceId, reqContext)`: Main entry point - reads registers from a device by ID
- `readDeviceRegistersData(device)`: Reads all registers from a device based on its configuration
- `connectToModbusDevice(device)`: Establishes a connection to a Modbus device
- `getDeviceModel(reqContext)`: Gets the correct Mongoose model for Device with proper DB connection

### Helper Functions

- `getAdjustedAddressAndCount(device, range)`: Adjusts register addresses based on device manufacturer 
- `calculateRelativeIndex(param, range)`: Calculates relative index of parameter within a range
- `processParameter(param, result, relativeIndex, device)`: Processes a parameter from Modbus data
- `processFloat32(reg1, reg2, byteOrder)`: Processes FLOAT32 values from two registers
- `getByteOrder(param, device)`: Determines byte order based on device and parameter
- `processAndFormatValue(value, param)`: Handles scaling, formatting, and constraints

## Usage in Controllers

```typescript
import * as deviceService from '../services/deviceService';

// Inside your controller function
try {
  const result = await deviceService.readDeviceRegisters(deviceId, req);
  res.json(result);
} catch (error) {
  // Handle errors
}
```

## Benefits of this Design

1. **Separation of concerns**: Controller handles HTTP, Service handles business logic
2. **Testability**: Each function can be tested independently
3. **Reusability**: Functions can be used in multiple places
4. **Maintainability**: Easier to understand and modify smaller functions
5. **Error handling**: Clear separation of error types and handling