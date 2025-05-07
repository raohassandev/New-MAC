/**
 * Modbus Helper Test Script
 * 
 * This script tests our modbusHelper implementation by using require-ts to directly run the TypeScript file.
 * It demonstrates the improved error handling and connection management features.
 * 
 * Install: npm install ts-node --save-dev
 * Usage: npx ts-node test-helper.js
 */

// Register require for TypeScript
require('ts-node').register({
  transpileOnly: true
});

// Import our custom modbus helper functions
const { 
  createModbusClient, 
  createModbusRTUClient, 
  connectRTUBuffered,
  safeCloseModbusClient,
  readHoldingRegistersWithTimeout,
  readInputRegistersWithTimeout,
  findRespondingDevice
} = require('./src/client/controllers/modbusHelper');

// Import chalk for colorful output
const chalk = require('chalk');

// Configuration
const SERIAL_PORT = '/dev/tty.usbserial-A50285BI'; // Change to your port
const DEVICE_IP = '192.168.1.100'; // Change to your IP
const DEVICE_PORT = 502;
const TIMEOUT = 3000;
const SLAVE_ID = 1;
const USE_RTU = true;

// Register addresses
const HOLDING_START = 4096;
const HOLDING_COUNT = 10;
const INPUT_START = 0;
const INPUT_COUNT = 10;

// Test holding and input registers
async function testCommunication() {
  console.log(chalk.blue('=== Modbus Helper Test ==='));
  
  let client = null;
  
  try {
    console.log(chalk.blue('Creating Modbus client...'));
    client = createModbusClient();
    
    if (USE_RTU) {
      // RTU Connection
      console.log(chalk.yellow(`Connecting to RTU device at ${SERIAL_PORT}...`));
      
      await connectRTUBuffered(client, SERIAL_PORT, {
        baudRate: 9600,
        parity: 'none',
        dataBits: 8,
        stopBits: 1,
        timeout: TIMEOUT,
        unitId: SLAVE_ID
      });
      
      console.log(chalk.green('✅ Connected to RTU device'));
      
      // Find responding device if slave ID not known
      if (!SLAVE_ID) {
        const foundId = await findRespondingDevice(client, '1-20');
        if (foundId) {
          console.log(chalk.green(`Found responding device with ID: ${foundId}`));
          client.setID(foundId);
        } else {
          console.log(chalk.red('No responding devices found'));
          await safeCloseModbusClient(client);
          process.exit(1);
        }
      }
    } else {
      // TCP Connection
      console.log(chalk.yellow(`Connecting to TCP device at ${DEVICE_IP}:${DEVICE_PORT}...`));
      await client.connectTCP(DEVICE_IP, { port: DEVICE_PORT });
      client.setTimeout(TIMEOUT);
      console.log(chalk.green('✅ Connected to TCP device'));
    }
    
    // Set slave ID
    client.setID(SLAVE_ID);
    
    // Test reading holding registers with timeout
    console.log(chalk.yellow(`Reading holding registers from address ${HOLDING_START}...`));
    try {
      const holdingResult = await readHoldingRegistersWithTimeout(
        client, 
        HOLDING_START, 
        HOLDING_COUNT, 
        TIMEOUT
      );
      
      console.log(chalk.green('✅ Holding registers read successful'));
      console.log(holdingResult.data);
      
      // Convert to hex for debugging
      const hexValues = holdingResult.data.map(val => 
        typeof val === 'number' ? val.toString(16).padStart(4, '0') : String(val)
      );
      console.log(`HEX: [${hexValues.join(', ')}]`);
    } catch (error) {
      console.error(chalk.red(`Error reading holding registers: ${error.message}`));
    }
    
    // Test reading input registers with timeout
    console.log(chalk.yellow(`Reading input registers from address ${INPUT_START}...`));
    try {
      const inputResult = await readInputRegistersWithTimeout(
        client, 
        INPUT_START, 
        INPUT_COUNT, 
        TIMEOUT
      );
      
      console.log(chalk.green('✅ Input registers read successful'));
      console.log(inputResult.data);
      
      // Convert to hex for debugging
      const hexValues = inputResult.data.map(val => 
        typeof val === 'number' ? val.toString(16).padStart(4, '0') : String(val)
      );
      console.log(`HEX: [${hexValues.join(', ')}]`);
    } catch (error) {
      console.error(chalk.red(`Error reading input registers: ${error.message}`));
    }
  } catch (error) {
    console.error(chalk.red(`Critical error: ${error.message}`));
  } finally {
    // Clean up
    if (client) {
      console.log(chalk.yellow('Closing Modbus connection...'));
      await safeCloseModbusClient(client);
      console.log(chalk.green('✅ Connection closed safely'));
    }
  }
}

// Connection shortcut test
async function testShortcutConnection() {
  console.log(chalk.blue('\n=== Testing Shortcut Connection Method ==='));
  
  let client = null;
  
  try {
    console.log(chalk.yellow(`Creating and connecting client in one step...`));
    
    // Use the shortcut function that combines creation and connection
    client = await createModbusRTUClient(SERIAL_PORT, {
      baudRate: 9600,
      parity: 'none',
      dataBits: 8,
      stopBits: 1,
      timeout: TIMEOUT,
      unitId: SLAVE_ID
    });
    
    console.log(chalk.green('✅ Client created and connected successfully'));
    
    // Set slave ID and read a register to verify it works
    client.setID(SLAVE_ID);
    
    try {
      const result = await readHoldingRegistersWithTimeout(
        client, 
        HOLDING_START, 
        1, 
        TIMEOUT
      );
      
      console.log(chalk.green(`✅ Verification read successful: ${result.data[0]}`));
    } catch (error) {
      console.error(chalk.red(`Verification read failed: ${error.message}`));
    }
  } catch (error) {
    console.error(chalk.red(`Connection failed: ${error.message}`));
  } finally {
    // Clean up
    if (client) {
      console.log(chalk.yellow('Closing Modbus connection...'));
      await safeCloseModbusClient(client);
      console.log(chalk.green('✅ Connection closed safely'));
    }
  }
}

// Run the tests
async function main() {
  try {
    await testCommunication();
    
    if (USE_RTU) {
      await testShortcutConnection();
    }
    
    console.log(chalk.green('\n🎉 All tests completed!'));
  } catch (error) {
    console.error(chalk.red(`Test failed: ${error.message}`));
  }
  
  process.exit(0);
}

main();