# Communication Module Integration Guide

This guide explains how to integrate the new communication module with the existing application.

## Overview

The communication module provides a robust framework for device communication using Modbus TCP and RTU protocols. It is designed to replace the existing `modbusHelper.ts` and improve the reliability of device communication.

## Integration Steps

### 1. Build the Communication Module

First, build the module to make sure all TypeScript files are compiled:

```bash
cd server
npm run build
```

### 2. Use the Adapter Classes

The easiest way to integrate with existing code is to use the adapter classes:

#### Using `modbusAdapter.ts`

This adapter connects the new communication module with the existing `modbusHelper.ts`:

```typescript
import { 
  createDeviceFromData, 
  startDevicePolling,
  stopDevicePolling 
} from '../client/controllers/modbusAdapter';

// Create a device from database data
const deviceId = await createDeviceFromData(deviceData);

// Start polling
startDevicePolling(deviceId, 10000); // Poll every 10 seconds

// Stop polling
stopDevicePolling(deviceId);
```

#### Using `pollingServiceAdapter.ts`

This adapter integrates with the existing `dataPollingService.ts`:

```typescript
import { 
  pollDeviceWithNewModule,
  getRealtimeDataFromNewModule,
  startPollingDeviceWithNewModule,
  stopPollingDeviceWithNewModule
} from '../client/services/pollingServiceAdapter';

// Poll a device once
const reading = await pollDeviceWithNewModule(deviceId);

// Get realtime data
const data = getRealtimeDataFromNewModule(deviceId);

// Start automatic polling
await startPollingDeviceWithNewModule(deviceId, 10000);

// Stop polling
stopPollingDeviceWithNewModule(deviceId);
```

### 3. Using the Migration Script

For a bulk migration of all devices, use the provided migration script:

```bash
node scripts/migrate-polling-service.js
```

This will:
1. Read all enabled devices from the database
2. Create them in the new communication module
3. Start polling at the same intervals

### 4. Direct Integration

For new code or complete rewrites, you can directly use the communication module:

```typescript
import { initCommunicationModule } from './communication';
import { ModbusDevice } from './communication/core/device.concrete';
import { ModbusTCPClient } from './communication/protocols/modbus/tcp/client';

// Initialize the module
const { deviceManager, pollingService } = await initCommunicationModule();

// Create a client
const client = new ModbusTCPClient({
  host: '192.168.1.100',
  port: 502,
  unitId: 1
});

// Create a device
const device = new ModbusDevice({
  id: 'device1',
  name: 'Temperature Controller',
  client,
  parameters: [
    {
      id: 'temp',
      name: 'Temperature',
      address: 100,
      registerType: RegisterType.HOLDING_REGISTER,
      dataType: DataType.FLOAT32,
      byteOrder: ByteOrder.ABCD,
      scalingFactor: 0.1,
      unit: '°C'
    }
  ]
});

// Register the device
deviceManager.registerDevice(device);

// Start polling
pollingService.startPolling(device.getId(), 5000);
```

## Modifying Controller Classes

### Device Controller

Modify the device controller to use the new communication module:

```typescript
// server/src/client/controllers/deviceController.ts

// Import the adapter
import { 
  createDeviceFromData, 
  startDevicePolling, 
  stopDevicePolling 
} from './modbusAdapter';

// In your create device handler
async function createDevice(req, res) {
  try {
    // Create device in database
    const device = await Device.create(req.body);
    
    // If device is enabled, create it in communication module
    if (device.enabled) {
      const deviceId = await createDeviceFromData(device);
      
      // Start polling if polling is enabled
      if (device.enablePolling) {
        startDevicePolling(deviceId, device.pollingInterval || 10000);
      }
    }
    
    res.status(201).json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// In your update device handler
async function updateDevice(req, res) {
  try {
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // If device is enabled, update it in communication module
    if (device.enabled) {
      // Stop any existing polling
      stopDevicePolling(device._id.toString());
      
      // Create or update device in communication module
      const deviceId = await createDeviceFromData(device);
      
      // Start polling if polling is enabled
      if (device.enablePolling) {
        startDevicePolling(deviceId, device.pollingInterval || 10000);
      }
    } else {
      // If device is disabled, stop polling
      stopDevicePolling(device._id.toString());
    }
    
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// In your delete device handler
async function deleteDevice(req, res) {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    
    // Stop polling and remove from communication module
    stopDevicePolling(device._id.toString());
    
    res.json({ message: 'Device deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Device Data Controller

Modify the device data controller to use the new polling service adapter:

```typescript
// server/src/client/controllers/deviceDataController.ts

// Import the adapter
import { 
  pollDeviceWithNewModule, 
  getRealtimeDataFromNewModule 
} from '../services/pollingServiceAdapter';

// In your get device data handler
async function getDeviceData(req, res) {
  try {
    const deviceId = req.params.id;
    
    // Get latest data from cache
    let data = getRealtimeDataFromNewModule(deviceId);
    
    // If no data in cache, poll the device
    if (!data) {
      data = await pollDeviceWithNewModule(deviceId);
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// In your refresh device data handler
async function refreshDeviceData(req, res) {
  try {
    const deviceId = req.params.id;
    
    // Poll the device
    const data = await pollDeviceWithNewModule(deviceId);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## Configuration

The communication module can be configured through environment variables:

```
# .env file
LOG_LEVEL=info
MODBUS_TIMEOUT=5000
MODBUS_MAX_RETRIES=3
CACHE_ENABLED=true
CACHE_TTL=60000
DEFAULT_POLLING_INTERVAL=10000
```

Or programmatically:

```typescript
import { configManager } from './communication/config';

// Update Modbus configuration
configManager.updateModbusConfig({
  timeout: 3000,
  maxRetries: 2
});

// Update polling configuration
configManager.updatePollingConfig({
  minInterval: 2000,
  maxConcurrentPolls: 3
});
```

## Troubleshooting

If you encounter issues with the communication module, use the troubleshooting script:

```bash
node scripts/troubleshoot-communication.js
```

This script will:
1. Check that all module components are present
2. Verify the build artifacts
3. Check available serial ports
4. Test device connections

## Additional Resources

- See the full API documentation in `/server/src/communication/README.md`
- Example usage in `/server/src/examples/communicationModuleUsage.ts`
- Unit tests in `/server/src/communication/__tests__/communication.test.ts`