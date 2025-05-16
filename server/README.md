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
   - Collections: Devices, Users, Profiles, Alerts, HistoricalData, ScheduleTemplate, DeviceSchedule

2. **AMX Database**: Stores device drivers, templates, and device types
   - Collections: DeviceDrivers, DeviceTypes, Templates

### Schedule Management

The server includes a comprehensive schedule management system for automating device setpoint changes:

- **Schedule Templates**: Reusable templates with time-based rules
- **Device Schedules**: Application of templates to specific devices
- **Time Ranges**: Rules with start and end times
- **Flexible Days**: Support for weekdays, weekends, specific days, or dates
- **Default Values**: Optional return to default values after schedule ends
- **Custom Rules**: Device-specific overrides for template rules

Schedule Rules Structure:
```json
{
  "startTime": "09:00",      // Start time in 24-hour format
  "endTime": "18:00",        // End time in 24-hour format
  "setpoint": 22,            // Value to set during this period
  "days": ["Mon", "Tue"],    // Days when rule applies (defaults to empty array)
  "enabled": true,           // Whether the rule is active
  "parameter": "Temperature", // Parameter to control
  "registerAddress": 40001,   // Modbus register address
  "returnToDefault": true,   // Return to default after end time
  "defaultSetpoint": 18      // Default value to return to
}
```

**Important**: When creating or updating schedule templates, new rules will have an empty `days` array by default, requiring users to explicitly select which days the rule should apply to. This prevents new rules from unintentionally inheriting days from existing rules.

### Schedule Management Workflow

The schedule system works in two steps:

1. **Create Schedule Templates**: Templates are reusable schedule configurations that define when setpoints should change. They are NOT linked to any specific device.

2. **Apply Templates to Devices**: To actually control a device, you must apply a template to it, creating a DeviceSchedule that links the template to the device.

#### Complete Workflow Example:

```javascript
// Step 1: Create a schedule template
const template = await createScheduleTemplate({
  "name": "Office Hours",
  "description": "Standard office temperature schedule",
  "type": "daily",
  "rules": [
    {
      "startTime": "08:00",
      "endTime": "18:00",
      "setpoint": 22,
      "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "enabled": true,
      "parameter": "Temperature",
      "registerAddress": 40001
    }
  ],
  "isPublic": false
});

// Step 2: Apply the template to a specific device
const schedule = await applyTemplateToDevice(deviceId, {
  "templateId": template._id,
  "startDate": "2024-01-15",
  "endDate": "2024-12-31"
});

// Now the device will follow the template's schedule
```

#### Key Concepts:

- **Templates** are reusable patterns that can be applied to multiple devices
- **DeviceSchedules** are the actual instances that control specific devices
- Multiple devices can use the same template
- A device can have custom rules that override template rules

#### Finding Template-Device Relationships:

```javascript
// Check which devices use a template
GET /client/api/schedules/templates/:templateId/devices

// Check what schedule a device is using
GET /client/api/schedules/devices/:deviceId
```

Without applying a template to a device, the template alone won't control anything - it's just a schedule pattern waiting to be used.

## API Endpoints

The API is organized around two main namespaces. Below we detail the request/response formats for key endpoints.

### API Routes Overview

The server exposes the following client API routes:

#### Authentication Routes
- `POST /client/api/auth/register` - Register a new user
- `POST /client/api/auth/login` - Login user
- `GET /client/api/auth/me` - Get user data

#### Device Management Routes
- `GET /client/api/devices` - Get all devices
- `POST /client/api/devices` - Create a new device
- `GET /client/api/devices/by-driver/:driverId` - Get devices by driver ID
- `GET /client/api/devices/by-usage/:usage` - Get devices by usage type
- `GET /client/api/devices/:id` - Get a specific device
- `PUT /client/api/devices/:id` - Update a specific device
- `DELETE /client/api/devices/:id` - Delete a specific device
- `POST /client/api/devices/:id/test` - Test connection to a device
- `GET /client/api/devices/:id/read` - Read device registers

#### Device Control Routes
- `POST /client/api/devices/:id/control` - Control a device
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "parameters": [
        {
          "name": "Temperature",
          "value": 26,
          "registerIndex": 1512,
          "dataType": "FLOAT32",
          "byteOrder": "ABCD"
        }
      ]
    }
    ```
  - **IMPORTANT**: The `registerIndex` parameter must be the actual Modbus register address you want to write to, not the array index. This is the address used in the Modbus write operation.
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "summary": "1/1 parameters set successfully",
      "results": [
        {
          "success": true,
          "parameter": "Temperature",
          "value": 26,
          "registerIndex": 1512,
          "message": "Successfully wrote value 26 to Temperature at register 1512"
        }
      ]
    }
    ```

- `PUT /client/api/devices/:id/setpoint/:parameter` - Set a device parameter
  - **URL Parameters**: 
    - `id` - Device ID
    - `parameter` - Parameter name
  - **Request Body**:
    ```json
    {
      "value": 42,
      "dataType": "INT16",
      "registerIndex": 1200,
      "byteOrder": "ABCD"
    }
    ```
  - **IMPORTANT**: The `registerIndex` parameter must be the actual Modbus register address you want to write to, not a relative index. This is the address used in the Modbus write operation.
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "parameter": "setpoint",
      "value": 42,
      "registerIndex": 1200,
      "timestamp": "2025-05-08T13:44:12.907Z",
      "message": "Successfully set parameter"
    }
    ```

- `POST /client/api/devices/batch-control` - Control multiple devices
  - **Request Body**:
    ```json
    {
      "commands": [
        {
          "deviceId": "681c989bb4d2ff4a937b3835",
          "parameters": [
            {
              "name": "setpoint",
              "value": 42,
              "registerIndex": 1200,
              "dataType": "INT16"
            }
          ]
        },
        {
          "deviceId": "681c989bb4d2ff4a937b3836",
          "parameters": [
            {
              "name": "mode",
              "value": 1,
              "registerIndex": 1500,
              "dataType": "UINT16"
            }
          ]
        }
      ]
    }
    ```
  - **IMPORTANT**: For each parameter, the `registerIndex` must be the actual Modbus register address you want to write to, not a relative index.
  - **Response**:
    ```json
    {
      "success": true,
      "allSuccess": true,
      "summary": {
        "totalDevices": 2,
        "successfulDevices": 2,
        "failedDevices": 0
      },
      "results": [
        {
          "deviceId": "681c989bb4d2ff4a937b3835",
          "deviceName": "Haiwell Device",
          "success": true,
          "results": [
            {
              "success": true,
              "parameter": "setpoint",
              "value": 42,
              "registerIndex": 1200,
              "message": "Successfully wrote value 42 to setpoint at register 1200"
            }
          ]
        },
        {
          "deviceId": "681c989bb4d2ff4a937b3836",
          "deviceName": "Schneider Device",
          "success": true,
          "results": [
            {
              "success": true,
              "parameter": "mode",
              "value": 1,
              "registerIndex": 1500,
              "message": "Successfully wrote value 1 to mode at register 1500"
            }
          ]
        }
      ],
      "timestamp": "2025-05-08T13:44:12.907Z"
    }
    ```

#### Coil Control Routes
- `POST /client/api/devices/:id/coil-control` - Control a single coil register
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "coilAddress": 100,
      "value": true,
      "type": "control"
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "coilAddress": 100,
      "value": true,
      "coilType": "control",
      "message": "Successfully set control coil at address 100 to true"
    }
    ```

- `POST /client/api/devices/:id/coil-batch-control` - Control multiple coil registers
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "coils": [
        {
          "address": 100,
          "value": true,
          "type": "control"
        },
        {
          "address": 101,
          "value": false,
          "type": "status"
        }
      ]
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "allSuccess": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "results": [
        {
          "success": true,
          "coilType": "control",
          "coilAddress": 100,
          "value": true,
          "message": "Successfully set control coil at address 100 to true"
        },
        {
          "success": true,
          "coilType": "status",
          "coilAddress": 101,
          "value": false,
          "message": "Successfully set status coil at address 101 to false"
        }
      ]
    }
    ```

- `GET /client/api/devices/:id/coil-read` - Read coil registers
  - **URL Parameters**: 
    - `id` - Device ID
  - **Query Parameters**:
    - `startAddress` - Starting coil address (default: 0)
    - `count` - Number of coils to read (default: 10)
    - `type` - Type of coil registers to read (control, schedule, status) (default: control)
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "coilType": "control",
      "startAddress": 0,
      "count": 5,
      "coils": [
        {
          "address": 0,
          "value": true,
          "type": "control"
        },
        {
          "address": 1,
          "value": false,
          "type": "control"
        },
        {
          "address": 2,
          "value": true,
          "type": "control"
        },
        {
          "address": 3,
          "value": false,
          "type": "control"
        },
        {
          "address": 4,
          "value": true,
          "type": "control"
        }
      ],
      "message": "Successfully read 5 control coils starting at address 0"
    }
    ```

#### Polling Routes
- `POST /client/api/devices/:id/polling/start` - Start polling a device
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "interval": 5000,
      "enabled": true
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "message": "Device polling started",
      "pollingStatus": {
        "enabled": true,
        "interval": 5000,
        "lastPolled": "2025-05-08T13:44:12.907Z",
        "nextPollIn": 5000
      }
    }
    ```

- `POST /client/api/devices/:id/polling/stop` - Stop polling a device
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "message": "Device polling stopped",
      "pollingStatus": {
        "enabled": false,
        "interval": 5000,
        "lastPolled": "2025-05-08T13:44:12.907Z"
      }
    }
    ```

- `GET /client/api/devices/:id/data/current` - Get current device data
  - **URL Parameters**: 
    - `id` - Device ID
  - **Query Parameters**:
    - `readOnly` - If true, returns cached data if available (default: false)
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Device data retrieved",
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "hasData": true,
      "timestamp": "2025-05-08T13:44:12.907Z",
      "readings": [
        {
          "name": "L1",
          "registerIndex": 0,
          "address": 0,
          "value": 10.5,
          "unit": "A",
          "dataType": "FLOAT32"
        },
        {
          "name": "L2",
          "registerIndex": 2,
          "address": 2,
          "value": 11.2,
          "unit": "A",
          "dataType": "FLOAT32"
        }
      ],
      "fromCache": false
    }
    ```

- `GET /client/api/devices/:id/data/current/readonly` - Get current device data (respects polling intervals)
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Device data retrieved from cache (within polling interval)",
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "hasData": true,
      "timestamp": "2025-05-08T13:44:12.907Z",
      "readings": [
        {
          "name": "L1",
          "registerIndex": 0,
          "address": 0,
          "value": 10.5,
          "unit": "A",
          "dataType": "FLOAT32"
        },
        {
          "name": "L2",
          "registerIndex": 2,
          "address": 2,
          "value": 11.2,
          "unit": "A",
          "dataType": "FLOAT32"
        }
      ],
      "fromCache": true,
      "cacheAge": 2500,
      "pollingInterval": 5000,
      "nextPollIn": 2500,
      "pollingSettings": {
        "deviceSpecificInterval": true,
        "intervalMs": 5000,
        "lastPolled": "2025-05-08T13:44:12.907Z"
      }
    }
    ```

#### Realtime Data Routes
- `POST /client/api/devices/:id/data/realtime` - Update realtime data
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "readings": [
        {
          "name": "L1",
          "value": 10.5,
          "unit": "A",
          "dataType": "FLOAT32"
        },
        {
          "name": "L2",
          "value": 11.2,
          "unit": "A",
          "dataType": "FLOAT32"
        }
      ],
      "timestamp": "2025-05-08T13:44:12.907Z"
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "message": "Realtime data updated",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "readingsCount": 2
    }
    ```

- `GET /client/api/devices/:id/data/realtime` - Get realtime data
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "readings": [
        {
          "name": "L1",
          "value": 10.5,
          "unit": "A",
          "dataType": "FLOAT32"
        },
        {
          "name": "L2",
          "value": 11.2,
          "unit": "A",
          "dataType": "FLOAT32"
        }
      ]
    }
    ```

- `DELETE /client/api/devices/:id/data/realtime` - Delete realtime data
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "message": "Realtime data deleted"
    }
    ```

#### Historical Data Routes
- `GET /client/api/devices/:id/data/historical` - Get historical data
- `GET /client/api/devices/:id/data/historical/parameters` - Get historical parameters
- `GET /client/api/devices/:id/data/historical/timerange` - Get historical time range
- `DELETE /client/api/devices/:id/data/historical` - Delete historical data
- `GET /client/api/devices/data/historical/aggregate` - Get aggregated historical data for all devices

#### System-wide Auto-polling Routes
- `POST /client/api/system/polling/start` - Start auto-polling for all devices
  - **Request Body**:
    ```json
    {
      "interval": 60000,
      "deviceTypes": ["energy_meter", "pump_controller"]
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "message": "System-wide auto-polling started",
      "autoPollingStatus": {
        "enabled": true,
        "interval": 60000,
        "deviceTypes": ["energy_meter", "pump_controller"],
        "activeDevices": 12,
        "nextPollIn": 60000,
        "lastStarted": "2025-05-08T13:44:12.907Z"
      }
    }
    ```

- `POST /client/api/system/polling/stop` - Stop auto-polling for all devices
  - **Response**:
    ```json
    {
      "success": true,
      "message": "System-wide auto-polling stopped",
      "autoPollingStatus": {
        "enabled": false,
        "interval": 60000,
        "deviceTypes": ["energy_meter", "pump_controller"],
        "lastStarted": "2025-05-08T13:44:12.907Z",
        "stoppedAt": "2025-05-08T14:44:12.907Z"
      }
    }
    ```

- `GET /client/api/system/polling/status` - Get auto-polling status
  - **Response**:
    ```json
    {
      "success": true,
      "autoPollingStatus": {
        "enabled": true,
        "interval": 60000,
        "deviceTypes": ["energy_meter", "pump_controller"],
        "activeDevices": 12,
        "nextPollIn": 35000,
        "lastPollCompleted": "2025-05-08T13:44:12.907Z",
        "devicesStatus": [
          {
            "deviceId": "681c989bb4d2ff4a937b3835",
            "deviceName": "Haiwell Device",
            "lastPolled": "2025-05-08T13:44:12.907Z",
            "status": "success",
            "readingsCount": 8
          },
          {
            "deviceId": "681c989bb4d2ff4a937b3836",
            "deviceName": "Schneider Device",
            "lastPolled": "2025-05-08T13:44:22.123Z",
            "status": "failed",
            "error": "Connection timeout"
          }
        ]
      }
    }
    ```

- `POST /client/api/system/polling/refresh` - Force refresh of all devices
  - **Response**:
    ```json
    {
      "success": true,
      "message": "Force refresh initiated for all devices",
      "refreshStatus": {
        "totalDevices": 12,
        "refreshStarted": "2025-05-08T13:44:12.907Z",
        "estimatedCompletionTime": "2025-05-08T13:44:42.907Z"
      }
    }
    ```

#### Monitoring Routes
 - `GET /client/api/monitoring/stats` - Get Modbus API statistics
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

- `POST /client/api/monitoring/stats/reset` - Reset statistics
  - **Response**:
    ```json
    {
      "message": "Stats reset successfully",
      "timestamp": "2025-05-08T14:00:00.000Z"
    }
    ```

- `GET /client/api/monitoring/logs` - Get logs
  - **Query Parameters**:
    - `type` - Log type (modbus, api, access) (default: modbus)
  - **Response**:
    ```json
    {
      "timestamp": "2025-05-08T14:00:00.000Z",
      "logType": "modbus",
      "logPath": "/path/to/logs/modbus/modbus.log",
      "lines": [
        "2025-05-08T13:59:50.123Z INFO [modbus] Reading holding registers from device 681c989bb4d2ff4a937b3835",
        "2025-05-08T13:59:50.245Z INFO [modbus] Read 8 registers successfully in 122ms",
        "2025-05-08T13:59:55.123Z ERROR [modbus] Failed to connect to device 681c989bb4d2ff4a937b3836: Connection refused"
      ]
    }
    ```

- `GET /client/api/monitoring/logs-viewer` - Logs viewer UI
  - Serves an HTML page for viewing logs

- `GET /client/api/monitoring` - Monitoring dashboard
  - Serves an HTML page with a real-time monitoring dashboard for Modbus communications

#### Schedule Management Routes

##### Create Schedule Template
- `POST /client/api/schedules/templates` - Create a new schedule template
  - **Frontend Request**:
    ```javascript
    const response = await fetch('http://localhost:3333/client/api/schedules/templates', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "name": "Office Hours",
        "description": "Standard office hours temperature schedule",
        "type": "daily",
        "rules": [
          {
            "startTime": "06:00",
            "endTime": "18:00",
            "setpoint": 22,
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": true,
            "defaultSetpoint": 18
          },
          {
            "startTime": "08:00",
            "endTime": "22:00",
            "setpoint": 24,
            "days": ["Sat", "Sun"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": true,
            "defaultSetpoint": 18
          }
        ],
        "isPublic": false
      })
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Schedule template created successfully",
      "template": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Office Hours",
        "description": "Standard office hours temperature schedule",
        "type": "daily",
        "rules": [
          {
            "startTime": "06:00",
            "endTime": "18:00",
            "setpoint": 22,
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": true,
            "defaultSetpoint": 18
          }
        ],
        "createdBy": {
          "userId": "123456",
          "username": "john_doe",
          "email": "john@example.com"
        },
        "isPublic": false,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    }
    ```

##### Get All Schedule Templates
- `GET /client/api/schedules/templates` - Get all schedule templates
  - **Frontend Request**:
    ```javascript
    // Get all templates (including private)
    const response = await fetch('http://localhost:3333/client/api/schedules/templates', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN'
      }
    });
    
    // Get only public templates
    const publicResponse = await fetch('http://localhost:3333/client/api/schedules/templates?includePrivate=false', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN'
      }
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Schedule templates retrieved successfully",
      "templates": [
        {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
          "name": "Office Hours",
          "description": "Standard office hours temperature schedule",
          "type": "daily",
          "rules": [...],
          "isPublic": false,
          "createdBy": {
            "userId": "123456",
            "username": "john_doe"
          }
        },
        {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
          "name": "Energy Saving",
          "description": "Energy saving schedule",
          "type": "daily",
          "rules": [...],
          "isPublic": true,
          "createdBy": {
            "userId": "789012",
            "username": "admin"
          }
        }
      ],
      "count": 2
    }
    ```

##### Get Schedule Template by ID
- `GET /client/api/schedules/templates/:id` - Get specific schedule template
  - **Frontend Request**:
    ```javascript
    const templateId = '65a1b2c3d4e5f6g7h8i9j0k1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/templates/${templateId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN'
      }
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Schedule template retrieved successfully",
      "template": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Office Hours",
        "description": "Standard office hours temperature schedule",
        "type": "daily",
        "rules": [
          {
            "startTime": "06:00",
            "endTime": "18:00",
            "setpoint": 22,
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": true,
            "defaultSetpoint": 18
          }
        ],
        "isPublic": false,
        "createdBy": {
          "userId": "123456",
          "username": "john_doe",
          "email": "john@example.com"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    }
    ```

##### Update Schedule Template
- `PUT /client/api/schedules/templates/:id` - Update schedule template
  - **Frontend Request**:
    ```javascript
    const templateId = '65a1b2c3d4e5f6g7h8i9j0k1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "name": "Updated Office Hours",
        "description": "Modified schedule with lunch break",
        "rules": [
          {
            "startTime": "06:00",
            "endTime": "12:00",
            "setpoint": 22,
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": false
          },
          {
            "startTime": "13:00",
            "endTime": "18:00",
            "setpoint": 22,
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": true,
            "defaultSetpoint": 18
          }
        ]
      })
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Schedule template updated successfully",
      "template": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Updated Office Hours",
        "description": "Modified schedule with lunch break",
        "type": "daily",
        "rules": [...],
        "updatedAt": "2024-01-16T14:20:00Z"
      }
    }
    ```

##### Delete Schedule Template
- `DELETE /client/api/schedules/templates/:id` - Delete schedule template
  - **Frontend Request**:
    ```javascript
    const templateId = '65a1b2c3d4e5f6g7h8i9j0k1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/templates/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN'
      }
    });
    ```
  - **Server Response (Success)**:
    ```json
    {
      "success": true,
      "message": "Schedule template deleted successfully"
    }
    ```
  - **Server Response (Error - Template in Use)**:
    ```json
    {
      "success": false,
      "message": "Cannot delete template. It is currently used by 3 device(s).",
      "error": "Cannot delete template. It is currently used by 3 device(s)."
    }
    ```

##### Get Devices Using Template
- `GET /client/api/schedules/templates/:templateId/devices` - Get devices using a template
  - **Frontend Request**:
    ```javascript
    const templateId = '65a1b2c3d4e5f6g7h8i9j0k1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/templates/${templateId}/devices`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN'
      }
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Devices using template retrieved successfully",
      "schedules": [
        {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
          "deviceId": {
            "_id": "6821fe542af1d1a3177c7fe1",
            "name": "Conference Room AC",
            "make": "Daikin",
            "model": "VRV-IV"
          },
          "templateId": "65a1b2c3d4e5f6g7h8i9j0k1",
          "active": true,
          "startDate": "2024-01-01T00:00:00Z",
          "endDate": "2024-12-31T23:59:59Z"
        },
        {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
          "deviceId": {
            "_id": "6821fe542af1d1a3177c7fe2",
            "name": "Office Floor AC",
            "make": "Mitsubishi",
            "model": "City Multi"
          },
          "templateId": "65a1b2c3d4e5f6g7h8i9j0k1",
          "active": true,
          "startDate": "2024-01-01T00:00:00Z"
        }
      ],
      "count": 2
    }
    ```

##### Apply Template to Device
- `POST /client/api/schedules/devices/:deviceId/apply` - Apply schedule template to device
  - **Frontend Request**:
    ```javascript
    const deviceId = '6821fe542af1d1a3177c7fe1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/devices/${deviceId}/apply`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "templateId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "customRules": [
          {
            "startTime": "20:00",
            "endTime": "06:00",
            "setpoint": 16,
            "days": ["All"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": false
          }
        ],
        "startDate": "2024-01-15",
        "endDate": "2024-12-31"
      })
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Schedule template applied to device successfully",
      "schedule": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
        "deviceId": "6821fe542af1d1a3177c7fe1",
        "templateId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "customRules": [
          {
            "startTime": "20:00",
            "endTime": "06:00",
            "setpoint": 16,
            "days": ["All"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": false
          }
        ],
        "active": true,
        "startDate": "2024-01-15T00:00:00Z",
        "endDate": "2024-12-31T23:59:59Z",
        "createdBy": {
          "userId": "123456",
          "username": "john_doe"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    }
    ```

##### Get Device Schedule
- `GET /client/api/schedules/devices/:deviceId` - Get device's current schedule
  - **Frontend Request**:
    ```javascript
    const deviceId = '6821fe542af1d1a3177c7fe1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/devices/${deviceId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN'
      }
    });
    ```
  - **Server Response (Has Schedule)**:
    ```json
    {
      "success": true,
      "message": "Device schedule retrieved successfully",
      "schedule": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
        "deviceId": "6821fe542af1d1a3177c7fe1",
        "templateId": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
          "name": "Office Hours",
          "description": "Standard office hours temperature schedule",
          "type": "daily",
          "rules": [...]
        },
        "customRules": [...],
        "active": true,
        "startDate": "2024-01-15T00:00:00Z",
        "endDate": "2024-12-31T23:59:59Z",
        "lastApplied": "2024-01-16T08:00:00Z",
        "currentActiveRule": {
          "startTime": "06:00",
          "endTime": "18:00",
          "setpoint": 22,
          "parameter": "Temperature",
          "registerAddress": 40001
        },
        "nextScheduledChange": {
          "startTime": "18:00",
          "endTime": "06:00",
          "setpoint": 18,
          "parameter": "Temperature",
          "registerAddress": 40001
        }
      }
    }
    ```
  - **Server Response (No Schedule)**:
    ```json
    {
      "success": true,
      "message": "No schedule found for this device",
      "schedule": null
    }
    ```

##### Update Device Schedule
- `PUT /client/api/schedules/devices/:deviceId` - Update device schedule
  - **Frontend Request**:
    ```javascript
    const deviceId = '6821fe542af1d1a3177c7fe1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/devices/${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "active": true,
        "customRules": [
          {
            "startTime": "19:00",
            "endTime": "07:00",
            "setpoint": 15,
            "days": ["All"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": false
          }
        ],
        "endDate": "2024-11-30"
      })
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Device schedule updated successfully",
      "schedule": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k5",
        "deviceId": "6821fe542af1d1a3177c7fe1",
        "templateId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "customRules": [
          {
            "startTime": "19:00",
            "endTime": "07:00",
            "setpoint": 15,
            "days": ["All"],
            "enabled": true,
            "parameter": "Temperature",
            "registerAddress": 40001,
            "returnToDefault": false
          }
        ],
        "active": true,
        "endDate": "2024-11-30T23:59:59Z",
        "updatedAt": "2024-01-16T15:45:00Z"
      }
    }
    ```

##### Deactivate Device Schedule
- `DELETE /client/api/schedules/devices/:deviceId` - Deactivate device schedule
  - **Frontend Request**:
    ```javascript
    const deviceId = '6821fe542af1d1a3177c7fe1';
    const response = await fetch(`http://localhost:3333/client/api/schedules/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN'
      }
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Device schedule deactivated successfully"
    }
    ```

##### Process Scheduled Changes (Admin/Cron)
- `POST /client/api/schedules/process` - Process all pending scheduled changes
  - **Frontend Request (or Cron Job)**:
    ```javascript
    const response = await fetch('http://localhost:3333/client/api/schedules/process', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ADMIN_TOKEN_OR_CRON_KEY'
      }
    });
    ```
  - **Server Response**:
    ```json
    {
      "success": true,
      "message": "Processed 5 scheduled changes",
      "processedCount": 5,
      "totalSchedules": 5,
      "errors": []
    }
    ```
  - **Server Response (With Errors)**:
    ```json
    {
      "success": true,
      "message": "Processed 3 scheduled changes",
      "processedCount": 3,
      "totalSchedules": 5,
      "errors": [
        "Failed to process start for device 6821fe542af1d1a3177c7fe1: Connection timeout",
        "Failed to process end for device 6821fe542af1d1a3177c7fe2: Device not found"
      ]
    }
    ```

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
    
- `POST /client/api/devices/:id/coil-control` - Write to a single coil register
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "coilAddress": 100,
      "value": true,
      "type": "control" 
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "coilAddress": 100,
      "value": true,
      "coilType": "control",
      "message": "Successfully set control coil at address 100 to true"
    }
    ```

- `POST /client/api/devices/:id/coil-batch-control` - Write to multiple coil registers
  - **URL Parameters**: 
    - `id` - Device ID
  - **Request Body**:
    ```json
    {
      "coils": [
        {
          "address": 100,
          "value": true,
          "type": "control"
        },
        {
          "address": 101,
          "value": false,
          "type": "status"
        }
      ]
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "allSuccess": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "results": [
        {
          "success": true,
          "coilType": "control",
          "coilAddress": 100,
          "value": true,
          "message": "Successfully set control coil at address 100 to true"
        },
        {
          "success": true,
          "coilType": "status",
          "coilAddress": 101,
          "value": false,
          "message": "Successfully set status coil at address 101 to false"
        }
      ]
    }
    ```

- `GET /client/api/devices/:id/coil-read` - Read coil registers
  - **URL Parameters**: 
    - `id` - Device ID
  - **Query Parameters**:
    - `startAddress` - Starting coil address (default: 0)
    - `count` - Number of coils to read (default: 10)
    - `type` - Type of coil registers to read (control, schedule, status) (default: control)
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "timestamp": "2025-05-08T13:44:12.907Z",
      "coilType": "control",
      "startAddress": 0,
      "count": 5,
      "coils": [
        {
          "address": 0,
          "value": true,
          "type": "control"
        },
        {
          "address": 1,
          "value": false,
          "type": "control"
        },
        {
          "address": 2,
          "value": true,
          "type": "control"
        },
        {
          "address": 3,
          "value": false,
          "type": "control"
        },
        {
          "address": 4,
          "value": true,
          "type": "control"
        }
      ],
      "message": "Successfully read 5 control coils starting at address 0"
    }
    ```

#### Device Data

- `GET /client/api/devices/:id/data/historical` - Get historical data
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

- `GET /client/api/devices/:id/data/historical/parameters` - Get available historical parameters
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**:
    ```json
    {
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "parameters": ["L1", "L2", "L3", "Voltage", "Power", "Energy"]
    }
    ```

- `GET /client/api/devices/:id/data/historical/timerange` - Get available time range for historical data
  - **URL Parameters**: 
    - `id` - Device ID
  - **Response**:
    ```json
    {
      "deviceId": "681c989bb4d2ff4a937b3835",
      "deviceName": "Haiwell Device",
      "firstRecord": "2025-05-01T00:00:00.000Z",
      "lastRecord": "2025-05-08T14:00:00.000Z",
      "recordCount": 2304
    }
    ```

- `DELETE /client/api/devices/:id/data/historical` - Delete historical data
  - **URL Parameters**: 
    - `id` - Device ID
  - **Query Parameters**:
    - `from` - Start timestamp (ISO format)
    - `to` - End timestamp (ISO format)
    - `parameters` - Comma-separated list of parameter names to delete (optional)
  - **Response**:
    ```json
    {
      "success": true,
      "deviceId": "681c989bb4d2ff4a937b3835",
      "message": "Successfully deleted 124 historical data records",
      "deletedCount": 124
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

### Register Addressing

**IMPORTANT**: When using the device control endpoints, you must provide the actual Modbus register address in the `registerIndex` field. This is a common source of errors.

- The `registerIndex` parameter must be the actual register address that you want to write to (e.g., 1512).
- It is not a relative index or offset - it's the actual address used in the Modbus write operation.
- For example, if your device documentation states that the temperature setpoint is at register 1512, you should use:
  ```json
  {
    "name": "Temperature",
    "value": 26,
    "registerIndex": 1512,
    "dataType": "FLOAT32"
  }
  ```
- Sending `registerIndex: 0` when you meant register 1512 will result in a Modbus exception if register 0 is not writable.

### Register Reading and Writing

The server supports reading and writing different types of Modbus registers:

**Reading Registers:**
- Function code 1: Read Coils
- Function code 2: Read Discrete Inputs
- Function code 3: Read Holding Registers (most common)
- Function code 4: Read Input Registers

**Writing Registers:**
- Function code 5: Write Single Coil
- Function code 6: Write Single Register
- Function code 15: Write Multiple Coils
- Function code 16: Write Multiple Registers

The server provides specialized endpoints for coil register operations, supporting three types of coil registers:
- `control`: Coils used for controlling device functions
- `schedule`: Coils used for scheduling operations
- `status`: Coils used for status indicators

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

## Schedule Management

Schedule management is a two-step process:

1. **Create a Schedule Template**: A template defines the time-based rules but is not yet associated with any device
2. **Apply Template to Device**: Assign the template to a specific device to enable scheduling

### Schedule Components

- **Schedule Template**: Reusable time-based control patterns
- **Device Schedule**: Active schedule instance applied to a specific device
- **Rules**: Individual time periods within a schedule, each with:
  - Start time and end time (HH:MM format, 24-hour)
  - Setpoint temperature
  - Days of the week (Mon-Sun) - optional for new rules

### Database Relationships

The system maintains bidirectional references between devices and schedules:

#### Device Model
- **activeScheduleId**: References the currently active schedule for the device
  - Type: ObjectId (references DeviceSchedule collection)
  - Default: null
  - Automatically set when a schedule is applied to the device
  - Automatically cleared when a schedule is deactivated or deleted

#### Schedule Model  
- **deviceId**: References the device this schedule is applied to
  - Type: ObjectId (references Device collection)
  - Required field when creating a device schedule
  - Ensures one-to-one relationship between active schedule and device

#### Automatic Reference Management

The system automatically maintains these references in the following scenarios:

1. **When applying a schedule template to a device**:
   ```javascript
   // Apply template to device
   POST /api/schedules/devices/:deviceId/apply
   
   // This automatically:
   // 1. Creates a new device schedule with deviceId reference
   // 2. Updates device.activeScheduleId to point to the new schedule
   ```

2. **When deactivating a schedule**:
   ```javascript
   // Deactivate device schedule
   DELETE /api/schedules/devices/:deviceId
   
   // This automatically:
   // 1. Sets schedule.active to false
   // 2. Clears device.activeScheduleId (sets to null)
   ```

3. **When deleting a device**:
   ```javascript
   // Delete device
   DELETE /api/devices/:id
   
   // This automatically:
   // 1. Checks if device has activeScheduleId
   // 2. If yes, deletes the associated schedule from DeviceSchedule collection
   // 3. Deletes the device
   ```

4. **When updating a schedule status**:
   ```javascript
   // Update device schedule
   PUT /api/schedules/devices/:deviceId
   
   // When setting active: true
   // - Updates device.activeScheduleId to point to this schedule
   
   // When setting active: false  
   // - Clears device.activeScheduleId (sets to null)
   ```

#### Data Integrity

The bidirectional reference system ensures:
- A device can only have one active schedule at a time
- When a device is deleted, its schedule is also cleaned up
- Schedule status changes are immediately reflected in the device record
- No orphaned schedules remain in the database

### Schedule Workflow

1. **Create a schedule template** with specific rules (times, temperatures, days)
   - Templates are reusable and not tied to any specific device
   - Can be marked as public (available to all users) or private

2. **Apply the template to a device**:
   - System first checks if the device's Schedule parameter is enabled (see Schedule Bit Validation)
   - Creates a device-specific schedule with deviceId reference
   - Updates device.activeScheduleId to reference the new schedule
   - Activates the schedule for automatic control

3. **The backend automatically handles device control** based on active schedules
   - Processes scheduled changes at defined intervals
   - Applies temperature setpoints according to schedule rules
   - Respects start/end dates and day-of-week settings

4. **Modify, deactivate, or delete schedules** as needed:
   - Updates maintain referential integrity automatically
   - Deactivating a schedule clears the device's activeScheduleId
   - Deleting a device removes its associated schedule

### Schedule Bit Validation

Before a schedule can be activated, the system checks if the device has a "Schedule" parameter enabled:

- The system reads all device registers to find a parameter named "Schedule" (case-insensitive)
- If found, it checks if the Schedule bit is ON (true/1)
- If the Schedule bit is OFF, the schedule activation is rejected with an appropriate error message
- If the Schedule parameter doesn't exist on the device, schedules are allowed by default
- If there's a connection error while checking, schedules are allowed to prevent blocking due to connectivity issues

Error Response when Schedule bit is OFF:
```json
{
  "success": false,
  "message": "Schedule bit is not enabled on the device. Please enable the Schedule parameter on the device before applying a schedule.",
  "requiresScheduleBit": true
}
```

### Schedule ID System Examples

#### Example 1: Applying a Schedule to a Device

```javascript
// 1. Initial device state
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Office AC Unit",
  "activeScheduleId": null,  // No schedule applied
  // ... other device fields
}

// 2. Apply schedule template
POST /api/schedules/devices/507f1f77bcf86cd799439011/apply
{
  "templateId": "507f1f77bcf86cd799439012",
  "customRules": []
}

// 3. Result: Device now has activeScheduleId
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Office AC Unit",
  "activeScheduleId": "507f1f77bcf86cd799439013",  // Points to new schedule
  // ... other device fields
}

// 4. The created schedule has deviceId reference
{
  "_id": "507f1f77bcf86cd799439013",
  "deviceId": "507f1f77bcf86cd799439011",  // Points back to device
  "templateId": "507f1f77bcf86cd799439012",
  "active": true,
  // ... other schedule fields
}
```

#### Example 2: Deactivating a Schedule

```javascript
// 1. Deactivate the schedule
DELETE /api/schedules/devices/507f1f77bcf86cd799439011

// 2. Result: Device's activeScheduleId is cleared
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Office AC Unit",
  "activeScheduleId": null,  // Cleared automatically
  // ... other device fields
}

// 3. Schedule is marked as inactive
{
  "_id": "507f1f77bcf86cd799439013",
  "deviceId": "507f1f77bcf86cd799439011",
  "active": false,  // Set to false
  // ... other schedule fields
}
```

#### Example 3: Deleting a Device with Active Schedule

```javascript
// 1. Device with active schedule
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Office AC Unit",
  "activeScheduleId": "507f1f77bcf86cd799439013",
  // ... other device fields
}

// 2. Delete the device
DELETE /api/devices/507f1f77bcf86cd799439011

// 3. Results:
// - Device is deleted from database
// - Associated schedule (507f1f77bcf86cd799439013) is also deleted
// - No orphaned schedule remains
```

#### Example 4: Retrieving Device with Schedule Information

```javascript
// When fetching device details
GET /api/devices/507f1f77bcf86cd799439011

// Response includes activeScheduleId
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Office AC Unit",
  "activeScheduleId": "507f1f77bcf86cd799439013",
  // ... other device fields
}

// To get the full schedule details
GET /api/schedules/devices/507f1f77bcf86cd799439011

// Response includes complete schedule
{
  "success": true,
  "schedule": {
    "_id": "507f1f77bcf86cd799439013",
    "deviceId": "507f1f77bcf86cd799439011",
    "templateId": {
      // Populated template details
    },
    "active": true,
    // ... other schedule fields
  }
}
```