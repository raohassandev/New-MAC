# Device Polling System

This document explains the new server-side polling system for device data.

## Overview

The system implements an efficient polling mechanism where:

1. The server handles the actual device polling at specified intervals
2. The frontend requests data from a cache rather than triggering new device reads
3. Multiple clients can view the same data without causing excessive device reads

## Components

### Backend

- `deviceDataController.ts` - Contains endpoints for polling control and data retrieval
  - `/devices/:id/polling/start` - Start polling a device at a specified interval
  - `/devices/:id/polling/stop` - Stop polling a device
  - `/devices/:id/data/current` - Get current (latest) data for a device
  - `/devices/:id/data/history` - Get historical data for a device

### Frontend 

- `useDevicePolling.tsx` - Hook for using the polling system in any component
- `PollingContext.tsx` - Context provider for global polling state management
- `DeviceDetails.tsx` - Example implementation in the device details page

## Usage

### Starting/Stopping Polling

```typescript
// Using the Hook
const { 
  startPolling, 
  stopPolling, 
  isPolling,
  deviceData,
  refreshData 
} = useDevicePolling(deviceId);

// Start polling with a 5-second interval
await startPolling(5000);

// Stop polling
await stopPolling();

// Get fresh data on demand
const data = await refreshData();
```

### Global Polling Management

```tsx
// In your app root
import { PollingProvider } from './context/PollingContext';

function App() {
  return (
    <PollingProvider defaultPollingInterval={5000}>
      {/* Your app components */}
    </PollingProvider>
  );
}

// In any component
import { usePolling } from './context/PollingContext';

function Dashboard() {
  const { 
    activePollingDevices,
    startPolling,
    stopPolling,
    getDeviceData
  } = usePolling();
  
  // Start polling for multiple devices
  useEffect(() => {
    deviceIds.forEach(id => startPolling(id));
    
    // Cleanup when unmounting
    return () => deviceIds.forEach(id => stopPolling(id));
  }, [deviceIds]);
  
  // Get data for a specific device
  const deviceData = getDeviceData(deviceId);
}
```

## Benefits

- **Efficiency**: Multiple UI components can display the same device data without causing redundant device reads
- **Performance**: Reduces load on devices by centralizing polling
- **Consistency**: All clients see the same data for a device
- **Real-time**: Data refreshes automatically at a controlled rate

## Implementation Notes

1. The server maintains a cache of device readings 
2. Polling intervals are configurable per device 
3. Historical data is stored in the database for trending and analysis
4. Error handling is built-in at both client and server levels

## Data Flow

1. Server polls device at regular intervals using `dataPollingService`
2. Data is stored in both real-time cache and historical database
3. Clients request current data from the cache via the `/devices/:id/data/current` endpoint
4. Clients can control polling via start/stop endpoints
5. UI components display and automatically refresh the data