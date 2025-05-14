# MacSys Client API Documentation

This document provides comprehensive information about the available API endpoints in the MacSys backend system. It is intended for frontend developers who need to interact with the backend services.

## Table of Contents

1. [Authentication](#authentication)
2. [Device Management](#device-management)
3. [Device Control](#device-control)
4. [Polling](#polling)
5. [Auto-Polling](#auto-polling)
6. [Realtime Data](#realtime-data)
7. [Monitoring](#monitoring)

## Authentication

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get authentication token |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/logout` | Logout and invalidate token |

### Example Requests

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "user@example.com",
    "roles": ["user", "admin"]
  }
}
```

## Device Management

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | Get all devices (with optional filtering) |
| POST | `/api/devices` | Create a new device |
| GET | `/api/devices/:id` | Get a specific device by ID |
| PUT | `/api/devices/:id` | Update a specific device |
| DELETE | `/api/devices/:id` | Delete a specific device |
| POST | `/api/devices/:id/test` | Test connection to a device |
| GET | `/api/devices/:id/read` | Read registers from a device |
| GET | `/api/devices/by-driver/:driverId` | Get devices by driver ID |
| GET | `/api/devices/by-usage/:usage` | Get devices by usage category |

### Example Requests

#### Get All Devices

```http
GET /api/devices?status=online&type=AC&limit=10&page=1
```

Response:

```json
{
  "devices": [
    {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "HVAC Unit 1",
      "make": "AC",
      "model": "Model X",
      "enabled": true,
      "connectionSetting": {
        "connectionType": "tcp",
        "tcp": {
          "ip": "192.168.1.100",
          "port": 502,
          "slaveId": 1
        }
      },
      "description": "Main building HVAC unit"
    },
    // More devices...
  ],
  "pagination": {
    "total": 35,
    "page": 1,
    "limit": 10,
    "pages": 4
  }
}
```

#### Create Device

```http
POST /api/devices
Content-Type: application/json

{
  "name": "New HVAC Unit",
  "make": "AC",
  "model": "ZX-500",
  "description": "Secondary building HVAC",
  "enabled": true,
  "deviceDriverId": "60d21b4667d0d8992e610c90",
  "connectionSetting": {
    "connectionType": "tcp",
    "tcp": {
      "ip": "192.168.1.101",
      "port": 502,
      "slaveId": 1
    }
  }
}
```

#### Test Device Connection

```http
POST /api/devices/60d21b4667d0d8992e610c85/test
```

Response:

```json
{
  "success": true,
  "message": "Successfully connected to device",
  "deviceInfo": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "HVAC Unit 1",
    "connection": {
      "type": "tcp",
      "address": "192.168.1.100:502"
    }
  },
  "status": "CONNECTED",
  "timestamp": "2023-05-12T15:23:45.678Z"
}
```

#### Read Device Registers

```http
GET /api/devices/60d21b4667d0d8992e610c85/read
```

Response:

```json
{
  "success": true,
  "deviceId": "60d21b4667d0d8992e610c85",
  "deviceName": "HVAC Unit 1",
  "timestamp": "2023-05-12T15:25:12.345Z",
  "readings": [
    {
      "name": "temperature",
      "registerIndex": 40001,
      "address": 40001,
      "value": 23.5,
      "unit": "°C",
      "dataType": "FLOAT32"
    },
    {
      "name": "humidity",
      "registerIndex": 40003,
      "address": 40003,
      "value": 45,
      "unit": "%",
      "dataType": "UINT16"
    }
    // More readings...
  ]
}
```

## Device Control

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/devices/:id/control` | Control a device with multiple parameters |
| PUT | `/api/devices/:id/setpoint/:parameter` | Set a specific parameter for a device |
| POST | `/api/devices/batch-control` | Control multiple devices with a single request |

### Example Requests

#### Control Device (Multiple Parameters)

```http
POST /api/devices/60d21b4667d0d8992e610c85/control
Content-Type: application/json

{
  "parameters": [
    {
      "name": "temperatureSetpoint",
      "value": 23.5,
      "registerIndex": 40001,
      "dataType": "FLOAT32",
      "byteOrder": "ABCD"
    },
    {
      "name": "fanSpeed",
      "value": 2,
      "registerIndex": 40003,
      "dataType": "UINT16"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "deviceId": "60d21b4667d0d8992e610c85",
  "deviceName": "HVAC Unit 1",
  "timestamp": "2023-05-12T15:30:45.123Z",
  "summary": "2/2 parameters set successfully",
  "results": [
    {
      "success": true,
      "parameter": "temperatureSetpoint",
      "value": 23.5,
      "registerIndex": 40001,
      "message": "Successfully wrote value 23.5 to temperatureSetpoint at register 40001"
    },
    {
      "success": true,
      "parameter": "fanSpeed",
      "value": 2,
      "registerIndex": 40003,
      "message": "Successfully wrote value 2 to fanSpeed at register 40003"
    }
  ]
}
```

#### Set Specific Parameter

```http
PUT /api/devices/60d21b4667d0d8992e610c85/setpoint/temperature
Content-Type: application/json

{
  "value": 24.0,
  "dataType": "FLOAT32",
  "registerIndex": 40001,
  "byteOrder": "ABCD"
}
```

Response:

```json
{
  "success": true,
  "deviceId": "60d21b4667d0d8992e610c85",
  "deviceName": "HVAC Unit 1",
  "parameter": "temperature",
  "value": 24.0,
  "message": "Successfully set parameter \"temperature\" to 24.0"
}
```

#### Batch Control (Multiple Devices)

```http
POST /api/devices/batch-control
Content-Type: application/json

{
  "commands": [
    {
      "deviceId": "60d21b4667d0d8992e610c85",
      "parameters": [
        {
          "name": "temperatureSetpoint",
          "value": 23.5,
          "registerIndex": 40001,
          "dataType": "FLOAT32",
          "byteOrder": "ABCD"
        },
        {
          "name": "fanSpeed",
          "value": 2,
          "registerIndex": 40003,
          "dataType": "UINT16"
        }
      ]
    },
    {
      "deviceId": "60d21b4667d0d8992e610c86",
      "parameters": [
        {
          "name": "powerState",
          "value": 1,
          "registerIndex": 40010,
          "dataType": "BOOL"
        }
      ]
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "allSuccess": true,
  "summary": {
    "totalDevices": 2,
    "successfulDevices": 2,
    "failedDevices": 0
  },
  "timestamp": "2023-05-12T15:35:22.456Z",
  "results": [
    {
      "deviceId": "60d21b4667d0d8992e610c85",
      "deviceName": "HVAC Unit 1",
      "success": true,
      "results": [
        {
          "success": true,
          "parameter": "temperatureSetpoint",
          "value": 23.5,
          "registerIndex": 40001,
          "message": "Successfully wrote value 23.5 to temperatureSetpoint at register 40001"
        },
        {
          "success": true,
          "parameter": "fanSpeed",
          "value": 2,
          "registerIndex": 40003,
          "message": "Successfully wrote value 2 to fanSpeed at register 40003"
        }
      ]
    },
    {
      "deviceId": "60d21b4667d0d8992e610c86",
      "deviceName": "HVAC Unit 2",
      "success": true,
      "results": [
        {
          "success": true,
          "parameter": "powerState",
          "value": 1,
          "registerIndex": 40010,
          "message": "Successfully wrote value 1 to powerState at register 40010"
        }
      ]
    }
  ]
}
```

## Polling

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/polling/start` | Start polling for a specific device |
| POST | `/api/polling/stop` | Stop polling for a specific device |
| GET | `/api/polling/status` | Get polling status for all devices |
| GET | `/api/polling/status/:deviceId` | Get polling status for a specific device |

### Example Requests

#### Start Polling

```http
POST /api/polling/start
Content-Type: application/json

{
  "deviceId": "60d21b4667d0d8992e610c85",
  "interval": 5000
}
```

Response:

```json
{
  "success": true,
  "polling": {
    "deviceId": "60d21b4667d0d8992e610c85",
    "interval": 5000,
    "isActive": true,
    "startTime": "2023-05-12T15:40:12.345Z"
  }
}
```

## Auto-Polling

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auto-polling/configure` | Configure auto-polling for a device |
| GET | `/api/auto-polling/status` | Get auto-polling status for all devices |
| POST | `/api/auto-polling/enable/:deviceId` | Enable auto-polling for a device |
| POST | `/api/auto-polling/disable/:deviceId` | Disable auto-polling for a device |

### Example Requests

#### Configure Auto-Polling

```http
POST /api/auto-polling/configure
Content-Type: application/json

{
  "deviceId": "60d21b4667d0d8992e610c85",
  "interval": 10000,
  "enabled": true,
  "dataPoints": ["temperature", "humidity", "fanSpeed"]
}
```

Response:

```json
{
  "success": true,
  "config": {
    "deviceId": "60d21b4667d0d8992e610c85",
    "deviceName": "HVAC Unit 1",
    "interval": 10000,
    "enabled": true,
    "dataPoints": ["temperature", "humidity", "fanSpeed"],
    "lastUpdated": "2023-05-12T15:45:33.456Z"
  }
}
```

## Realtime Data

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/realtime-data/:deviceId` | Get the latest realtime data for a device |
| GET | `/api/realtime-data/:deviceId/history` | Get historical data for a device |
| POST | `/api/realtime-data/:deviceId/subscribe` | Subscribe to realtime updates via WebSocket |

### Example Requests

#### Get Latest Realtime Data

```http
GET /api/realtime-data/60d21b4667d0d8992e610c85
```

Response:

```json
{
  "deviceId": "60d21b4667d0d8992e610c85",
  "deviceName": "HVAC Unit 1",
  "timestamp": "2023-05-12T15:50:22.789Z",
  "data": {
    "temperature": {
      "value": 23.5,
      "unit": "°C",
      "status": "normal"
    },
    "humidity": {
      "value": 45,
      "unit": "%",
      "status": "normal"
    },
    "fanSpeed": {
      "value": 2,
      "unit": "",
      "status": "normal"
    }
  }
}
```

## Monitoring

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monitoring/system` | Get system-wide monitoring information |
| GET | `/api/monitoring/devices` | Get monitoring status for all devices |
| GET | `/api/monitoring/alerts` | Get active alerts |

### Example Requests

#### Get System Monitoring

```http
GET /api/monitoring/system
```

Response:

```json
{
  "timestamp": "2023-05-12T15:55:44.123Z",
  "system": {
    "status": "healthy",
    "uptime": 4321234,
    "load": 0.45,
    "memory": {
      "total": 8192,
      "used": 3456,
      "free": 4736
    },
    "connections": 23
  },
  "devices": {
    "total": 35,
    "online": 32,
    "offline": 3,
    "polling": 25
  },
  "alerts": {
    "critical": 0,
    "warning": 2,
    "info": 5
  }
}
```

## Data Types and Formats

### Device Control Parameters

| Data Type | Description | Range | Example |
|-----------|-------------|-------|---------|
| BOOL | Boolean value | 0-1 or true/false | `{ "value": true }` |
| UINT16 | 16-bit unsigned integer | 0-65535 | `{ "value": 1234 }` |
| INT16 | 16-bit signed integer | -32768 to 32767 | `{ "value": -123 }` |
| UINT32 | 32-bit unsigned integer | 0-4294967295 | `{ "value": 123456 }` |
| INT32 | 32-bit signed integer | -2147483648 to 2147483647 | `{ "value": -123456 }` |
| FLOAT32 | 32-bit floating point | IEEE-754 | `{ "value": 23.5 }` |

### Byte Orders for Multi-Register Values

| Byte Order | Description |
|------------|-------------|
| ABCD | Big-endian (high word first, high byte first) |
| CDAB | Mixed-endian (low word first, high byte first) |
| BADC | Mixed-endian (high word first, low byte first) |
| DCBA | Little-endian (low word first, low byte first) |

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error description",
  "errorType": "ERROR_TYPE_CODE"
}
```

Common error types:

| Error Type | Description |
|------------|-------------|
| VALIDATION_ERROR | Request validation failed |
| DEVICE_NOT_FOUND | Specified device does not exist |
| CONNECTION_ERROR | Failed to connect to device |
| CONTROL_ERROR | Failed to control device |
| PARAMETER_SET_ERROR | Failed to set parameter |
| SERVER_ERROR | Internal server error |

## Authentication

All API endpoints (except for login/register) require authentication using a JWT token. 
Add the token to the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## WebSocket Connections

For realtime data updates, a WebSocket connection is available:

```javascript
// Example WebSocket connection
const socket = new WebSocket('ws://your-server/ws');

// Subscribe to device updates
socket.onopen = () => {
  socket.send(JSON.stringify({
    type: 'subscribe',
    deviceId: '60d21b4667d0d8992e610c85'
  }));
};

// Receive updates
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received update:', data);
};
```

## Rate Limiting

API endpoints are subject to rate limiting to prevent abuse:

- Authentication endpoints: 10 requests per minute
- Device read endpoints: 60 requests per minute
- Device control endpoints: 30 requests per minute

Responses will include headers indicating your rate limit status:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1683907523
```