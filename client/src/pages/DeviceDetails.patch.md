# DeviceDetails.tsx Polling Integration Patch

This patch file provides instructions on how to integrate the new polling context and hook into the existing DeviceDetails.tsx file. Follow these steps to update the component:

## 1. Update Imports

Add these new imports at the top of the file:

```tsx
import { usePolling } from '../context/PollingContext';
import useDevicePolling from '../hooks/useDevicePolling';
```

## 2. Replace Auto-Polling State Variables

Replace these state variables:

```tsx
// Auto-polling settings
const [autoPolling, setAutoPolling] = useState<boolean>(true);
const [pollingInterval, setPollingInterval] = useState<number>(5000); // 5 seconds default
const pollingTimerRef = useRef<number | null>(null);
```

With the new polling hook:

```tsx
// Use the new polling hook for device data
const {
  deviceData: polledDeviceData,
  isPolling: autoPolling,
  startPolling,
  stopPolling,
  refreshData: refreshDeviceData,
  pollingStatus,
  lastUpdated,
} = useDevicePolling(deviceId || '', {
  autoStart: true,
  refreshInterval: 5000,
  onDataReceived: (data) => {
    // Update readings when new data arrives
    if (data.readings) {
      setReadings(data.readings);
      addCommunicationLog({
        type: 'response',
        operation: 'Auto Poll Data',
        message: `Received ${data.readings.length} readings from device ${data.deviceName}`,
        details: data,
      });
    }
  },
  onError: (err) => {
    setError(err.message);
    addCommunicationLog({
      type: 'error',
      operation: 'Auto Poll Data',
      message: `Error: ${err.message}`,
      details: err,
    });
  },
});

// State for polling interval (UI only)
const [pollingInterval, setPollingInterval] = useState<number>(5000);
```

## 3. Replace useEffect for Auto-Polling

Remove the entire useEffect hook for auto-polling:

```tsx
// Set up auto-polling of device data
useEffect(() => {
  // Clean up existing timer if any
  if (pollingTimerRef.current) {
    window.clearInterval(pollingTimerRef.current);
    pollingTimerRef.current = null;
  }

  // Only set up polling if enabled and we have a valid device
  if (autoPolling && deviceId && device) {
    console.log(`Starting auto-polling every ${pollingInterval}ms for device ${device.name}`);

    // Create a new interval that calls the read registers function
    pollingTimerRef.current = window.setInterval(() => {
      console.log(`Auto-polling: Fetching data for device ${device.name}...`);
      // Use the async function with silent success (don't show success message on each poll)
      handleReadRegistersAsync(false);
    }, pollingInterval);
  }

  // Clean up on unmount or when dependencies change
  return () => {
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };
}, [autoPolling, pollingInterval, deviceId, device]);
```

## 4. Update Auto-Polling Toggle Handler

Replace the auto-polling toggle handler with this new version:

```tsx
// Handle toggling auto-polling
const handleToggleAutoPolling = async () => {
  if (autoPolling) {
    // Currently polling, so stop it
    const success = await stopPolling();
    if (success) {
      addCommunicationLog({
        type: 'info',
        operation: 'Auto Poll',
        message: `Auto-polling stopped for device ${device.name}`,
      });
    } else {
      addCommunicationLog({
        type: 'error',
        operation: 'Auto Poll',
        message: `Failed to stop auto-polling for device ${device.name}`,
      });
    }
  } else {
    // Currently not polling, so start it
    const success = await startPolling(pollingInterval);
    if (success) {
      addCommunicationLog({
        type: 'info',
        operation: 'Auto Poll',
        message: `Auto-polling started for device ${device.name} every ${pollingInterval}ms`,
      });
    } else {
      addCommunicationLog({
        type: 'error',
        operation: 'Auto Poll',
        message: `Failed to start auto-polling for device ${device.name}`,
      });
    }
  }
};
```

## 5. Update Polling Interval Change Handler

Replace the polling interval change handler:

```tsx
// Handle changing polling interval
const handlePollingIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = parseInt(e.target.value);
  if (!isNaN(value) && value >= 1000) { // Minimum 1 second
    setPollingInterval(value);
    
    // If currently polling, update the polling interval
    if (autoPolling) {
      stopPolling().then(() => {
        startPolling(value);
        addCommunicationLog({
          type: 'info',
          operation: 'Auto Poll',
          message: `Polling interval updated to ${value}ms for device ${device.name}`,
        });
      });
    }
  }
};
```

## 6. Update handleReadRegisters function

Replace the handleReadRegisters function:

```tsx
// Regular handler for button click that calls the async function with full UI feedback
const handleReadRegisters = () => {
  // Use the new refreshDeviceData function instead
  setReadingData(true);
  setError(null);
  setErrorDetails(null);
  setSuccess(null);
  
  setCommunicationStatus({
    type: 'sending',
    operation: 'Manual Read Data',
    timestamp: new Date(),
    message: `Reading data from ${device.name}`,
  });
  
  refreshDeviceData(true) // force refresh
    .then((data) => {
      if (data) {
        setSuccess('Successfully read data from device');
        
        setCommunicationStatus({
          type: 'success',
          operation: 'Manual Read Data',
          timestamp: new Date(),
          message: 'Successfully read data from device',
        });
        
        addCommunicationLog({
          type: 'response',
          operation: 'Manual Read Data',
          message: `Response: Received ${data.readings.length} readings from device ${data.deviceName}`,
          details: data,
        });
      } else {
        throw new Error('Failed to read device data');
      }
    })
    .catch((err) => {
      setError(err.message);
      
      setCommunicationStatus({
        type: 'error',
        operation: 'Manual Read Data',
        timestamp: new Date(),
        message: err.message,
      });
      
      addCommunicationLog({
        type: 'error',
        operation: 'Manual Read Data',
        message: `Error: ${err.message}`,
        details: err,
      });
    })
    .finally(() => {
      setReadingData(false);
    });
};
```

## 7. Update lastSeen Display

Find the lastSeen display in the UI and update it to show the last polling time:

```tsx
<div className="text-sm text-gray-500">
  Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
  {lastUpdated && (
    <span className="ml-2">(Last polled: {lastUpdated.toLocaleString()})</span>
  )}
</div>
```

## 8. Update the Auto-Polling Toggle in UI

Update the auto-polling toggle in the UI:

```tsx
<div className="ml-2 flex items-center">
  <span className="mr-2 text-sm">{autoPolling ? 'Auto-Polling On' : 'Auto-Polling Off'}</span>
  <Switch
    checked={autoPolling}
    onChange={handleToggleAutoPolling}
    className={`${
      autoPolling ? 'bg-green-500' : 'bg-gray-400'
    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
  >
    <span
      className={`${
        autoPolling ? 'translate-x-6' : 'translate-x-1'
      } inline-block h-4 w-4 rounded-full bg-white transition-transform`}
    />
  </Switch>
</div>
```

## 9. Optional: Add Polling Status Indicator

Add a polling status indicator to the UI:

```tsx
<div className="ml-4 text-sm">
  <span className="font-medium">Polling status:</span>{' '}
  <span className={
    pollingStatus === 'active' ? 'text-green-600' : 
    pollingStatus === 'starting' ? 'text-blue-600' :
    pollingStatus === 'error' ? 'text-red-600' : 'text-gray-600'
  }>
    {pollingStatus}
  </span>
</div>
```

These changes will fully integrate the new server-side polling system into the DeviceDetails component, providing a more efficient and reliable data polling mechanism.