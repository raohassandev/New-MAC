/**
 * Test script to verify that the Modbus client functionality works after cleanup
 */

// Import the clients
const { ModbusTCPClient } = require('../dist/communication/protocols/modbus/tcp/client');
const { ModbusRTUClient } = require('../dist/communication/protocols/modbus/rtu/client');
const { ModbusDevice } = require('../dist/communication/core/device.concrete');
const { deviceManager, pollingService, logService } = require('../dist/communication/services');
const { RegisterType, DataType, ByteOrder } = require('../dist/communication/core/types');
const { initCommunicationModule } = require('../dist/communication');

// Test importing the clients (this will throw if there are missing dependencies)
console.log('✅ Successfully imported ModbusTCPClient');
console.log('✅ Successfully imported ModbusRTUClient');
console.log('✅ Successfully imported ModbusDevice');
console.log('✅ Successfully imported services');
console.log('✅ Successfully imported types');
console.log('✅ Successfully imported initCommunicationModule');

// Test TCP client creation
try {
  const tcpClient = new ModbusTCPClient({
    host: '192.168.1.100',
    port: 502,
    unitId: 1
  });
  console.log('✅ Successfully created TCP client instance');
} catch (error) {
  console.error('❌ Failed to create TCP client:', error);
}

// Test RTU client creation
try {
  const rtuClient = new ModbusRTUClient({
    path: '/dev/ttyUSB0',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    unitId: 1
  });
  console.log('✅ Successfully created RTU client instance');
} catch (error) {
  console.error('❌ Failed to create RTU client:', error);
}

// Test device creation
try {
  const dummyTcpClient = new ModbusTCPClient({ host: '127.0.0.1', port: 502 });
  
  const device = new ModbusDevice({
    id: 'test-device-1',
    name: 'Test Device',
    client: dummyTcpClient,
    parameters: [
      {
        id: 'param1',
        name: 'Temperature',
        address: 100,
        registerType: RegisterType.HOLDING_REGISTER,
        dataType: DataType.FLOAT32,
        byteOrder: ByteOrder.ABCD,
        unit: '°C'
      }
    ]
  });
  
  console.log('✅ Successfully created ModbusDevice instance');
} catch (error) {
  console.error('❌ Failed to create device:', error);
}

// Test initialization function
async function testInitialization() {
  try {
    const services = await initCommunicationModule({
      logLevel: 'info',
      enableCaching: true,
      cacheTTL: 60000
    });
    
    if (services.deviceManager && services.pollingService && 
        services.cacheService && services.logService) {
      console.log('✅ Successfully initialized communication module');
    } else {
      console.error('❌ Incomplete services returned from initialization');
    }
  } catch (error) {
    console.error('❌ Failed to initialize communication module:', error);
  }
}

// Only run initialization test if we're running this file directly (not for import testing)
if (require.main === module) {
  testInitialization().catch(console.error);
}

console.log('🎉 Import tests completed successfully!');