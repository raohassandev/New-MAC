# Data Polling Service Documentation

## Overview
The Data Polling Service provides functionality for communicating with Modbus devices (TCP and RTU), collecting measurements, and storing real-time and historical data. It handles connection management, data processing, and error recovery.

## Key Features
- Supports both Modbus TCP and RTU connections
- Reads data using multiple Modbus function codes
- Processes raw data with multiple data types and byte orders
- Applies scaling factors and equations to measurements
- Stores data in both real-time cache and historical database
- Implements adaptive polling with backoff for unreliable connections

## Core Functions

### `pollDevice(deviceId: string): Promise<DeviceReading | null>`
Polls a device for data based on its configuration.

**Parameters:**
- `deviceId`: The ID of the device to poll

**Returns:**
- A promise that resolves with the device readings or null if polling fails

**Process:**
1. Retrieves device configuration from database
2. Validates device is enabled and has reading configuration
3. Establishes Modbus connection based on device settings (TCP or RTU)
4. Reads registers based on configured ranges and function codes
5. Processes raw data based on parameter data types and transformations
6. Updates device lastSeen timestamp
7. Stores readings in both real-time cache and historical database

### `getRealtimeData(deviceId: string): DeviceReading | null`
Retrieves the latest real-time data for a device.

**Parameters:**
- `deviceId`: The ID of the device

**Returns:**
- The latest device reading or null if not available

### `startPollingDevice(deviceId: string, intervalMs: number): NodeJS.Timeout`
Starts polling a device at a specific interval.

**Parameters:**
- `deviceId`: The ID of the device to poll
- `intervalMs`: The polling interval in milliseconds (default: 10000)

**Returns:**
- The interval ID

**Features:**
- Adaptive polling with backoff for unreliable devices
- Automatic recovery and interval restoration when device comes back online
- Immediate initial poll followed by regular interval polling

### `stopPollingDevice(deviceId: string): void`
Stops polling for a device.

**Parameters:**
- `deviceId`: The ID of the device to stop polling

### `setDevicePolling(deviceId: string, intervalMs: number): void`
Starts or restarts polling for a device.

**Parameters:**
- `deviceId`: The ID of the device
- `intervalMs`: The polling interval in milliseconds (default: 10000)

## Data Processing
The service supports various data types and transformations:
- **Data Types**: FLOAT32, INT16, UINT16, and others
- **Byte Orders**: ABCD, CDAB, BADC, DCBA for multi-register types
- **Transformations**: 
  - Scaling factors
  - Scaling equations
  - Decimal point formatting

## Error Handling
- Connection failures are logged with detailed diagnostics
- Device-specific error handling for common issues (timeout, refused, permission)
- Adaptive polling reduces connection attempts to unreliable devices
- Data processing errors are contained to individual parameters

## Caching and Storage
- Real-time data is stored in memory for immediate access
- Historical data is stored in MongoDB for trend analysis
- Error statuses are tracked and stored
- Valid readings are filtered before historical storage

## Usage Examples

### Start polling a device every 5 seconds
```typescript
import { setDevicePolling } from './dataPollingService';

// Start polling device with ID '6123456789abcdef12345678' every 5 seconds
setDevicePolling('6123456789abcdef12345678', 5000);
```

### Get latest real-time data for a device
```typescript
import { getRealtimeData } from './dataPollingService';

// Get the latest readings
const latestData = getRealtimeData('6123456789abcdef12345678');
console.log(`Temperature: ${latestData?.readings.find(r => r.name === 'temperature')?.value}°C`);
```

### Manual one-time poll
```typescript
import { pollDevice } from './dataPollingService';

// Poll device once and process results
pollDevice('6123456789abcdef12345678')
  .then(reading => {
    if (reading) {
      console.log(`Successfully polled ${reading.deviceName} with ${reading.readings.length} parameters`);
    } else {
      console.log('Polling failed');
    }
  });
```