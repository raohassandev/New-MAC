# Schedule Management API Documentation

The Schedule Management system allows users to create schedule templates and apply them to devices for automated setpoint control.

## Base URL
```
/api/schedules
```

## Schedule Templates

### Create Schedule Template
```
POST /schedules/templates
```

Creates a new schedule template that can be applied to multiple devices.

**Request Body:**
```json
{
  "name": "Office Hours Template",
  "description": "Standard working hours temperature schedule",
  "type": "daily",
  "rules": [
    {
      "time": "06:00",
      "setpoint": 20,
      "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "enabled": true,
      "parameter": "Temperature",
      "registerAddress": 40001
    },
    {
      "time": "18:00",
      "setpoint": 18,
      "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "enabled": true,
      "parameter": "Temperature",
      "registerAddress": 40001
    },
    {
      "time": "08:00",
      "setpoint": 22,
      "days": ["Sat", "Sun"],
      "enabled": true,
      "parameter": "Temperature",
      "registerAddress": 40001
    }
  ],
  "isPublic": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule template created successfully",
  "template": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Office Hours Template",
    // ... rest of template data
  }
}
```

### Get All Schedule Templates
```
GET /schedules/templates?includePrivate=true
```

Gets all available schedule templates (user's own + public ones).

**Query Parameters:**
- `includePrivate` (boolean): Whether to include user's private templates (default: true)

### Get Schedule Template by ID
```
GET /schedules/templates/:id
```

### Update Schedule Template
```
PUT /schedules/templates/:id
```

Updates an existing schedule template (owner only).

### Delete Schedule Template
```
DELETE /schedules/templates/:id
```

Deletes a schedule template (owner only). Cannot delete if in use by devices.

### Get Devices Using Template
```
GET /schedules/templates/:templateId/devices
```

Gets all devices that are using a specific schedule template.

## Device Schedules

### Apply Template to Device
```
POST /schedules/devices/:deviceId/apply
```

Applies a schedule template to a specific device.

**Request Body:**
```json
{
  "templateId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "customRules": [
    {
      "time": "20:00",
      "setpoint": 16,
      "days": ["All"],
      "enabled": true,
      "parameter": "Temperature",
      "registerAddress": 40001
    }
  ],
  "startDate": "2024-01-15",
  "endDate": "2024-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule template applied to device successfully",
  "schedule": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "deviceId": "6821fe542af1d1a3177c7fe1",
    "templateId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "customRules": [...],
    "active": true,
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.999Z"
  }
}
```

### Get Device Schedule
```
GET /schedules/devices/:deviceId
```

Gets the current schedule for a specific device.

### Update Device Schedule
```
PUT /schedules/devices/:deviceId
```

Updates the schedule for a specific device.

**Request Body:**
```json
{
  "active": false,
  "customRules": [...],
  "startDate": "2024-02-01",
  "endDate": "2024-11-30"
}
```

### Deactivate Device Schedule
```
DELETE /schedules/devices/:deviceId
```

Deactivates the schedule for a specific device.

## Admin Operations

### Process Scheduled Changes
```
POST /schedules/process
```

Processes all scheduled changes that need to be applied now. This endpoint is typically called by a cron job.

## Schedule Rule Structure

Each schedule rule has the following structure:

```json
{
  "startTime": "09:00",      // Start time in 24-hour format (HH:MM)
  "endTime": "18:00",        // End time in 24-hour format (HH:MM)
  "setpoint": 22,            // Value to set during this period
  "days": ["Mon", "Tue"],    // Array of days
  "enabled": true,           // Whether the rule is active
  "parameter": "Temperature", // Parameter to control
  "registerAddress": 40001,   // Modbus register address
  "returnToDefault": true,   // Whether to return to default value after end time
  "defaultSetpoint": 18      // Default value to return to (if returnToDefault is true)
}
```

### Valid Day Values
- Individual days: `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"`, `"Sun"`
- Day groups: `"Weekday"`, `"Weekend"`, `"All"`
- Specific dates: `"2024-01-15"`, `"2024-12-25"` (YYYY-MM-DD format)

### Valid Schedule Types
- `"daily"`: Repeats every day based on rules
- `"weekly"`: Weekly schedule
- `"custom"`: Custom schedule with flexible rules
- `"event"`: For special events or occasions

## Example Use Cases

### 1. Create a Normal Routine Template
```json
{
  "name": "Normal Routine",
  "type": "daily",
  "rules": [
    { 
      "startTime": "06:00", 
      "endTime": "22:00", 
      "setpoint": 20, 
      "days": ["Weekday"],
      "returnToDefault": true,
      "defaultSetpoint": 18
    },
    { 
      "startTime": "08:00", 
      "endTime": "23:00", 
      "setpoint": 22, 
      "days": ["Weekend"],
      "returnToDefault": true,
      "defaultSetpoint": 18
    }
  ]
}
```

### 2. Create an Event Template
```json
{
  "name": "Holiday Schedule",
  "type": "event",
  "rules": [
    { 
      "startTime": "00:00", 
      "endTime": "12:00", 
      "setpoint": 18, 
      "days": ["2024-12-25"] 
    },
    { 
      "startTime": "12:00", 
      "endTime": "20:00", 
      "setpoint": 22, 
      "days": ["2024-12-25"] 
    },
    { 
      "startTime": "20:00", 
      "endTime": "23:59", 
      "setpoint": 20, 
      "days": ["2024-12-25"] 
    }
  ]
}
```

### 3. Apply Multiple Templates
Users can apply different templates for different date ranges:
1. Apply "Normal Routine" for January-November
2. Apply "Holiday Schedule" for December
3. Add custom rules for specific days

## Implementation Notes

1. **Cron Job Required**: The system requires a cron job to run periodically (e.g., every minute) to check and apply scheduled changes.

2. **Register Addresses**: Each rule can specify a different register address, allowing control of multiple parameters.

3. **Time Zones**: All times are stored and processed in the server's timezone.

4. **Conflict Resolution**: If multiple rules apply at the same time, the most specific rule takes precedence (specific date > day name > day group).

5. **Database Design**: The system uses two collections:
   - `ScheduleTemplate`: Stores reusable schedule templates
   - `DeviceSchedule`: Links devices to templates with custom overrides

## Error Handling

The API uses standard HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `404`: Not Found
- `500`: Server Error

Error responses include:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```