# Modbus Communication Server

This is the backend server for the Modbus communication application. It provides a REST API for managing devices, reading Modbus registers, and handling device configuration.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Structure](#database-structure)
- [API Endpoints](#api-endpoints)
- [Modbus Communication](#modbus-communication)
- [Monitoring and Logging](#monitoring-and-logging)
- [Error Handling](#error-handling)
- [Development](#development)

## Overview

The server is built using Node.js, Express, and TypeScript. It connects to MongoDB databases for device management and configuration. The primary purpose is to provide an interface between the frontend application and Modbus-enabled devices, allowing for real-time monitoring and control of industrial equipment.

## Architecture

The server is organized into several major components:

```
/server
├── src/
│   ├── amx/                  # AMX library management (device drivers, types)
│   ├── client/               # Client API and device communication
│   ├── communication/        # Core communication module
│   ├── config/               # Configuration files
│   ├── middleware/           # Express middleware
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── index.ts              # Entry point
│   └── server.ts             # Express server setup
├── scripts/                  # Utility scripts
└── dist/                     # Compiled JavaScript (build output)
```

### Key Components

- **AMX Module**: Handles device drivers and template management
- **Client Module**: Main API for device communication and management
- **Communication Module**: Core functionality for protocol handling (Modbus TCP/RTU)

## Database Structure

The application uses two MongoDB databases:

1. **Client Database**: Stores device information, historical data, and user profiles
   - Collections: Devices, Users, Profiles, Alerts, HistoricalData

2. **AMX Database**: Stores device drivers, templates, and device types
   - Collections: DeviceDrivers, DeviceTypes, Templates

## API Endpoints

The API is organized around two main namespaces. Below we detail the request/response formats for key endpoints.

### Client API (`/client/api`)

#### Device Management

- `GET /client/api/devices` - List all devices
  - **Query Parameters**:
    - `limit` - Number of devices to return (default: 100)
    - `offset` - Pagination offset (default: 0)
    - `sort` - Sort field (e.g., `name`, `lastSeen`)
    - `order` - Sort order (`asc` or `desc`)
    - `filter` - JSON filter criteria
  - **Response**: 
    ```json
    {
      "devices": [
        {
          "_id": "681c989bb4d2ff4a937b3835",
          "name": "Haiwell Device",
          "description": "Energy analyzer PZ96-E4",
          "enabled": true,
          "make": "China Energy Analyzer",
          "model": "PZ96-E4",
          "lastSeen": "2025-05-08T13:44:12.907Z",
          "connectionSetting": {
            "connectionType": "tcp",
            "tcp": {
              "ip": "192.168.1.100",
              "port": 502,
              "slaveId": 1
            }
          },
          "dataPoints": [
            {
              "range": {
                "startAddress": 0,
                "count": 8,
                "fc": 3
              },
              "parser": {
                "parameters": [
                  {
                    "name": "L1",
                    "registerIndex": 0,
                    "dataType": "FLOAT32",
                    "wordCount": 2,
                    "unit": "A"
                  },
                  // More parameters...
                ]
              }
            }
          ]
        }
      ],
      "total": 1,
      "page": 1,
      "pages": 1
    }
    ```

- `GET /client/api/devices/:id` - Get device by ID
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**: Single device object (same structure as in list response)

- `POST /client/api/devices` - Create a new device
  - **Request Body**:
    ```json
    {
      "name": "New Device",
      "description": "Description of the device",
      "enabled": true,
      "make": "Manufacturer",
      "model": "Model Number",
      "connectionSetting": {
        "connectionType": "tcp",
        "tcp": {
          "ip": "192.168.1.100",
          "port": 502,
          "slaveId": 1
        }
      },
      "dataPoints": [
        {
          "range": {
            "startAddress": 0,
            "count": 8,
            "fc": 3
          },
          "parser": {
            "parameters": [
              {
                "name": "Parameter 1",
                "registerIndex": 0,
                "dataType": "FLOAT32",
                "wordCount": 2,
                "unit": "A"
              }
            ]
          }
        }
      ]
    }
    ```
  - **Response**: Created device object with assigned ID

- `PUT /client/api/devices/:id` - Update device
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**: Device object (same structure as in create)
  - **Response**: Updated device object

- `DELETE /client/api/devices/:id` - Delete device
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**: 
    ```json
    {
      "message": "Device deleted successfully",
      "deviceId": "681c989bb4d2ff4a937b3835"
    }
    ```

#### Device Communication

- `GET /client/api/devices/:id/read` - Read registers from device
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**: 
    ```json
    {
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "requestId": "modbus-1720527852907-123",
      "readings": [
        {
          "name": "L1",
          "registerIndex": 0,
          "address": 0,
          "value": 9.183563628783764e-40,
          "unit": "A",
          "dataType": "FLOAT32",
          "description": ""
        },
        {
          "name": "L2",
          "registerIndex": 2,
          "address": 2,
          "value": 0,
          "unit": "A",
          "dataType": "FLOAT32",
          "description": ""
        }
      ]
    }
    ```
  - **Error Response**:
    ```json
    {
      "message": "Failed to read from device: Connection timeout",
      "requestId": "modbus-1720527852907-123",
      "errorType": "modbus_communication_error"
    }
    ```

- `POST /client/api/devices/:id/test` - Test connection to device
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response (Success)**:
    ```json
    {
      "success": true,
      "message": "Connection successful",
      "deviceId": "681c989bb4d2ff4a937b3835",
      "requestId": "modbus-1720527852907-123",
      "connectionDetails": {
        "ip": "192.168.1.100",
        "port": 502,
        "connectionType": "tcp",
        "responseTime": 135
      }
    }
    ```
  - **Response (Failure)**:
    ```json
    {
      "success": false,
      "message": "Failed to connect: Connection refused",
      "deviceId": "681c989bb4d2ff4a937b3835",
      "requestId": "modbus-1720527852907-123",
      "error": "ECONNREFUSED",
      "errorType": "connection_error",
      "troubleshooting": "Check that the device is powered on and connected to the network."
    }
    ```

- `POST /client/api/devices/:id/write` - Write to device registers
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "registers": [
        {
          "address": 100,
          "value": 42,
          "fc": 6
        }
      ]
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Write operation successful",
      "deviceId": "681c989bb4d2ff4a937b3835",
      "requestId": "modbus-1720527852907-123",
      "operations": [
        {
          "address": 100,
          "value": 42,
          "status": "success"
        }
      ]
    }
    ```

#### Device Data

- `GET /client/api/devices/:id/data` - Get historical data
  - **URL Parameters**: 
    - `id` - Device ID
  - **Query Parameters**:
    - `from` - Start timestamp (ISO format)
    - `to` - End timestamp (ISO format)
    - `parameters` - Comma-separated list of parameter names
    - `limit` - Number of records to return
  - **Response**:
    ```json
    {
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "parameters": ["L1", "L2"],
      "data": [
        {
          "timestamp": "2025-05-08T13:30:00.000Z",
          "values": {
            "L1": 10.5,
            "L2": 11.2
          }
        },
        {
          "timestamp": "2025-05-08T13:35:00.000Z",
          "values": {
            "L1": 10.7,
            "L2": 11.3
          }
        }
      ]
    }
    ```

#### Authentication

- `POST /client/api/auth/login` - User login
  - **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "password123"
    }
    ```
  - **Response**:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "12345",
        "name": "John Doe",
        "email": "user@example.com",
        "role": "admin",
        "permissions": ["manage_devices", "read_devices"]
      }
    }
    ```

#### Monitoring

- `GET /client/api/monitoring/stats` - Get system statistics
  - **Response**:
    ```json
    {
      "timestamp": "2025-05-08T14:00:00.000Z",
      "stats": {
        "totalRequests": 1250,
        "successRequests": 1150,
        "failedRequests": 85,
        "timeoutRequests": 15,
        "requestsByDevice": {
          "681c989bb4d2ff4a937b3835": {
            "total": 500,
            "success": 480,
            "failed": 15,
            "timeout": 5,
            "avgResponseTime": 125.5
          }
        },
        "requestsByMinute": {
          "14:00": {
            "total": 60,
            "success": 58,
            "failed": 2,
            "timeout": 0
          }
        },
        "errors": [
          {
            "timestamp": "2025-05-08T13:58:12.000Z",
            "requestId": "modbus-1720527852907-123",
            "deviceId": "681c989bb4d2ff4a937b3835",
            "error": "Connection refused",
            "elapsedMs": 2500
          }
        ],
        "lastRequests": [
          {
            "timestamp": "2025-05-08T14:00:05.000Z",
            "requestId": "modbus-1720527852907-123",
            "deviceId": "681c989bb4d2ff4a937b3835",
            "status": "success",
            "elapsedMs": 135,
            "readings": 8
          }
        ]
      }
    }
    ```

### AMX API (`/amx/api`)

- `GET /amx/api/device-drivers` - List all device drivers
  - **Response**:
    ```json
    {
      "deviceDrivers": [
        {
          "_id": "abc123",
          "name": "Modbus Energy Analyzer",
          "manufacturer": "Generic",
          "protocolType": "modbus",
          "supportedDeviceTypes": ["energy_analyzer", "power_meter"]
        }
      ]
    }
    ```

- `GET /amx/api/device-types` - List all device types
- `GET /amx/api/templates` - List all templates

## Modbus Communication

The server supports both Modbus TCP and Modbus RTU protocols:

### Modbus TCP

Used for Ethernet-connected devices. Configuration includes:
- IP address
- Port (default: 502)
- Slave ID / Unit ID

### Modbus RTU

Used for serial-connected devices. Configuration includes:
- Serial port (COM1, /dev/ttyS0, etc.)
- Baud rate (9600, 19200, etc.)
- Parity (none, odd, even)
- Data bits (7, 8)
- Stop bits (1, 2)
- Slave ID / Unit ID

### Register Reading

The server supports reading different types of Modbus registers:
- Function code 1: Read Coils
- Function code 2: Read Discrete Inputs
- Function code 3: Read Holding Registers (most common)
- Function code 4: Read Input Registers

### Data Types

The server supports various data types for Modbus values:
- INT16, UINT16: 16-bit integers
- INT32, UINT32: 32-bit integers
- FLOAT32: 32-bit floating point (IEEE 754)
- Boolean: True/False values

## Monitoring and Logging

The server includes comprehensive monitoring and logging:

- **API Request Logging**: Tracks all API requests with timing information
- **Modbus Communication Logging**: Detailed logs of Modbus operations
- **Error Tracking**: Correlation IDs for tracing errors through the system
- **Statistics Dashboard**: Available at `/client/api/monitoring`

## Error Handling

The server implements standardized error handling:

- HTTP status codes reflect the nature of errors
- JSON error responses include:
  - `message`: Human-readable error description
  - `errorType`: Categorized error type
  - `requestId`: Correlation ID for tracking
  - `troubleshooting`: Optional troubleshooting advice

Common error types:
- `device_not_found`: Device ID doesn't exist
- `device_disabled`: Device exists but is disabled
- `connection_error`: Cannot establish connection to device
- `modbus_communication_error`: Communication failed after connection
- `timeout_error`: Operation took too long
- `parsing_error`: Error parsing device response

## Frontend Integration

This section provides guidance for frontend developers on integrating with the backend.

### API Client Setup

The recommended approach for frontend integration is to create an API client using Axios:

```typescript
// api.ts
import axios from 'axios';

// Use environment variable for the API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

// Create the axios instance with the correct base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token functions
export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  localStorage.setItem('token', token);
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('token');
};

// Load token from storage on initial load
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

// Device API calls
export const getDevices = async () => {
  try {
    const response = await api.get('/client/api/devices');
    return response.data;
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw error;
  }
};

export const readDeviceRegisters = async (id: string) => {
  try {
    // Set a longer timeout specifically for this request
    const response = await api.get(`/client/api/devices/${id}/read`, {
      timeout: 60000, // 60 seconds timeout
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    // Return the data
    return response.data;
  } catch (error) {
    console.error('Error reading device registers:', error);
    
    // Return a structured error for handling by the UI
    return {
      error: true,
      message: error.message || 'Failed to read device registers',
      deviceId: id,
      timestamp: new Date(),
      readings: []
    };
  }
};

export default api;
```

### Handling Modbus Data

When displaying Modbus values, especially floating-point values, special handling is required for extremely small values:

```typescript
// modbusValueFormatter.ts
export function formatByDataType(
  value: number | string | null | undefined,
  dataType: string | undefined
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  // Format based on data type
  switch (dataType) {
    case 'FLOAT32':
    case 'FLOAT':
      // For floating point values, properly handle scientific notation
      const floatVal = typeof value === 'string' ? parseFloat(value) : value as number;
      
      // Handle non-zero extremely small values with scientific notation
      if (Math.abs(floatVal) < 1e-20 && floatVal !== 0) {
        return floatVal.toExponential(2); // Use scientific notation with 2 decimal places
      }
      
      // Handle normal float values
      return formatModbusValue(value, 2, true);
    
    case 'INT16':
    case 'INT32':
      return formatModbusValue(value, 0, false);
      
    case 'UINT16':
    case 'UINT32':
      // Ensure positive integers
      const numVal = typeof value === 'string' ? parseInt(value, 10) : value;
      return formatModbusValue(Math.max(0, numVal), 0, false);
      
    default:
      // Default to 2 decimal places for unknown types
      return formatModbusValue(value, 2, true);
  }
}
```

### Error Handling

The backend uses standardized error responses that should be handled appropriately in the frontend:

```typescript
interface ModbusError {
  message: string;
  requestId?: string;
  errorType?: string;
  troubleshooting?: string;
  deviceInfo?: {
    name?: string;
    connectionType?: string;
    address?: string;
  };
}

// Example error handler component
const ConnectionErrorDisplay: React.FC<ModbusError> = ({
  message,
  errorType,
  troubleshooting,
  deviceInfo,
  onDismiss
}) => {
  return (
    <div className="error-container">
      <h3>Connection Error</h3>
      <p className="error-message">{message}</p>
      
      {errorType && <div className="error-type">Type: {errorType}</div>}
      
      {troubleshooting && (
        <div className="troubleshooting-section">
          <h4>Troubleshooting:</h4>
          <p>{troubleshooting}</p>
        </div>
      )}
      
      {deviceInfo && (
        <div className="device-info">
          <h4>Device Information:</h4>
          <ul>
            {deviceInfo.name && <li>Name: {deviceInfo.name}</li>}
            {deviceInfo.connectionType && <li>Connection: {deviceInfo.connectionType}</li>}
            {deviceInfo.address && <li>Address: {deviceInfo.address}</li>}
          </ul>
        </div>
      )}
      
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
};
```

### Polling and Real-time Updates

For periodic device data reading, implement a polling mechanism:

```typescript
// In your component
useEffect(() => {
  // Clean up existing timer if any
  if (pollingTimerRef.current) {
    window.clearInterval(pollingTimerRef.current);
    pollingTimerRef.current = null;
  }

  // Only set up polling if enabled and we have a valid device
  if (autoPolling && deviceId) {
    console.log(`Starting auto-polling every ${pollingInterval}ms for device ${deviceId}`);

    // Create a new interval that calls the read registers function
    pollingTimerRef.current = window.setInterval(() => {
      console.log(`Auto-polling: Fetching data for device ${deviceId}`);
      readDeviceRegisters(deviceId).then(data => {
        if (!data.error) {
          setReadings(data.readings);
        }
      });
    }, pollingInterval);
  }

  // Clean up on unmount
  return () => {
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };
}, [autoPolling, pollingInterval, deviceId]);
```

## Development

### Prerequisites

- Node.js 14+
- MongoDB
- Serial port drivers (for Modbus RTU)

### Building

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Environment Variables

- `PORT`: Server port (default: 3333)
- `NODE_ENV`: Environment (`development`, `production`)
- `CLIENT_DB_URI`: MongoDB URI for client database
- `AMX_DB_URI`: MongoDB URI for AMX library database
- `JWT_SECRET`: Secret for JWT authentication
- `LOG_LEVEL`: Logging detail level (`error`, `warn`, `info`, `debug`)

### Testing

```bash
# Run unit tests
npm test

# Test connection to Modbus device
node scripts/test-modbus-port.js --ip=192.168.1.100 --port=502 --unit=1
```