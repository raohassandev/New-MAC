# Device Management System API Documentation

This documentation provides details on the available API endpoints for frontend developers to interact with the server.

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
  "name": "string",
  "description": "string",
  "make": "string",
  "model": "string",
  "deviceDriver": "string (ID)",
  "location": "string",
  "connectionSettings": {
    "protocol": "string",
    "address": "string",
    "port": "number",
    "unitId": "number"
  },
  "dataPoints": [
    {
      "name": "string",
      "registerType": "string",
      "registerIndex": "number",
      "dataType": "string"
    }
  ]
}
```
- **Response**: Created device object
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
  "message": "Description of the validation error"
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

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error", 
  "message": "An unexpected error occurred"
}
```