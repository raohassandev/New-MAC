# MACSYS Backend API Documentation

This document provides comprehensive information about the MACSYS backend API, which consists of two separate databases and API namespaces:

1. **Client API** (`/client/api/`): For user-specific data, devices, and profiles.
2. **AMX API** (`/amx/api/`): For device driver templates and related data.

## Database Architecture

The system uses a centralized database configuration for managing connections to both databases:

- **Configuration Location**: `/server/src/config/database.ts`
- **Multiple Database Support**: The system supports concurrent connections to both Client and AMX databases
- **Connection Caching**: Database connections are cached to improve performance and reduce connection overhead
- **Model Management**: Database models are created and managed through the centralized configuration

## Base URLs

- **Development**: `http://localhost:3333`
- **Production**: [Your production URL]

## Health Check

### Check API Health

Checks the health and connectivity of the API and its databases.

- **URL**: `/health`
- **Method**: `GET`
- **Authentication**: None
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "status": "UP",
      "timestamp": "2023-08-15T12:34:56.789Z",
      "services": {
        "clientDB": "UP",
        "amxDB": "UP"
      }
    }
    ```
- **Error Response** (if any database is down):
  - **Code**: 503
  - **Content**: Same as success but with "DOWN" status for the affected database

## Authentication

All API endpoints except for registration, login, and health check require authentication via JWT tokens.

### Register a New User

- **URL**: `/client/api/auth/register`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user",
      "permissions": ["view_devices", "view_profiles"],
      "token": "JWT_TOKEN"
    }
    ```
- **Error Response**:
  - **Code**: 400
  - **Content**:
    ```json
    {
      "message": "User already exists"
    }
    ```

### Login User

- **URL**: `/client/api/auth/login`
- **Method**: `POST`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user",
      "permissions": ["view_devices", "view_profiles"],
      "token": "JWT_TOKEN"
    }
    ```
- **Error Response**:
  - **Code**: 401
  - **Content**:
    ```json
    {
      "message": "Invalid credentials"
    }
    ```

### Get User Profile

- **URL**: `/client/api/auth/me`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "user",
      "permissions": ["view_devices", "view_profiles"],
      "createdAt": "2023-08-01T00:00:00.000Z",
      "updatedAt": "2023-08-01T00:00:00.000Z"
    }
    ```
- **Error Response**:
  - **Code**: 401
  - **Content**:
    ```json
    {
      "message": "Not authorized, no token"
    }
    ```

## Client API: Devices

### Get All Devices

- **URL**: `/client/api/devices`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "_id": "device_id",
        "name": "Device Name",
        "make": "Manufacturer",
        "model": "Model Number",
        "description": "Device Description",
        "enabled": true,
        "tags": ["tag1", "tag2"],
        "connectionSetting": {
          "connectionType": "tcp",
          "tcp": {
            "ip": "192.168.1.100",
            "port": 502,
            "slaveId": 1
          }
        },
        "dataPoints": [...],
        "lastSeen": "2023-08-01T00:00:00.000Z",
        "createdAt": "2023-08-01T00:00:00.000Z",
        "updatedAt": "2023-08-01T00:00:00.000Z"
      }
    ]
    ```

### Get Device by ID

- **URL**: `/client/api/devices/:id`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**: Single device object as shown in the list endpoint
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device not found"
    }
    ```

### Create Device

- **URL**: `/client/api/devices`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_devices`
- **Request Body**:
  ```json
  {
    "name": "New Device",                 // Required - device name
    "deviceDriverId": "driver_id_string", // Required - ID of the device driver this device is based on
    "make": "Manufacturer",               // Optional - manufacturer name
    "model": "Model Number",              // Optional - model number
    "description": "Device Description",  // Optional - device description
    "enabled": true,                      // Optional - whether device is enabled, defaults to true
    "tags": ["tag1", "tag2"],             // Optional - array of tags for categorization
    "usage": "energy_analysis",           // Required - device usage category
    "usageNotes": "Usage notes",          // Optional - additional usage information
    "location": "Building A, Floor 1",    // Optional - physical location information
    
    // Required - connection settings with type-specific parameters
    "connectionSetting": {
      "connectionType": "tcp",            // Required - either "tcp" or "rtu"
      
      // TCP connection settings (required if connectionType is "tcp")
      "tcp": {
        "ip": "192.168.1.100",            // Required - IP address
        "port": 502,                      // Required - port number (default: 502)
        "slaveId": 1                      // Required - Modbus slave/unit ID (default: 1)
      },
      
      // RTU connection settings (required if connectionType is "rtu")
      "rtu": {
        "serialPort": "/dev/ttyS0",       // Required for RTU - serial port path
        "baudRate": 9600,                 // Optional - baud rate (default: 9600)
        "dataBits": 8,                    // Optional - data bits (default: 8)
        "stopBits": 1,                    // Optional - stop bits (default: 1)
        "parity": "none",                 // Optional - parity ("none", "even", "odd")
        "slaveId": 1                      // Required - Modbus slave/unit ID (default: 1)
      }
    },
    
    // Optional - data points for register reading, typically inherited from device driver
    "dataPoints": [
      {
        "range": {
          "startAddress": 0,              // Required - starting address of register range
          "count": 2,                     // Required - number of registers to read
          "fc": 3                         // Required - Modbus function code (1, 2, 3, 4)
        },
        "parser": {
          "parameters": [
            {
              "name": "Parameter Name",   // Required - parameter name
              "dataType": "FLOAT",        // Required - data type (FLOAT, INT, UINT, etc.)
              "scalingFactor": 1,         // Optional - scaling factor (default: 1)
              "decimalPoint": 2,          // Optional - decimal points (default: 2)
              "byteOrder": "ABCD",        // Optional - byte order (default: "ABCD")
              "signed": true,             // Optional - whether value is signed (default: false)
              "registerIndex": 0,         // Required - offset from start address
              "wordCount": 2,             // Optional - number of words for this parameter
              "unit": "V",                // Optional - unit of measurement
              "description": "Voltage"    // Optional - parameter description
            }
          ]
        }
      }
    ]
  }
  ```

- **Required Fields**:
  - `name`: String - A unique, descriptive name for the device
  - `deviceDriverId`: String - The MongoDB ObjectID of the device driver this device is based on
  - `connectionSetting`: Object - Connection settings with proper type-specific parameters:
    - For TCP: `ip`, `port`, and `slaveId` fields are required
    - For RTU: `serialPort` and `slaveId` fields are required
  - `usage`: String - Device usage category (e.g., "energy_analysis", "power_source", etc.)

- **Common Validation Errors**:
  - `"Device name is required"`: The name field is missing or empty
  - `"Please select a device driver"`: The deviceDriverId field is missing
  - `"IP address is required"`: For TCP connections, the ip field is missing
  - `"Port must be a valid number between 1-65535"`: For TCP connections, the port is invalid
  - `"Serial port is required"`: For RTU connections, the serialPort field is missing
  - `"Please select a device usage category"`: The usage field is missing
  - `"Device name already exists"`: A device with the same name already exists

- **Success Response**:
  - **Code**: 201
  - **Content**: Created device object including MongoDB-generated _id

- **Error Responses**:
  - **Code**: 400 Bad Request
    - **Content**:
      ```json
      {
        "message": "Validation error",
        "errors": {
          "name": "Device name is required",
          "deviceDriverId": "Please select a device driver"
        }
      }
      ```
  - **Code**: 401 Unauthorized
    - **Content**:
      ```json
      {
        "message": "Not authorized, no token"
      }
      ```
  - **Code**: 403 Forbidden
    - **Content**:
      ```json
      {
        "message": "Not authorized to manage devices"
      }
      ```
  - **Code**: 409 Conflict
    - **Content**:
      ```json
      {
        "message": "Device with this name already exists"
      }
      ```
  - **Code**: 500 Server Error
    - **Content**:
      ```json
      {
        "message": "Server error while creating device: [specific error details]"
      }
      ```

- **Notes**:
  - When creating a device based on a device driver, many fields will be auto-populated from the device driver's data
  - The connection settings should be customized for the specific physical device
  - The API performs validation to ensure all required fields are present
  - Error responses include specific validation errors to help troubleshoot form submission issues

### Update Device

- **URL**: `/client/api/devices/:id`
- **Method**: `PUT`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_devices`
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Request Body**: Same structure as create endpoint, with fields to update
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated device object
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device not found"
    }
    ```

### Delete Device

- **URL**: `/client/api/devices/:id`
- **Method**: `DELETE`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_devices`
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Device deleted successfully"
    }
    ```
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device not found"
    }
    ```

### Test Device Connection

- **URL**: `/client/api/devices/:id/test`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "success": true,
      "message": "Connection successful"
    }
    ```
- **Error Response**:
  - **Code**: 400
  - **Content**:
    ```json
    {
      "success": false,
      "message": "Connection failed: [reason]"
    }
    ```

### Read Device Registers

- **URL**: `/client/api/devices/:id/read`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "deviceId": "device_id",
      "timestamp": "2023-08-01T00:00:00.000Z",
      "parameters": {
        "parameter1": 123.45,
        "parameter2": 678.90
      }
    }
    ```
- **Error Response**:
  - **Code**: 400
  - **Content**:
    ```json
    {
      "message": "Failed to read registers: [reason]"
    }
    ```

## Client API: Profiles

### Get All Profiles

- **URL**: `/client/api/profiles`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "_id": "profile_id",
        "name": "Profile Name",
        "description": "Profile Description",
        "targetTemperature": 22,
        "temperatureRange": [18, 25],
        "fanSpeed": 50,
        "mode": "cooling",
        "schedule": {
          "active": true,
          "times": [
            {
              "days": ["mon", "tue", "wed", "thu", "fri"],
              "startTime": "08:00",
              "endTime": "17:00"
            }
          ]
        },
        "assignedDevices": ["device_id1", "device_id2"],
        "isTemplate": false,
        "tags": ["tag1", "tag2"],
        "createdAt": "2023-08-01T00:00:00.000Z",
        "updatedAt": "2023-08-01T00:00:00.000Z"
      }
    ]
    ```

### Get Profile by ID

- **URL**: `/client/api/profiles/:id`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**: Single profile object as shown in the list endpoint
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Profile not found"
    }
    ```

### Create Profile

- **URL**: `/client/api/profiles`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_profiles`
- **Request Body**:
  ```json
  {
    "name": "New Profile",
    "description": "Profile Description",
    "targetTemperature": 22,
    "temperatureRange": [18, 25],
    "fanSpeed": 50,
    "mode": "cooling",
    "schedule": {
      "active": true,
      "times": [
        {
          "days": ["mon", "tue", "wed", "thu", "fri"],
          "startTime": "08:00",
          "endTime": "17:00"
        }
      ]
    },
    "assignedDevices": ["device_id1", "device_id2"],
    "isTemplate": false,
    "tags": ["tag1", "tag2"]
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created profile object

### Update Profile

- **URL**: `/client/api/profiles/:id`
- **Method**: `PUT`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_profiles`
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Request Body**: Same structure as create endpoint, with fields to update
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated profile object
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Profile not found"
    }
    ```

### Delete Profile

- **URL**: `/client/api/profiles/:id`
- **Method**: `DELETE`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_profiles`
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Profile deleted successfully"
    }
    ```
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Profile not found"
    }
    ```

### Duplicate Profile

- **URL**: `/client/api/profiles/:id/duplicate`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_profiles`
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Request Body**:
  ```json
  {
    "newName": "Duplicated Profile Name" // Optional
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Duplicated profile object

### Apply Profile to Devices

- **URL**: `/client/api/profiles/:id/apply`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_profiles`
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Request Body**:
  ```json
  {
    "deviceIds": ["device_id1", "device_id2"]
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Profile applied to devices successfully",
      "appliedTo": ["device_id1", "device_id2"]
    }
    ```
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Profile not found"
    }
    ```

### Get Template Profiles

- **URL**: `/client/api/profiles/templates`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Success Response**:
  - **Code**: 200
  - **Content**: List of profile objects with `isTemplate: true`

### Create Profile from Template

- **URL**: `/client/api/profiles/from-template/:templateId`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Permissions Required**: `manage_profiles`
- **URL Parameters**: `templateId=[string]` MongoDB ObjectId
- **Request Body**:
  ```json
  {
    "name": "New Profile From Template",
    "assignedDevices": ["device_id1", "device_id2"] // Optional
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created profile object
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Template profile not found"
    }
    ```

## AMX API: Device Drivers

### Get All Device Drivers

- **URL**: `/amx/api/devicedriver`
- **Method**: `GET`
- **Authentication**: None (in development) / Bearer Token (in production)
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "_id": "device_driver_id",
        "name": "Device Driver Name",
        "make": "Manufacturer",
        "model": "Model Number",
        "description": "Device Driver Description",
        "enabled": true,
        "tags": ["tag1", "tag2"],
        "deviceType": "Device Type",
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
              "count": 2,
              "fc": 3
            },
            "parser": {
              "parameters": [
                {
                  "name": "Parameter Name",
                  "dataType": "FLOAT",
                  "scalingFactor": 1,
                  "decimalPoint": 2,
                  "byteOrder": "ABCD",
                  "registerIndex": 0
                }
              ]
            }
          }
        ],
        "isDeviceDriver": true,
        "createdBy": {
          "userId": "user_id",
          "username": "User Name",
          "email": "user@example.com"
        },
        "createdAt": "2023-08-01T00:00:00.000Z",
        "updatedAt": "2023-08-01T00:00:00.000Z"
      }
    ]
    ```

### Get Device Driver by ID

- **URL**: `/amx/api/devicedriver/:id`
- **Method**: `GET`
- **Authentication**: None (in development) / Bearer Token (in production)
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**: Single device driver object as shown in the list endpoint
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device driver not found"
    }
    ```

### Create Device Driver

- **URL**: `/amx/api/devicedriver`
- **Method**: `POST`
- **Authentication**: None (in development) / Bearer Token (in production)
- **Request Body**:
  ```json
  {
    "name": "New Device Driver",
    "make": "Manufacturer",
    "model": "Model Number",
    "description": "Device Driver Description",
    "enabled": true,
    "tags": ["tag1", "tag2"],
    "deviceType": "Device Type",
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
          "count": 2,
          "fc": 3
        },
        "parser": {
          "parameters": [
            {
              "name": "Parameter Name",
              "dataType": "FLOAT",
              "scalingFactor": 1,
              "decimalPoint": 2,
              "byteOrder": "ABCD",
              "registerIndex": 0
            }
          ]
        }
      }
    ]
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created device driver object
- **Error Response**:
  - **Code**: 409
  - **Content**:
    ```json
    {
      "message": "A device driver with this name already exists for this device type"
    }
    ```

### Update Device Driver

- **URL**: `/amx/api/devicedriver/:id`
- **Method**: `PUT`
- **Authentication**: None (in development) / Bearer Token (in production)
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Request Body**: Same structure as create endpoint, with fields to update
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated device driver object
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device driver not found"
    }
    ```

### Delete Device Driver

- **URL**: `/amx/api/devicedriver/:id`
- **Method**: `DELETE`
- **Authentication**: None (in development) / Bearer Token (in production)
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Device driver deleted successfully"
    }
    ```
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device driver not found"
    }
    ```

## AMX API: Device Types

### Get All Device Types

- **URL**: `/amx/api/devicedriver/device-types`
- **Method**: `GET`
- **Authentication**: None (in development) / Bearer Token (in production)
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "_id": "device_type_id",
        "name": "Device Type Name",
        "description": "Device Type Description",
        "category": "Device Category",
        "specifications": {},
        "createdAt": "2023-08-01T00:00:00.000Z",
        "updatedAt": "2023-08-01T00:00:00.000Z"
      }
    ]
    ```

### Get Device Type by ID

- **URL**: `/amx/api/devicedriver/device-types/:id`
- **Method**: `GET`
- **Authentication**: None (in development) / Bearer Token (in production)
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**: Single device type object as shown in the list endpoint
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device type not found"
    }
    ```

### Create Device Type

- **URL**: `/amx/api/devicedriver/device-types`
- **Method**: `POST`
- **Authentication**: None (in development) / Bearer Token (in production)
- **Request Body**:
  ```json
  {
    "name": "New Device Type",
    "description": "Device Type Description",
    "category": "Device Category",
    "specifications": {} // Optional
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**: Created device type object
- **Error Response**:
  - **Code**: 409
  - **Content**:
    ```json
    {
      "message": "A device type with this name already exists"
    }
    ```

### Update Device Type

- **URL**: `/amx/api/devicedriver/device-types/:id`
- **Method**: `PUT`
- **Authentication**: None (in development) / Bearer Token (in production)
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Request Body**: Same structure as create endpoint, with fields to update
- **Success Response**:
  - **Code**: 200
  - **Content**: Updated device type object
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device type not found"
    }
    ```

### Delete Device Type

- **URL**: `/amx/api/devicedriver/device-types/:id`
- **Method**: `DELETE`
- **Authentication**: None (in development) / Bearer Token (in production)
- **URL Parameters**: `id=[string]` MongoDB ObjectId
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "message": "Device type deleted successfully"
    }
    ```
- **Error Response**:
  - **Code**: 404
  - **Content**:
    ```json
    {
      "message": "Device type not found"
    }
    ```

## Error Responses

The API uses standard HTTP status codes to indicate the success or failure of an API request.

- **400 Bad Request**: The request was invalid or missing required fields
- **401 Unauthorized**: Authentication token is missing or invalid
- **403 Forbidden**: The authenticated user doesn't have the required permissions
- **404 Not Found**: The requested resource was not found
- **409 Conflict**: The request conflicts with the current state of the server
- **500 Server Error**: An error occurred on the server

All error responses have the following format:

```json
{
  "message": "Error message describing what went wrong",
  "errors": {                         // Optional - field-specific validation errors
    "field1": "Error message for field1",
    "field2": "Error message for field2"
  },
  "stack": "Stack trace (only in development environment)",
  "troubleshooting": "Troubleshooting steps"   // Optional - for certain operations like device connection tests
}
```

### Common Validation Errors

When creating or updating resources, the API performs validation to ensure data integrity. Here are common validation errors:

#### Device Creation/Update
- **Name**: "Device name is required", "Device name must be at least 3 characters"
- **Device Driver**: "Please select a device driver" 
- **Connection Settings**: 
  - TCP: "IP address is required", "Port must be a valid number between 1-65535"
  - RTU: "Serial port is required", "Baud rate must be a valid number"
- **Usage**: "Please select a device usage category"

#### Authentication
- **Login**: "Invalid credentials", "User not found"
- **Registration**: "Email already in use", "Password must be at least 6 characters"

#### Device Connection Testing
- **Connection**: "Failed to connect: Connection timed out", "Failed to connect: Invalid slave ID"
- **Communication**: "Failed to read registers: CRC error", "Failed to read registers: Invalid response"

## Authentication

Most API endpoints require authentication. To authenticate your requests, include the JWT token in the Authorization header as a Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

The token is obtained from the login endpoint and is valid for 30 days.

## Database Structure

The system uses two MongoDB databases with centralized configuration in `src/config/database.ts`:

1. **Client Database** (default: `mongodb://localhost:27017/client`):
   - User data
   - Device data
   - Profile data

2. **AMX Database** (default: `mongodb://localhost:27017/amx`):
   - Device drivers (in the `templates` collection)
   - Device types

## Data Models

### Device

```typescript
interface Device {
  _id: string;
  name: string;
  make?: string;
  model?: string;
  description?: string;
  enabled: boolean;
  tags?: string[];
  
  // Connection settings
  connectionSetting?: {
    connectionType: 'tcp' | 'rtu';
    tcp?: {
      ip: string;
      port: number;
      slaveId: number;
    };
    rtu?: {
      serialPort: string;
      baudRate: number;
      dataBits: number;
      stopBits: number;
      parity: string;
      slaveId: number;
    };
  };
  
  // Data points for register reading
  dataPoints?: Array<{
    range: {
      startAddress: number;
      count: number;
      fc: number;
    };
    parser: {
      parameters: Array<{
        name: string;
        dataType: string;
        scalingFactor: number;
        decimalPoint: number;
        byteOrder: string;
        signed?: boolean;
        registerRange?: string;
        registerIndex: number;
        unit?: string;
        description?: string;
        wordCount?: number;
      }>;
    };
  }>;
  
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Profile

```typescript
interface Profile {
  _id: string;
  name: string;
  description?: string;
  targetTemperature: number;
  temperatureRange: [number, number];
  fanSpeed: number;
  mode: 'cooling' | 'heating' | 'auto' | 'dehumidify';
  schedule: {
    active: boolean;
    times: Array<{
      days: Array<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>;
      startTime: string;
      endTime: string;
    }>;
  };
  assignedDevices: string[];
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### User

```typescript
interface User {
  _id: string;
  name: string;
  email: string;
  password: string; // Hashed
  role: 'user' | 'engineer' | 'admin' | 'template_manager';
  permissions: string[];
  organization?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Device Driver

```typescript
interface DeviceDriver {
  _id: string;
  name: string;
  make?: string;
  model?: string;
  description?: string;
  enabled: boolean;
  tags?: string[];
  deviceType: string;
  
  // Same connection settings and data points as Device
  connectionSetting?: {...};
  dataPoints?: [...];
  
  isDeviceDriver: boolean;
  isTemplate?: boolean;
  isVerified?: boolean;
  visibility?: 'public' | 'private' | 'organization';
  createdBy?: {
    userId: string;
    username: string;
    email: string;
    organization?: string;
  };
  usageCount?: number;
  rating?: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Device Type

```typescript
interface DeviceType {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  specifications?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: {
    userId: string;
    username: string;
    email: string;
  };
}
```

## Common Use Cases

### Creating a Device from a Device Driver Template

1. Get a device driver from `/amx/api/devicedriver/:id`
2. Remove the `_id` field and set any device-specific fields:
   ```json
   {
     "name": "New Device Instance",
     "deviceDriverId": "device_driver_id", // Reference to the device driver
     "usage": "energy_analysis",           // Required usage category
     "connectionSetting": {
       "connectionType": "tcp",
       "tcp": {
         "ip": "192.168.1.123", // Device-specific IP
         "port": 502,
         "slaveId": 1
       }
     },
     // Keep all other fields from the device driver
     "make": "...",
     "model": "...",
     "dataPoints": [...],
     "location": "Building A, Room 101", // Add installation location
     ...
   }
   ```
3. Create a new device with `/client/api/devices`

### Troubleshooting Device Creation Issues

If you encounter issues when creating a device, follow these steps:

1. **Check Browser Console**: Look for error messages in the browser console to identify API errors
2. **Validate Required Fields**: Ensure all required fields are provided:
   - `name`: Must be unique and not empty
   - `deviceDriverId`: Must be a valid MongoDB ObjectId
   - `usage`: Must be one of the predefined usage categories
   - `connectionSetting`: Must contain proper connection details for the selected type
  
3. **Validate Connection Settings**:
   - For TCP connections:
     - `ip` must be a valid IP address
     - `port` must be between 1-65535
     - `slaveId` must be between 1-255
   - For RTU connections:
     - `serialPort` must be a valid serial port path
     - `baudRate` must be a valid baud rate (typically 9600, 19200, etc.)
     - `slaveId` must be between 1-255

4. **Check Network Connectivity**:
   - Ensure the API server is reachable
   - Check token validity for authentication issues
   - Verify network connectivity from client to server

5. **Server-Side Validation**:
   - If the request reaches the server but fails validation, detailed error messages will be returned
   - Check for field-specific validation errors in the response
   - Look for uniqueness constraints (e.g., device name already exists)

### Managing User Permissions

The system uses role-based access control with the following default roles and permissions:

- **user**: `view_devices`, `view_profiles`
- **engineer**: `view_devices`, `manage_devices`, `view_profiles`, `manage_profiles`
- **admin**: All permissions
- **template_manager**: `view_devices`, `manage_device_templates`, `view_profiles`, `manage_profile_templates`

Custom permissions can be assigned directly to a user document.