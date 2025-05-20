# Realtime Data API Documentation

## Overview
This API provides endpoints to retrieve realtime data from the MongoDB realtime data collection. The data includes the latest readings from all devices that are being polled.

## Endpoints

### 1. Get Realtime Data for Single Device
```
GET /api/devices/:id/data/realtime
```

**Description**: Retrieves realtime data for a specific device.

**Parameters**:
- `id` (path param): Device ID (MongoDB ObjectId)

**Response**:
```json
{
  "success": true,
  "message": "Realtime data retrieved successfully",
  "deviceId": "682a26321759f3842de76c14",
  "deviceName": "Energy Meter 1",
  "hasData": true,
  "data": {
    "_id": "...",
    "deviceId": "682a26321759f3842de76c14",
    "deviceName": "Energy Meter 1",
    "readings": [
      {
        "name": "Voltage",
        "registerIndex": 0,
        "value": 230.5,
        "unit": "V",
        "dataType": "FLOAT32"
      },
      {
        "name": "Current",
        "registerIndex": 2,
        "value": null,
        "unit": "A",
        "error": "Failed to read range: Modbus exception 2"
      }
    ],
    "timestamp": "2024-01-20T10:30:00.000Z",
    "lastUpdated": "2024-01-20T10:30:00.000Z"
  },
  "stale": false,
  "newerDataAvailable": false
}
```

### 2. Get Realtime Data for All Devices
```
GET /api/data/realtime
```

**Description**: Retrieves realtime data for multiple devices with pagination and filtering.

**Query Parameters**:
- `deviceIds` (optional): Comma-separated list of device IDs
- `hasData` (optional): Filter by devices with/without data (`true`/`false`)
- `search` (optional): Search in device names
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)

**Examples**:
```
# Get all devices with realtime data
GET /api/data/realtime

# Get specific devices
GET /api/data/realtime?deviceIds=id1,id2,id3

# Get only devices with data
GET /api/data/realtime?hasData=true

# Search by device name
GET /api/data/realtime?search=meter

# Pagination
GET /api/data/realtime?page=2&limit=50
```

**Response**:
```json
{
  "success": true,
  "message": "Realtime data retrieved successfully",
  "data": [
    {
      "_id": "...",
      "deviceId": "682a26321759f3842de76c14",
      "deviceName": "Energy Meter 1",
      "readings": [
        {
          "name": "Voltage",
          "registerIndex": 0,
          "value": 230.5,
          "unit": "V",
          "dataType": "FLOAT32"
        }
      ],
      "timestamp": "2024-01-20T10:30:00.000Z",
      "lastUpdated": "2024-01-20T10:30:00.000Z",
      "device": {
        "_id": "682a26321759f3842de76c14",
        "name": "Energy Meter 1",
        "enabled": true,
        "connectionType": "tcp"
      }
    },
    {
      "_id": "...",
      "deviceId": "682a26321759f3842de76c15",
      "deviceName": "Temperature Sensor",
      "readings": [
        {
          "name": "Temperature",
          "registerIndex": 0,
          "value": 25.3,
          "unit": "°C",
          "dataType": "FLOAT32"
        }
      ],
      "timestamp": "2024-01-20T10:31:00.000Z",
      "lastUpdated": "2024-01-20T10:31:00.000Z",
      "device": {
        "_id": "682a26321759f3842de76c15",
        "name": "Temperature Sensor",
        "enabled": true,
        "connectionType": "rtu"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 100,
    "pages": 1
  }
}
```

## Data Structure

### Reading Object
Each reading in the `readings` array contains:
- `name`: Parameter name
- `registerIndex`: Modbus register address
- `value`: The actual value (can be null if error)
- `unit`: Unit of measurement
- `dataType`: Data type (UINT16, INT16, FLOAT32, etc.)
- `error` (optional): Error message if reading failed

### Notes
- Realtime data is updated by the auto-polling service
- Data includes both successful readings and errors
- The `lastUpdated` field indicates when the data was last refreshed
- The `stale` flag indicates if newer data is available in cache
- Devices without configured data points may show default readings