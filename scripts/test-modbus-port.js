/**
 * Modbus Serial Port Test Script
 * This script tests if a serial port is available and can be opened
 */

const ModbusRTU = require('modbus-serial');
const { SerialPort } = require('serialport');

// Serial port to test
const SERIAL_PORT = '/dev/tty.usbserial-A50285BI';

// Test if the port exists first
async function checkPortExists() {
  console.log(`Checking if port ${SERIAL_PORT} exists...`);
  
  try {
    const ports = await SerialPort.list(); 
    console.log('Available ports:');
    ports.forEach((port, i) => {
      console.log(`${i+1}. ${port.path} - ${port.manufacturer || 'Unknown'}`);
    });
    
    const portExists = ports.some(port => port.path === SERIAL_PORT);
    if (portExists) {
      console.log(`✅ Port ${SERIAL_PORT} exists`);
      return true;
    } else {
      console.log(`❌ Port ${SERIAL_PORT} does not exist`);
      return false;
    }
  } catch (error) {
    console.error(`Error listing ports: ${error.message}`);
    return false;
  }
}

// Test if we can open the port directly with SerialPort
async function testDirectPortOpen() {
  console.log(`Testing direct port open on ${SERIAL_PORT}...`);
  
  return new Promise((resolve) => {
    try {
      const port = new SerialPort({
        path: SERIAL_PORT,
        baudRate: 9600,
        parity: 'none',
        dataBits: 8,
        stopBits: 1
      });
      
      // Add a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log(`⏱️ Timeout opening port directly`);
        try {
          port.close();
        } catch(e) {}
        resolve(false);
      }, 5000);
      
      port.on('open', () => {
        clearTimeout(timeout);
        console.log(`✅ Successfully opened port ${SERIAL_PORT} directly`);
        port.close();
        resolve(true);
      });
      
      port.on('error', (err) => {
        clearTimeout(timeout);
        console.error(`❌ Error opening port directly: ${err.message}`);
        resolve(false);
      });
    } catch (error) {
      console.error(`❌ Exception opening port directly: ${error.message}`);
      resolve(false);
    }
  });
}

// Test open with modbus-serial
async function testModbusSerialOpen() {
  console.log(`Testing modbus-serial connection on ${SERIAL_PORT}...`);
  
  const client = new ModbusRTU();
  client.on('error', (err) => {
    console.error(`Unhandled client error: ${err.message}`);
  });
  
  try {
    // Create a promise that resolves or rejects based on connection success
    const connectionPromise = client.connectRTUBuffered(SERIAL_PORT, { 
      baudRate: 9600,
      parity: 'none',
      dataBits: 8,
      stopBits: 1
    });
    
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    // Race the connection against the timeout
    await Promise.race([connectionPromise, timeoutPromise]);
    
    console.log(`✅ Successfully opened port ${SERIAL_PORT} with modbus-serial`);
    await client.close();
    return true;
  } catch (error) {
    console.error(`❌ Error opening port with modbus-serial: ${error.message}`);
    try {
      await client.close();
    } catch(e) {}
    return false;
  }
}

// Check port permissions
async function checkPortPermissions() {
  console.log(`Checking permissions for ${SERIAL_PORT}...`);
  
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec(`ls -l ${SERIAL_PORT}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error checking permissions: ${error.message}`);
        resolve(false);
        return;
      }
      
      console.log('Port permissions:');
      console.log(stdout);
      
      // On macOS, check if the user is in the dialout group
      if (process.platform === 'darwin') {
        exec('id', (err, out) => {
          if (err) {
            console.error(`Error checking groups: ${err.message}`);
          } else {
            console.log('User groups:');
            console.log(out);
          }
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  });
}

// Main function
async function main() {
  console.log('=== Modbus Serial Port Test ===');
  
  // Check if port exists
  const portExists = await checkPortExists();
  if (!portExists) {
    console.log(`The port ${SERIAL_PORT} was not found in the system.`);
    console.log('Please check:');
    console.log('1. If the device is connected properly');
    console.log('2. If you have the correct port name');
    console.log('3. If you need to install drivers for the USB-Serial adapter');
    return;
  }
  
  // Check permissions
  await checkPortPermissions();
  
  // Test direct port open
  const directOpenSuccess = await testDirectPortOpen();
  
  // Test modbus-serial open
  const modbusOpenSuccess = await testModbusSerialOpen();
  
  if (!directOpenSuccess && !modbusOpenSuccess) {
    console.log('\n=== Troubleshooting Suggestions ===');
    console.log('1. Check if any other application is using the port');
    console.log('2. Check if you have read/write permissions for the port');
    console.log('3. Try running the script with administrator/root privileges');
    console.log('4. On macOS, check System Preferences -> Security & Privacy for blocking notifications');
    console.log('5. Try unplugging and reconnecting the device');
    console.log('6. Verify that the device is properly powered');
  }
}

// Run main function
main().catch(console.error);