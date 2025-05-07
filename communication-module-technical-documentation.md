# Communication Module Technical Documentation

## Overview

The Communication Module is a comprehensive framework designed for industrial communication protocols, with a primary focus on Modbus TCP and RTU implementations. It provides a robust, type-safe, and feature-rich solution for communicating with industrial devices, supporting various data types, automatic reconnection, scheduled polling, and data caching.

## Key Features

- **Multiple Protocol Support**: Focused on Modbus TCP and RTU with a framework for extending to other protocols
- **Complete Modbus Implementation**: Full support for all standard Modbus function codes (01-16)
- **Data Type Conversions**: Utilities for all standard industrial data types (INT16, UINT16, FLOAT32, etc.)
- **Connection Management**: Automatic reconnection and connection state tracking
- **Polling Service**: Scheduled parameter reading with configurable intervals
- **Caching Service**: Parameter value caching with time-based invalidation
- **Event System**: Event-based notification for connection changes and data updates
- **Error Handling**: Comprehensive error types and recovery mechanisms
- **TypeScript Support**: Full TypeScript definitions with interfaces and type checking

## Architecture

The Communication Module follows a modular architecture with clear separation of concerns:

### Core Components

1. **Protocol Interfaces**: Defines the contract for communication protocols
2. **Device Interface**: Represents a physical or virtual device with communication capabilities
3. **Event System**: Provides event emission and subscription mechanisms
4. **Type Definitions**: Defines common types used throughout the module

### Protocol Implementations

1. **Modbus TCP**: Implementation of Modbus TCP protocol
2. **Modbus RTU**: Implementation of Modbus RTU protocol over serial connections
3. **Common Modbus Components**: Shared functionality between TCP and RTU implementations

### Services

1. **Device Manager**: Central registry for device management
2. **Polling Service**: Handles scheduled reading of device parameters
3. **Cache Service**: Caches parameter values for quick access
4. **Log Service**: Provides logging capabilities

### Utilities

1. **Buffer Utilities**: Functions for working with binary data
2. **Data Conversion**: Utilities for converting between data types

### Configuration

1. **Config Manager**: Manages module configuration
2. **Config Loader**: Loads configuration from files or objects

## Modbus Implementation Details

The Modbus implementation is divided into TCP and RTU variants, with shared components for common functionality.

### Common Components

- **Function Codes**: All standard Modbus function codes (01-16)
- **Data Types**: Support for all Modbus data types
- **PDU**: Protocol Data Unit handling
- **CRC**: Cyclic Redundancy Check for RTU messages
- **Utilities**: Common Modbus utilities

### Modbus TCP

- **Client**: ModbusTCPClient implementation
- **Connection**: TCP connection management

### Modbus RTU

- **Client**: ModbusRTUClient implementation
- **Connection**: Serial connection management with timeout handling and resource management

## Type System

The module employs a comprehensive type system to ensure type safety throughout:

### Core Types

- **RegisterType**: Enum for standard Modbus register types (COIL, DISCRETE_INPUT, INPUT_REGISTER, HOLDING_REGISTER)
- **DataType**: Enum for data types (BOOLEAN, INT16, UINT16, FLOAT32, etc.)
- **ByteOrder**: Enum for byte ordering options (AB, BA, ABCD, CDAB, etc.)
- **ConnectionState**: Enum for connection states (DISCONNECTED, CONNECTING, CONNECTED, ERROR)

### Interface Types

- **Protocol**: Base interface for all communication protocols
- **RawOperations**: Interface for low-level protocol operations
- **Parameter**: Represents a device parameter with register information
- **ParameterValue**: Represents a value read from a device parameter
- **RequestResult**: Represents the result of a device request

## Configuration Options

The module can be configured with various options to customize behavior:

### Connection Options

- **Timeout**: Request timeout in milliseconds
- **Retries**: Number of retry attempts for failed requests
- **Retry Interval**: Time between retry attempts
- **Auto Reconnect**: Whether to automatically reconnect on disconnection
- **Reconnect Interval**: Time between reconnection attempts

### Specific Protocol Options

#### TCP Options

- **Host**: IP address or hostname
- **Port**: TCP port (default 502 for Modbus TCP)

#### RTU Options

- **Path**: Serial port path
- **Baud Rate**: Serial baud rate
- **Data Bits**: Number of data bits
- **Stop Bits**: Number of stop bits
- **Parity**: Parity setting

## Helper Functions

### modbusHelper.ts

The `modbusHelper.ts` file provides essential utility functions for Modbus communication:

1. **createModbusClient()**: Creates a new Modbus RTU client with proper error handling.
2. **connectRTUBuffered()**: Establishes a buffered RTU connection with automatic timeout handling.
3. **safeCloseModbusClient()**: Safely closes a Modbus client connection, ensuring proper resource cleanup.
4. **readHoldingRegistersWithTimeout()**: Reads holding registers with a built-in timeout mechanism.
5. **readInputRegistersWithTimeout()**: Reads input registers with a built-in timeout mechanism.
6. **findRespondingDevice()**: Scans for Modbus devices by trying different slave IDs.

The helper includes critical features:
- Connection state tracking to prevent port conflicts
- Automatic port release on connection failures
- Timeout management with Promise.race() for all operations
- Error conversion to standardized formats
- Resource cleanup to prevent memory leaks

## Data Polling Service

### dataPollingService.ts

The data polling service provides structured and reliable polling of Modbus devices:

1. **pollDevice()**: Core function that reads parameters from a device according to its configuration
2. **getRealtimeData()**: Retrieves the latest cached data for a device
3. **storeHistoricalData()**: Stores device readings in a historical database
4. **startPollingDevice()**: Initiates a polling cycle for a device with error handling
5. **stopPollingDevice()**: Safely stops a polling cycle
6. **setDevicePolling()**: Configures polling parameters for a device

Key features:
- Error resilience with recovery mechanisms
- Automatic polling termination for disabled devices
- Connection state management
- Interval management to prevent memory leaks
- Data type conversion handling
- Byte order handling (ABCD, CDAB, BADC, DCBA)

## Error Handling

The module employs a comprehensive error handling strategy:

1. **Typed Errors**: Specialized error types for different error scenarios
   - ModbusError: For Modbus-specific errors with exception codes
   - ConnectionError: For connection-related errors
   - TimeoutError: For timeout errors
   - ParsingError: For data parsing errors

2. **Error Recovery**: Automatic recovery mechanisms for transient errors
   - Automatic retries with configurable limits
   - Connection re-establishment
   - Error event propagation

## Usage Examples

### Initializing the Module

```typescript
import { initializeModule } from './communication';

// Initialize with object
await initializeModule({
  defaultTimeout: 1000,
  // other config options
});

// Or initialize with config file path
await initializeModule('/path/to/config.json');
```

### Reading from a Modbus Device

```typescript
import { DeviceManager, Parameter, RegisterType, DataType } from './communication';

// Get device manager instance
const deviceManager = DeviceManager.getInstance();

// Create or get a device
const device = deviceManager.getDevice('deviceId');

// Define a parameter
const parameter: Parameter = {
  name: 'temperature',
  registerType: RegisterType.HOLDING_REGISTER,
  address: 100,
  dataType: DataType.FLOAT32,
  byteOrder: ByteOrder.ABCD,
  scaling: 0.1,
  units: '°C'
};

// Read the parameter
const result = await device.readParameter(parameter);

if (result.success) {
  console.log(`Temperature: ${result.data} ${parameter.units}`);
} else {
  console.error(`Error reading temperature: ${result.error?.message}`);
}
```

### Setting Up Polling

```typescript
import { PollingService } from './communication';

// Get polling service instance
const pollingService = PollingService.getInstance();

// Start polling a device
pollingService.startPolling('deviceId', 5000); // Poll every 5 seconds

// Subscribe to data updates
pollingService.on('data', (deviceId, data) => {
  console.log(`Received data from ${deviceId}:`, data);
});

// Stop polling when done
pollingService.stopPolling('deviceId');
```

## Best Practices

1. **Resource Management**: Always close connections when done
2. **Error Handling**: Implement proper error handling for all operations
3. **Polling Intervals**: Use reasonable polling intervals to avoid device overload
4. **Parameter Grouping**: Group parameters by register type and address for efficient reading
5. **Type Validation**: Validate parameter types and values before writing
6. **Event Handling**: Use events for asynchronous notifications
7. **Connection Timeouts**: Set appropriate timeouts for your network environment

## Advanced Features

1. **Custom Function Codes**: Support for custom Modbus function codes
2. **Parameter Aggregation**: Automatic grouping of parameters for efficient reading
3. **Data Transformation**: Pipeline for transforming raw data to business values
4. **Diagnostics**: Communication statistics collection and reporting
5. **Auto-Discovery**: Automatic device discovery on networks
6. **Simulated Devices**: Virtual devices for testing and development

## Troubleshooting

Common issues and solutions:

1. **Connection Timeouts**: Increase timeout values, check network connectivity
2. **Serial Port Access**: Ensure correct permissions for serial ports
3. **Byte Order Issues**: Verify correct byte order for multi-register values
4. **Memory Leaks**: Ensure polling is properly stopped when not needed
5. **Data Type Errors**: Verify correct data type and register configuration

## Limitations and Considerations

1. **Platform Compatibility**: Serial port support varies by platform
2. **Performance**: High polling rates may impact system performance
3. **Security**: Modbus has limited security features
4. **Concurrency**: Be mindful of resource constraints with many connections
5. **Error Propagation**: Handle errors appropriately to prevent cascading failures

## Future Development

1. **Additional Protocols**: Support for other industrial protocols (e.g., OPC UA, EtherNet/IP)
2. **Web Socket Interface**: Real-time communication with web clients
3. **Security Enhancements**: TLS support for TCP connections
4. **Advanced Diagnostics**: More detailed performance metrics
5. **Simulator Enhancements**: More realistic device simulation

## Dependencies

- **modbus-serial**: Node.js library for Modbus communication
- **serialport**: Library for serial port access
- **chalk**: Terminal string styling for logs
- **events**: Node.js events module for event handling
- **mongoose**: MongoDB ODM for historical data storage