/**
 * Communication Module Usage Examples
 * 
 * This file demonstrates how to use the communication module in your application.
 */

import { initCommunicationModule } from '../communication';
import { ModbusDevice } from '../communication/core/device.concrete';
import { ModbusTCPClient } from '../communication/protocols/modbus/tcp/client';
import { ModbusRTUClient } from '../communication/protocols/modbus/rtu/client';
import { RegisterType, DataType, ByteOrder } from '../communication/core/types';
import { configManager } from '../communication/config';

/**
 * Basic usage example
 */
async function basicExample() {
  // Initialize the communication module
  const { deviceManager, pollingService, logService } = await initCommunicationModule({
    logLevel: 'info',
    enableCaching: true
  });
  
  // Create a Modbus TCP client
  const tcpClient = new ModbusTCPClient({
    host: '192.168.1.100',
    port: 502,
    unitId: 1
  });
  
  // Create a device
  const device = new ModbusDevice({
    id: 'device1',
    name: 'Temperature Controller',
    client: tcpClient,
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
      },
      {
        id: 'humidity',
        name: 'Humidity',
        address: 102,
        registerType: RegisterType.HOLDING_REGISTER,
        dataType: DataType.UINT16,
        byteOrder: ByteOrder.AB,
        unit: '%'
      }
    ]
  });
  
  // Register the device
  const deviceId = deviceManager.registerDevice(device);
  logService.info(`Registered device with ID: ${deviceId}`);
  
  // Connect to the device
  try {
    await device.connect();
    logService.info('Connected to device');
    
    // Read a parameter
    const temperature = await device.readParameter('temp');
    logService.info(`Temperature: ${temperature}°C`);
    
    // Read multiple parameters
    const values = await device.readParameters(['temp', 'humidity']);
    logService.info(`Temperature: ${values.temp}°C, Humidity: ${values.humidity}%`);
    
    // Start polling
    pollingService.startPolling(deviceId, 5000); // Poll every 5 seconds
    logService.info('Started polling');
    
    // Register for data events
    pollingService.on('data', (deviceId, paramId, value) => {
      logService.info(`Device ${deviceId}, Parameter ${paramId}: ${value}`);
    });
    
    // Wait for a minute to see polling in action
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Stop polling
    pollingService.stopPolling(deviceId);
    logService.info('Stopped polling');
    
    // Disconnect
    await device.disconnect();
    logService.info('Disconnected from device');
  } catch (error) {
    logService.error(`Error: ${error}`);
  }
}

/**
 * Advanced usage example with Modbus RTU
 */
async function advancedRtuExample() {
  // Initialize the communication module with custom settings
  const { deviceManager, pollingService, logService, cacheService } = await initCommunicationModule();
  
  // Configure the module
  configManager.updateModbusConfig({
    timeout: 3000,
    maxRetries: 2
  });
  
  configManager.updatePollingConfig({
    adaptivePolling: true,
    defaultBatchSize: 5
  });
  
  // Create a Modbus RTU client
  const rtuClient = new ModbusRTUClient({
    path: '/dev/ttyUSB0',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    unitId: 1
  });
  
  // Create a device with more complex parameters
  const device = new ModbusDevice({
    id: 'rtu-device1',
    name: 'Flow Meter',
    client: rtuClient,
    parameters: [
      {
        id: 'flow_rate',
        name: 'Flow Rate',
        address: 100,
        registerType: RegisterType.HOLDING_REGISTER,
        dataType: DataType.FLOAT32,
        byteOrder: ByteOrder.CDAB, // Byte swapped
        scalingFactor: 1,
        unit: 'm³/h'
      },
      {
        id: 'total_flow',
        name: 'Total Flow',
        address: 102,
        registerType: RegisterType.HOLDING_REGISTER,
        dataType: DataType.UINT32,
        byteOrder: ByteOrder.CDAB,
        scalingFactor: 0.1,
        unit: 'm³'
      },
      {
        id: 'status_bits',
        name: 'Status Bits',
        address: 200,
        registerType: RegisterType.DISCRETE_INPUT,
        dataType: DataType.BOOLEAN,
        count: 8 // Read 8 bits
      }
    ]
  });
  
  // Register the device
  const deviceId = deviceManager.registerDevice(device);
  
  // Connect to the device with error handling
  try {
    logService.info('Connecting to RTU device...');
    await device.connect();
    logService.info('Connected to RTU device');
    
    // Read all parameters
    const values = await device.readAllParameters();
    logService.info('Parameter values:', values);
    
    // Register for polling events with advanced handling
    pollingService.on('data', (deviceId, paramId, value) => {
      // Cache additional calculated values
      if (paramId === 'flow_rate') {
        // Calculate daily flow based on hourly rate
        const dailyFlow = value * 24;
        cacheService.set(`${deviceId}_daily_flow`, dailyFlow);
        logService.info(`Calculated daily flow: ${dailyFlow} m³/day`);
      }
    });
    
    // Handle errors
    pollingService.on('error', (deviceId, error) => {
      logService.error(`Polling error for device ${deviceId}: ${error}`);
      
      // After 3 consecutive errors, try reconnecting
      let errorCount = cacheService.get(`${deviceId}_error_count`) || 0;
      errorCount++;
      
      cacheService.set(`${deviceId}_error_count`, errorCount);
      
      if (errorCount >= 3) {
        logService.warn(`Attempting to reconnect device ${deviceId} after ${errorCount} errors`);
        device.reconnect().catch(e => logService.error(`Reconnection failed: ${e}`));
        cacheService.set(`${deviceId}_error_count`, 0);
      }
    });
    
    // Start polling with specific parameters
    pollingService.startPolling(deviceId, 5000, ['flow_rate', 'total_flow']);
    logService.info('Started polling for specific parameters');
    
    // Wait to observe polling
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Add more parameters to polling
    pollingService.updatePollingParameters(deviceId, ['flow_rate', 'total_flow', 'status_bits']);
    logService.info('Updated polling parameters');
    
    // Wait to observe updated polling
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Stop polling
    pollingService.stopPolling(deviceId);
    
    // Disconnect
    await device.disconnect();
    logService.info('Disconnected from RTU device');
  } catch (error) {
    logService.error(`Error in RTU example: ${error}`);
  }
}

/**
 * Example using parameter groups for optimized reading
 */
async function parameterGroupExample() {
  // Initialize the module
  const { deviceManager, logService } = await initCommunicationModule();
  
  // Create a TCP client
  const tcpClient = new ModbusTCPClient({
    host: '192.168.1.100',
    port: 502,
    unitId: 1
  });
  
  // Create a device with parameter groups
  const device = new ModbusDevice({
    id: 'grouped-device',
    name: 'Power Meter',
    client: tcpClient,
    // Define parameter groups for optimized reading
    parameterGroups: [
      {
        id: 'voltage_group',
        name: 'Voltage Readings',
        parameters: [
          {
            id: 'voltage_l1',
            name: 'Voltage L1',
            address: 100,
            registerType: RegisterType.HOLDING_REGISTER,
            dataType: DataType.FLOAT32,
            byteOrder: ByteOrder.ABCD,
            unit: 'V'
          },
          {
            id: 'voltage_l2',
            name: 'Voltage L2',
            address: 102,
            registerType: RegisterType.HOLDING_REGISTER,
            dataType: DataType.FLOAT32,
            byteOrder: ByteOrder.ABCD,
            unit: 'V'
          },
          {
            id: 'voltage_l3',
            name: 'Voltage L3',
            address: 104,
            registerType: RegisterType.HOLDING_REGISTER,
            dataType: DataType.FLOAT32,
            byteOrder: ByteOrder.ABCD,
            unit: 'V'
          }
        ]
      },
      {
        id: 'current_group',
        name: 'Current Readings',
        parameters: [
          {
            id: 'current_l1',
            name: 'Current L1',
            address: 200,
            registerType: RegisterType.HOLDING_REGISTER,
            dataType: DataType.FLOAT32,
            byteOrder: ByteOrder.ABCD,
            unit: 'A'
          },
          {
            id: 'current_l2',
            name: 'Current L2',
            address: 202,
            registerType: RegisterType.HOLDING_REGISTER,
            dataType: DataType.FLOAT32,
            byteOrder: ByteOrder.ABCD,
            unit: 'A'
          },
          {
            id: 'current_l3',
            name: 'Current L3',
            address: 204,
            registerType: RegisterType.HOLDING_REGISTER,
            dataType: DataType.FLOAT32,
            byteOrder: ByteOrder.ABCD,
            unit: 'A'
          }
        ]
      }
    ]
  });
  
  // Register the device
  const deviceId = deviceManager.registerDevice(device);
  
  try {
    // Connect
    await device.connect();
    
    // Read a parameter group (more efficient than individual reads)
    const voltages = await device.readParameterGroup('voltage_group');
    logService.info('Voltage readings:', voltages);
    
    // Read multiple groups
    const readings = await device.readParameterGroups(['voltage_group', 'current_group']);
    logService.info('Power readings:', readings);
    
    // Calculate power for each phase
    const power = {
      l1: voltages.voltage_l1 * readings.current_group.current_l1,
      l2: voltages.voltage_l2 * readings.current_group.current_l2,
      l3: voltages.voltage_l3 * readings.current_group.current_l3
    };
    
    logService.info('Calculated power:', power);
    
    // Disconnect
    await device.disconnect();
  } catch (error) {
    logService.error(`Error in parameter group example: ${error}`);
  }
}

// Main function
async function main() {
  try {
    // Choose which example to run
    const example = process.argv[2] || 'basic';
    
    switch (example) {
      case 'basic':
        await basicExample();
        break;
      case 'rtu':
        await advancedRtuExample();
        break;
      case 'groups':
        await parameterGroupExample();
        break;
      default:
        console.log('Unknown example. Use: basic, rtu, or groups');
    }
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export examples for importing
export {
  basicExample,
  advancedRtuExample,
  parameterGroupExample
};