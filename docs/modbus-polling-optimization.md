# Modbus Polling Optimization

## Overview

This document explains the changes made to optimize Modbus polling in the system. The main change was modifying the frontend to use the read-only endpoint for device data polling instead of the standard endpoint, which helps reduce unnecessary device reads.

## Problem

The frontend was using the `/client/api/devices/:id/data/current` endpoint for polling device data, which would sometimes trigger new device reads even when there was recent data in the cache. This could lead to:

- Excessive Modbus traffic to physical devices
- Higher system load
- Potential device communication issues due to too many simultaneous requests
- Higher latency for UI updates

## Solution

The server already had a read-only endpoint (`/client/api/devices/:id/data/current/readonly`) that properly respects device polling intervals. This endpoint:

1. Checks the device's configured polling interval (defaults to 30 seconds if not specified)
2. If cached data exists and is newer than the polling interval, returns the cached data
3. Only triggers a new device read if the cached data is older than the polling interval

By modifying the frontend to use this endpoint, we ensure that devices are only polled at appropriate intervals.

## Changes Made

1. Modified the `getCurrentData` function in `/client/src/api/endpoints.ts` to use the `/client/api/devices/:id/data/current/readonly` endpoint instead of `/client/api/devices/:id/data/current`.

```typescript
// Before
getCurrentData: (id: string, forceRefresh: boolean = false) => {
  console.log(`[endpoints.ts] Getting current data for device ${id}${forceRefresh ? ' (force refresh)' : ''}`);
  // Use a single, consistent path for data retrieval
  return api.get(`/client/api/devices/${id}/data/current${forceRefresh ? '?forceRefresh=true' : ''}`);
},

// After
getCurrentData: (id: string, forceRefresh: boolean = false) => {
  console.log(`[endpoints.ts] Getting current data for device ${id}${forceRefresh ? ' (force refresh)' : ''}`);
  // Use the readonly endpoint which respects device polling interval settings
  return api.get(`/client/api/devices/${id}/data/current/readonly${forceRefresh ? '?forceRefresh=true' : ''}`);
},
```

## Benefits

1. **Reduced Device Communication**: Devices will only be polled at their configured intervals, not on every UI request.
2. **Better Performance**: Reduced server load due to fewer device polling operations.
3. **More Consistent Behavior**: Device-specific polling intervals are respected.
4. **Lower Latency**: Most requests will return immediately with cached data instead of waiting for a device read.

## Testing

When testing this change, pay attention to:

1. Verify that the UI still updates with device data at appropriate intervals
2. Check that forcing a refresh still works when needed
3. Monitor server logs to ensure the read-only endpoint is being used
4. Confirm that device communication errors are reduced

## Configuration

Devices can have their polling intervals configured in the database with the `pollingInterval` property (in milliseconds). If not specified, the default interval is 30 seconds (30000ms).