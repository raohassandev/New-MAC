# Device Management System API Documentation

This documentation provides details on the available API endpoints for frontend developers to interact with the server.

## Database Architecture

The system uses a centralized database configuration for managing connections to both databases:

### Key Features

- **Centralized Configuration**: Single source of truth for all database connections in `/src/config/database.ts`
- **Multiple Database Connections**: Manages connections to both Client and AMX databases
- **Connection Caching**: Caches database connections to improve performance
- **Model Management**: Creates and manages database models with appropriate connections
- **Middleware Integration**: Automatically provides database access to all routes via middleware

### Database Connection Architecture

```
┌───────────────────────────────────────┐
│           Server Application          │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│       Centralized DB Configuration    │
│        /src/config/database.ts        │
└─────────┬─────────────────────┬───────┘
          │                     │
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  Client Database │   │   AMX Database   │
│ MongoDB Instance │   │ MongoDB Instance │
└──────────────────┘   └──────────────────┘
          │                     │
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  Client Models   │   │    AMX Models    │
│ - Device         │   │ - DeviceDriver   │
│ - Profile        │   │ - DeviceType     │
│ - User, etc.     │   │                  │
└──────────────────┘   └──────────────────┘
```

## Base URLs
- `/client/api` - Main client API
- `/amx/api` - AMX library API 
- `/health` - System health check

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-token>
```

## Authentication Endpoints

### Register User
- **URL**: `/client/api/auth/register`
- **Method**: POST
- **Request Body**:
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```
- **Response**:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string", 
  "role": "string",
  "permissions": ["string"],
  "token": "string"
}
```
- **Authentication**: None (Public)

### Login User
- **URL**: `/client/api/auth/login`
- **Method**: POST
- **Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
- **Response**:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "role": "string",
  "permissions": ["string"],
  "token": "string"
}
```
- **Authentication**: None (Public)

### Get Current User
- **URL**: `/client/api/auth/me`
- **Method**: GET
- **Response**:
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "role": "string",
  "permissions": ["string"]
}
```
- **Authentication**: Required (Bearer Token)

## Device Endpoints

### Get All Devices
- **URL**: `/client/api/devices`
- **Method**: GET
- **Query Parameters**:
  - `status`: Filter by enabled status (`online`/`offline`)
  - `type`: Filter by device type/make
  - `deviceDriver`: Filter by device driver ID
  - `usage`: Filter by usage category
  - `location`: Filter by location (regex match)
  - `includeTemplates`: Include template devices
  - `search`: Search across name, description, make, model, and IP fields
  - `tags`: Filter by tags (comma-separated)
  - `page`: Page number for pagination
  - `limit`: Number of records per page
  - `sort`: Field to sort by
  - `order`: Sort order (`asc`/`desc`)
- **Response**:
```json
{
  "devices": [
    {
      "_id": "string",
      "name": "string",
      "make": "string",
      "model": "string",
      "description": "string",
      "enabled": "boolean",
      "location": "string",
      "connectionSetting": "object",
      "dataPoints": "array",
      "lastSeen": "date"
    }
  ],
  "pagination": {
    "total": "number",
    "limit": "number",
    "page": "number",
    "pages": "number"
  }
}
```

### Get Device by ID
- **URL**: `/client/api/devices/:id`
- **Method**: GET
- **Query Parameters**:
  - `includeDriver`: Boolean to populate device driver data
- **Response**: Complete device object

### Create Device
- **URL**: `/client/api/devices`
- **Method**: POST
- **Request Body**:
```json
{
  "name": "string",                  // Required - unique device name
  "deviceDriverId": "string (ID)",   // Required - ID of the device driver
  "make": "string",                  // Optional - manufacturer name
  "model": "string",                 // Optional - model number
  "description": "string",           // Optional - device description
  "enabled": true,                   // Optional - whether device is enabled (default: true)
  "tags": ["string"],                // Optional - array of tags for categorization
  "usage": "string",                 // Required - device usage category (e.g., "energy_analysis")
  "usageNotes": "string",            // Optional - additional usage information
  "location": "string",              // Optional - physical location information
  
  "connectionSetting": {             // Required - connection configuration
    "connectionType": "tcp|rtu",     // Required - connection type (tcp or rtu)
    
    "tcp": {                         // Required for TCP connections
      "ip": "string",                // Required - IP address
      "port": "number",              // Required - port number (default: 502)
      "slaveId": "number"            // Required - Modbus slave/unit ID (default: 1)
    },
    
    "rtu": {                         // Required for RTU connections
      "serialPort": "string",        // Required - serial port path
      "baudRate": "number",          // Optional - baud rate (default: 9600)
      "dataBits": "number",          // Optional - data bits (default: 8)
      "stopBits": "number",          // Optional - stop bits (default: 1)
      "parity": "string",            // Optional - parity (default: "none")
      "slaveId": "number"            // Required - Modbus slave/unit ID (default: 1)
    }
  },
  
  "dataPoints": [                    // Optional - typically inherited from device driver
    {
      "range": {
        "startAddress": "number",    // Required - starting address of register range
        "count": "number",           // Required - number of registers to read
        "fc": "number"               // Required - Modbus function code (1, 2, 3, 4)
      },
      "parser": {
        "parameters": [
          {
            "name": "string",        // Required - parameter name
            "dataType": "string",    // Required - data type (FLOAT, INT, UINT, etc.)
            "scalingFactor": "number", // Optional - scaling factor (default: 1)
            "decimalPoint": "number",  // Optional - decimal points (default: 2)
            "byteOrder": "string",     // Optional - byte order (default: "ABCD")
            "signed": "boolean",       // Optional - whether value is signed
            "registerIndex": "number", // Required - offset from start address
            "wordCount": "number"      // Optional - number of words for this parameter
          }
        ]
      }
    }
  ]
}
```

- **Response**: Created device object with MongoDB-assigned ID
```json
{
  "_id": "string",
  "name": "string",
  "deviceDriverId": "string",
  "make": "string",
  "model": "string",
  "description": "string",
  "enabled": "boolean",
  "tags": ["string"],
  "usage": "string",
  "usageNotes": "string",
  "location": "string",
  "connectionSetting": {
    "connectionType": "tcp|rtu",
    "tcp": { "ip": "string", "port": "number", "slaveId": "number" },
    "rtu": { "serialPort": "string", "baudRate": "number", ... }
  },
  "dataPoints": [...],
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

- **Error Response Examples**:
```json
{
  "message": "Validation error",
  "errors": {
    "name": "Device name is required",
    "deviceDriverId": "Please select a device driver",
    "tcp.ip": "IP address is required"
  }
}
```

```json
{
  "message": "Device with this name already exists",
  "code": "DUPLICATE_KEY"
}
```

- **Authentication**: Required (`manage_devices` permission)

### Update Device
- **URL**: `/client/api/devices/:id`
- **Method**: PUT
- **Request Body**: Updated device fields
- **Response**: Updated device object
- **Authentication**: Required (`manage_devices` permission)

### Delete Device
- **URL**: `/client/api/devices/:id`
- **Method**: DELETE
- **Response**:
```json
{
  "message": "Device removed",
  "id": "string"
}
```
- **Authentication**: Required (`manage_devices` permission)

### Test Device Connection
- **URL**: `/client/api/devices/:id/test`
- **Method**: POST
- **Response**:
```json
{
  "success": "boolean",
  "message": "string"
}
```

### Read Device Registers
- **URL**: `/client/api/devices/:id/read`
- **Method**: GET
- **Response**:
```json
{
  "deviceId": "string",
  "deviceName": "string",
  "timestamp": "date",
  "readings": [
    {
      "name": "string",
      "registerIndex": "number",
      "value": "any",
      "unit": "string",
      "dataType": "string"
    }
  ]
}
```

### Get Devices by Driver ID
- **URL**: `/client/api/devices/by-driver/:driverId`
- **Method**: GET
- **Query Parameters**:
  - `page`: Page number for pagination
  - `limit`: Number of records per page
- **Response**: List of devices with pagination info

### Get Devices by Usage
- **URL**: `/client/api/devices/by-usage/:usage`
- **Method**: GET
- **Query Parameters**:
  - `page`: Page number for pagination
  - `limit`: Number of records per page
- **Response**: List of devices with pagination info

## Device Data Endpoints

### Start Device Polling
- **URL**: `/client/api/device-data/:id/polling/start`
- **Method**: POST
- **Request Body**:
```json
{
  "interval": "number" // Polling interval in milliseconds
}
```
- **Response**:
```json
{
  "success": "boolean",
  "message": "string"
}
```
- **Authentication**: Required (`manage_devices` permission)

### Stop Device Polling
- **URL**: `/client/api/device-data/:id/polling/stop`
- **Method**: POST
- **Response**:
```json
{
  "success": "boolean",
  "message": "string"
}
```
- **Authentication**: Required (`manage_devices` permission)

### Get Current Device Data
- **URL**: `/client/api/device-data/:id/data/current`
- **Method**: GET
- **Response**: Current device data readings
- **Authentication**: Required

### Get Device Historical Data
- **URL**: `/client/api/device-data/:id/data/history`
- **Method**: GET
- **Query Parameters**:
  - `startDate`: Start date for historical data
  - `endDate`: End date for historical data
  - `parameter`: Filter by specific parameter
  - `limit`: Maximum number of records
- **Response**: Historical data readings
- **Authentication**: Required

## Profile Endpoints

### Get All Profiles
- **URL**: `/client/api/profiles`
- **Method**: GET
- **Response**: List of profiles with populated assigned devices
- **Authentication**: Required

### Get Profile by ID
- **URL**: `/client/api/profiles/:id`
- **Method**: GET
- **Response**: Profile object with populated assigned devices
- **Authentication**: Required

### Create Profile
- **URL**: `/client/api/profiles`
- **Method**: POST
- **Request Body**: Profile object with required fields
- **Response**: Created profile object
- **Authentication**: Required (`manage_profiles` permission)

### Update Profile
- **URL**: `/client/api/profiles/:id`
- **Method**: PUT
- **Request Body**: Updated profile fields
- **Response**: Updated profile object
- **Authentication**: Required (`manage_profiles` permission)

### Delete Profile
- **URL**: `/client/api/profiles/:id`
- **Method**: DELETE
- **Response**:
```json
{
  "message": "Profile removed",
  "id": "string"
}
```
- **Authentication**: Required (`manage_profiles` permission)

### Duplicate Profile
- **URL**: `/client/api/profiles/:id/duplicate`
- **Method**: POST
- **Response**: Duplicated profile object
- **Authentication**: Required (`manage_profiles` permission)

### Apply Profile
- **URL**: `/client/api/profiles/:id/apply`
- **Method**: POST
- **Response**: Results of applying profile to each assigned device
- **Authentication**: Required (`manage_profiles` permission)

### Get Template Profiles
- **URL**: `/client/api/profiles/templates`
- **Method**: GET
- **Response**: List of template profiles
- **Authentication**: Required

### Create Profile from Template
- **URL**: `/client/api/profiles/from-template/:templateId`
- **Method**: POST
- **Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "assignedDevices": ["string"]
}
```
- **Response**: Created profile object
- **Authentication**: Required (`manage_profiles` permission)

## AMX Library Endpoints

### Device Types

#### Get All Device Types
- **URL**: `/amx/api/devicedriver/device-types`
- **Method**: GET
- **Response**: List of device types

#### Create Device Type
- **URL**: `/amx/api/devicedriver/device-types`
- **Method**: POST
- **Request Body**: Device type object
- **Response**: Created device type object

#### Get Device Type by ID
- **URL**: `/amx/api/devicedriver/device-types/:id`
- **Method**: GET
- **Response**: Device type object

#### Update Device Type
- **URL**: `/amx/api/devicedriver/device-types/:id`
- **Method**: PUT
- **Request Body**: Updated device type fields
- **Response**: Updated device type object

#### Delete Device Type
- **URL**: `/amx/api/devicedriver/device-types/:id`
- **Method**: DELETE
- **Response**:
```json
{
  "message": "Device type deleted successfully"
}
```

### Device Drivers

#### Get All Device Drivers
- **URL**: `/amx/api/devicedriver`
- **Method**: GET
- **Response**: List of device drivers

#### Create Device Driver
- **URL**: `/amx/api/devicedriver`
- **Method**: POST
- **Request Body**: Device driver object
- **Response**: Created device driver object

#### Get Device Driver by ID
- **URL**: `/amx/api/devicedriver/:id`
- **Method**: GET
- **Response**: Device driver object

#### Update Device Driver
- **URL**: `/amx/api/devicedriver/:id`
- **Method**: PUT
- **Request Body**: Updated device driver fields
- **Response**: Updated device driver object

#### Delete Device Driver
- **URL**: `/amx/api/devicedriver/:id`
- **Method**: DELETE
- **Response**:
```json
{
  "message": "Device driver deleted successfully"
}
```

## System Health Endpoint

### Get System Health
- **URL**: `/health`
- **Method**: GET
- **Response**:
```json
{
  "status": "UP",
  "timestamp": "date",
  "services": {
    "clientDB": "UP|DOWN",
    "amxDB": "UP|DOWN"
  }
}
```

## Error Responses

All API endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Description of the validation error",
  "errors": {
    "fieldName1": "Error message for this field",
    "fieldName2": "Error message for this field",
    "connectionSetting.tcp.ip": "Field-specific error messages can be nested"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required" 
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "A resource with this identifier already exists",
  "code": "DUPLICATE_KEY"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error", 
  "message": "An unexpected error occurred",
  "stack": "Error stack trace (only in development mode)"
}
```

### Common Validation Errors for Device Creation

When creating or updating devices, these are common validation errors you might encounter:

#### Device Basic Information
- **name**: "Device name is required", "Device name must be at least 3 characters"
- **deviceDriverId**: "Please select a device driver", "Device driver not found"
- **usage**: "Please select a device usage category"

#### TCP Connection Settings
- **connectionSetting.tcp.ip**: "IP address is required", "Invalid IP address format"
- **connectionSetting.tcp.port**: "Port must be a valid number between 1-65535"
- **connectionSetting.tcp.slaveId**: "Slave ID must be a valid number between 1-255"

#### RTU Connection Settings
- **connectionSetting.rtu.serialPort**: "Serial port is required"
- **connectionSetting.rtu.baudRate**: "Baud rate must be a valid number"
- **connectionSetting.rtu.slaveId**: "Slave ID must be a valid number between 1-255"

#### Data Points
- **dataPoints.range.startAddress**: "Start address must be a valid number"
- **dataPoints.range.count**: "Count must be a positive number"
- **dataPoints.parser.parameters.name**: "Parameter name is required"

## Key Components of the Database Architecture

| Component | Description |
|-----------|-------------|
| `initializeDatabases()` | Main function to establish connections to both databases and initialize models |
| `connectClientToDB()` | Function to connect to the client database |
| `connectAmxToDB()` | Function to connect to the AMX database |
| `getClientConnection()` | Returns the current client database connection |
| `getAmxConnection()` | Returns the current AMX database connection |
| `getClientModels()` | Returns all models for the client database |
| `getAmxModels()` | Returns all models for the AMX database |

### Usage In Controllers

Controllers access database models through the centralized configuration:

```typescript
// Example: Device controller accessing database model
export const getDeviceById = async (req: Request, res: Response) => {
  try {
    // Get Device model from centralized configuration
    let DeviceModel = req.app.locals.cachedDeviceModel || 
                     (req.app.locals.clientModels && 
                      req.app.locals.clientModels.Device);
    
    // If no model in app.locals, create it using connection
    if (!DeviceModel) {
      const mainDBConnection = req.app.locals.mainDB;
      if (mainDBConnection && mainDBConnection.readyState === 1) {
        DeviceModel = createDeviceModel(mainDBConnection);
      } else {
        return res.status(500).json({ 
          message: 'Database connection error' 
        });
      }
    }
    
    // Use model to query database
    const device = await DeviceModel.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    return res.json(device);
  } catch (error) {
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};
```

## Benefits of the Centralized Database Architecture

1. **Improved Reliability**: Centralized error handling and connection management
2. **Better Performance**: Connection caching and model reuse
3. **Simplified Maintenance**: Single point of configuration for all database connections
4. **Consistent Data Access**: Standardized way to access data models throughout the application
5. **Enhanced Diagnostics**: Improved logging and error reporting for database issues