# Realtime Data Storage

This document explains the realtime data storage functionality in the MACSYS system.

## Overview

The realtime data storage system provides a persistent database storage for the most recent device readings. Unlike the historical data which stores individual parameter values separately, the realtime data stores the complete snapshot of a device's current state.

## Key Features

1. **Single Entry Per Device** - Only one record is maintained per device, which is updated with each new reading.
2. **Efficient Storage** - Unlike historical data that grows over time, this collection maintains a fixed size proportional to the number of devices.
3. **Complete Snapshot** - Stores all parameter readings for a device in a single document, making it efficient to retrieve the entire state.
4. **Automatic Updates** - Automatically updated during polling cycles without requiring explicit API calls.

## Database Structure

The realtime data is stored in the `RealtimeData` collection in the client database.

```typescript
interface IRealtimeData {
  deviceId: mongoose.Types.ObjectId;   // Device ID (unique index)
  deviceName: string;                  // Device name for easy reference
  readings: {                          // Array of parameter readings
    name: string;                      // Parameter name
    registerIndex?: number;            // Register index (if applicable)
    address?: number;                  // Register address (if applicable)
    value: any;                        // Current value 
    unit?: string;                     // Unit of measurement
    dataType?: string;                 // Data type (FLOAT32, INT32, etc.)
    error?: string;                    // Error message (if reading failed)
  }[];
  timestamp: Date;                     // When the readings were taken
  lastUpdated: Date;                   // When the database entry was last updated
}
```

## API Endpoints

### 1. Update Realtime Data

```
POST /api/devices/:id/data/realtime
```

Updates the realtime data entry for a device. If the entry doesn't exist, it creates a new one.

### 2. Get Realtime Data

```
GET /api/devices/:id/data/realtime
```

Retrieves the realtime data for a device. If no data exists in the database, it will check the in-memory cache.

### 3. Delete Realtime Data

```
DELETE /api/devices/:id/data/realtime
```

Deletes the realtime data entry for a device.

## Implementation Details

The realtime data storage works alongside the existing in-memory cache:

1. When device data is read, it's first stored in the in-memory cache.
2. The `storeRealtimeData` function then asynchronously persists this data to the database.
3. This function first checks if an entry already exists for the device (using the deviceId as a unique identifier).
4. If an entry exists, it updates the existing document.
5. If no entry exists, it creates a new document.

## Usage in Code

When you obtain device data through polling:

```typescript
// The data is automatically stored in both cache and database:
const deviceData = await pollingService.pollDevice(deviceId);
```

To retrieve the latest data:

```typescript
// From API:
GET /api/devices/:id/data/realtime

// From code:
const realtimeData = await RealtimeData.findOne({ deviceId });
```

## Benefits

- **Persistence** - Even after server restart, the last known state of each device is preserved.
- **Database Integration** - Easy to integrate with database queries and aggregations.
- **Performance** - Single document per device makes retrieval very efficient.
- **Resilience** - Provides a backup of real-time data beyond the in-memory cache.