# Communication Module

## Overview

This module provides a robust communication framework for industrial protocols, with a primary focus on Modbus TCP and RTU. It is designed to be reliable, efficient, and easy to integrate with the existing codebase.

## Key Features

- Protocol-agnostic device interface with Modbus implementations
- Robust error handling and recovery mechanisms
- Connection pooling and management
- Parameter grouping for optimized reads
- Caching for efficient data access
- Configurable polling service
- Comprehensive logging
- Event-driven architecture

## Architecture

The module is organized into several components:

- **Core**: Interfaces and types for protocol-agnostic device communication
- **Protocols**: Protocol-specific implementations (Modbus TCP/RTU)
- **Services**: Utility services for device management, polling, caching, and logging
- **Utils**: Helper utilities for data conversion and buffer manipulation
- **Config**: Configuration management

## Integration with Existing Code

The module provides adapter classes to integrate with the existing codebase:

- `modbusAdapter.ts`: Connects legacy modbusHelper with the new module
- `pollingServiceAdapter.ts`: Integrates the new polling service with existing dataPollingService

## Usage Examples

### Initialize the Module

```typescript
import { initCommunicationModule } from './communication';

// Initialize with default settings
const { deviceManager, pollingService } = await initCommunicationModule();

// Or with custom settings
const { deviceManager, pollingService } = await initCommunicationModule({
  logLevel: 'debug',
  enableCaching: true,
  cacheTTL: 30000 // 30 seconds
});
```

### Create and Register a Device

```typescript
import { ModbusDevice } from './communication/core/device.concrete';
import { ModbusTCPClient } from './communication/protocols/modbus/tcp/client';
import { deviceManager } from './communication/services';
import { RegisterType, DataType, ByteOrder } from './communication/core/types';

// Create a Modbus TCP client
const client = new ModbusTCPClient({
  host: '192.168.1.100',
  port: 502,
  unitId: 1
});

// Create a device
const device = new ModbusDevice({
  id: 'device1',
  name: 'Temperature Controller',
  client,
  parameters: [
    {
      id: 'temp',
      name: 'Temperature',
      address: 100,
      registerType: RegisterType.HOLDING_REGISTER,
      dataType: DataType.FLOAT32,
      byteOrder: ByteOrder.ABCD,
      scalingFactor: 0.1,
      unit: '°C'
    },
    {
      id: 'humidity',
      name: 'Humidity',
      address: 102,
      registerType: RegisterType.HOLDING_REGISTER,
      dataType: DataType.UINT16,
      byteOrder: ByteOrder.AB,
      unit: '%'
    }
  ]
});

// Register the device
deviceManager.registerDevice(device);
```

### Reading Parameters

```typescript
// Read a single parameter
const temperature = await device.readParameter('temp');
console.log(`Temperature: ${temperature}°C`);

// Read multiple parameters
const values = await device.readParameters(['temp', 'humidity']);
console.log(`Temperature: ${values.temp}°C, Humidity: ${values.humidity}%`);

// Read all parameters
const allValues = await device.readAllParameters();
console.log(allValues);
```

### Setting Up Polling

```typescript
import { pollingService } from './communication/services';

// Start polling a device (reads all parameters)
pollingService.startPolling('device1', 5000); // Poll every 5 seconds

// Start polling specific parameters
pollingService.startPolling('device1', 5000, ['temp', 'humidity']);

// Stop polling
pollingService.stopPolling('device1');

// Register for data events
pollingService.on('data', (deviceId, paramId, value) => {
  console.log(`Device ${deviceId}, Parameter ${paramId}: ${value}`);
});

// Register for error events
pollingService.on('error', (deviceId, error) => {
  console.error(`Error polling device ${deviceId}: ${error}`);
});
```

### Migration from Old System

A migration script is provided to help transition from the old polling service to the new communication module:

```bash
node scripts/migrate-polling-service.js
```

This script:
1. Reads all enabled devices from the database
2. Initializes them in the new communication module
3. Starts polling with the same intervals as before

## Configuration

The module is highly configurable through the `configManager`:

```typescript
import { configManager } from './communication/config';

// Update Modbus configuration
configManager.updateModbusConfig({
  timeout: 3000,
  maxRetries: 2
});

// Update polling configuration
configManager.updatePollingConfig({
  minInterval: 2000,
  maxConcurrentPolls: 3
});
```

Configuration can also be loaded from environment variables:

```
MODBUS_TIMEOUT=3000
MODBUS_MAX_RETRIES=2
LOG_LEVEL=debug
CACHE_ENABLED=true
CACHE_TTL=30000
DEFAULT_POLLING_INTERVAL=5000
```

## Error Handling

The module includes comprehensive error handling:

```typescript
import { ModbusError, ConnectionError, TimeoutError } from './communication/core/errors';

try {
  await device.readParameter('temp');
} catch (error) {
  if (error instanceof ConnectionError) {
    console.error('Connection lost, attempting to reconnect...');
    // Handle reconnection
  } else if (error instanceof TimeoutError) {
    console.error('Operation timed out');
    // Handle timeout
  } else if (error instanceof ModbusError) {
    console.error(`Modbus error: ${error.message}, code: ${error.errorCode}`);
    // Handle specific Modbus error
  } else {
    console.error(`Unknown error: ${error}`);
  }
}
```

## Logging

The module includes a comprehensive logging service:

```typescript
import { logService } from './communication/services';

// Set log level
logService.setLogLevel('debug');

// Log messages
logService.debug('Detailed debug information');
logService.info('General information');
logService.warn('Warning');
logService.error('Error message');
```