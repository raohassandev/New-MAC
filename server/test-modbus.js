/**
 * Modbus Test Script
 *
 * This script tests both RTU and TCP Modbus connections using the modbus-serial library.
 * It automatically scans for devices with different baud rates, parities, and slave IDs.
 *
 * Usage: node test-modbus.js
 */

const ModbusRTU = require('modbus-serial');
const client = new ModbusRTU();

client.on('error', err => {
  console.error(`💥 Unhandled client error: ${err.message}`);
});

// === Configuration ===
// Set your serial port path here (use "" for empty to test TCP mode)
const SERIAL_PORT = '/dev/tty.usbserial-A50285BI'; // Change this to your actual port
const DEVICE_IP = '192.168.1.100'; // Change this to your device IP if using TCP
const DEVICE_PORT = 502; // Standard Modbus TCP port

// Mode selection (set one to true)
const USE_RTU = true; // Set to true to use RTU mode
const USE_TCP = !USE_RTU; // Will be false if RTU is true

const TIMEOUT = 1000; // Wait for response from device
const POLL_INTERVAL = 1000; // Inter-call delay

// RTU Scan parameters
const BAUD_RATES = [9600]; // 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200
const PARITIES = ['none', 'even', 'odd']; // "none", "even", "odd"
const SLAVE_RANGES = ['1-50']; // Slave ID ranges to try

// Register addresses to read
const HOLDING_START = 4096;
const HOLDING_COUNT = 10;
const INPUT_START = 0;
const INPUT_COUNT = 10;

// Register types to test
const TEST_HOLDING_REGISTERS = true;
const TEST_INPUT_REGISTERS = true;

let successSlaveId = null;
let connectionParams = {
  baudRate: null,
  parity: null,
};

// === Utility Functions ===
const expandRanges = ranges => {
  const ids = new Set();
  for (const range of ranges) {
    const parts = range.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      for (let i = start; i <= end; i++) {
        ids.add(i);
      }
    } else {
      ids.add(parseInt(parts[0], 10));
    }
  }
  return Array.from(ids);
};

// === RTU Connection Functions ===
const connectRTU = async (baudRate, parity) => {
  console.warn(`🔌 Trying RTU: Baud=${baudRate}, Parity=${parity}`);
  try {
    await client.connectRTUBuffered(SERIAL_PORT, { baudRate, parity });
    client.setTimeout(TIMEOUT);
    console.log(`✅ Connected on Baud=${baudRate}, Parity=${parity}`);
    connectionParams.baudRate = baudRate;
    connectionParams.parity = parity;
    return true;
  } catch (err) {
    console.error(`❌ Connection failed → ${err.message}`);
    return false;
  }
};

// === TCP Connection Function ===
const connectTCP = async () => {
  console.warn(`🔌 Trying TCP: IP=${DEVICE_IP}, Port=${DEVICE_PORT}`);
  try {
    await client.connectTCP(DEVICE_IP, { port: DEVICE_PORT });
    client.setTimeout(TIMEOUT);
    console.log(`✅ Connected to TCP device at ${DEVICE_IP}:${DEVICE_PORT}`);
    return true;
  } catch (err) {
    console.error(`❌ TCP Connection failed → ${err.message}`);
    return false;
  }
};

// === Device Discovery ===
const findFirstRespondingSlave = async slaveIds => {
  for (const id of slaveIds) {
    client.setID(id);

    // Try reading holding registers if enabled
    if (TEST_HOLDING_REGISTERS) {
      try {
        await client.readHoldingRegisters(HOLDING_START, HOLDING_COUNT);
        console.log(`🟢 Holding registers respond: Slave ID=${id}`);
        successSlaveId = id;
        return id;
      } catch (err) {
        console.log(`🔴 No holding response: Slave ID=${id}`);
      }
    }

    // Try reading input registers if enabled
    if (TEST_INPUT_REGISTERS) {
      try {
        const input = await client.readInputRegisters(INPUT_START, INPUT_COUNT);
        console.log(`🟢 Input registers respond: Slave ID=${id}`);
        successSlaveId = id;
        return id;
      } catch (err) {
        console.log(`🔴 No input response: Slave ID=${id}`);
      }
    }
  }
  return null;
};

// === Continuous Data Polling ===
const startContinuousReading = slaveId => {
  client.setID(slaveId);
  console.log(`🔁 Polling device ID=${slaveId} every ${POLL_INTERVAL / 1000}s...`);
  console.log(
    `   Connection details: ${
      USE_RTU
        ? `RTU, Baud=${connectionParams.baudRate}, Parity=${connectionParams.parity}`
        : `TCP, IP=${DEVICE_IP}:${DEVICE_PORT}`
    }`,
  );

  const interval = setInterval(async () => {
    // Read holding registers if enabled
    if (TEST_HOLDING_REGISTERS) {
      try {
        const holding = await client.readHoldingRegisters(HOLDING_START, HOLDING_COUNT);
        console.log(`📘 ID=${slaveId} Holding [${HOLDING_START}]:`, holding.data);

        // Convert to hex for easier inspection
        const hexValues = holding.data.map(val =>
          typeof val === 'number' ? val.toString(16).padStart(4, '0') : 'non-numeric',
        );
        console.log(`   HEX: [${hexValues.join(', ')}]`);
      } catch (err) {
        console.error(`⚠️ Holding Error (ID=${slaveId}): ${err.message}`);
      }
    }

    // Read input registers if enabled
    if (TEST_INPUT_REGISTERS) {
      try {
        const input = await client.readInputRegisters(INPUT_START, INPUT_COUNT);
        console.log(`📗 ID=${slaveId} Input [${INPUT_START}]:`, input.data);

        // Convert to hex for easier inspection
        const hexValues = input.data.map(val =>
          typeof val === 'number' ? val.toString(16).padStart(4, '0') : 'non-numeric',
        );
        console.log(`   HEX: [${hexValues.join(', ')}]`);
      } catch (err) {
        console.error(`⚠️ Input Error (ID=${slaveId}): ${err.message}`);
      }
    }
  }, POLL_INTERVAL);

  // Gracefully exit on Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n👋 Exiting...');
    clearInterval(interval);
    try {
      await client.close();
      console.log('✅ Connection closed successfully');
    } catch (e) {
      console.error('⚠️ Port close error:', e.message);
    }
    process.exit();
  });
};

// === Main Execution ===
(async () => {
  console.log('=== Modbus Test Script ===');
  console.log(USE_RTU ? 'Mode: RTU (Serial)' : 'Mode: TCP');

  let connected = false;

  if (USE_TCP) {
    // For TCP mode, just try connecting directly
    connected = await connectTCP();

    if (connected) {
      // Try finding a responding slave ID
      const slaveIds = expandRanges(SLAVE_RANGES);
      const slaveId = await findFirstRespondingSlave(slaveIds);

      if (slaveId !== null) {
        startContinuousReading(slaveId);
        return; // Success! Now polling
      } else {
        console.log('🔍 No Modbus TCP devices responded to the given slave IDs.');
        await client.close().catch(() => {});
      }
    }
  } else if (USE_RTU) {
    // For RTU mode, try combinations of baud rate and parity
    const slaveIds = expandRanges(SLAVE_RANGES);

    for (const baudRate of BAUD_RATES) {
      for (const parity of PARITIES) {
        try {
          connected = await connectRTU(baudRate, parity);
          if (!connected) continue;

          const slaveId = await findFirstRespondingSlave(slaveIds);
          if (slaveId !== null) {
            startContinuousReading(slaveId);
            return; // Success! Now polling
          }

          // Close connection and try next parameters
          await client.close().catch(() => {});
          await new Promise(res => setTimeout(res, 300)); // short wait
        } catch (err) {
          console.error('❗ Critical Error:', err.message);
          await client.close().catch(() => {});
        }
      }
    }
  }

  // If we reach here, no devices were found
  console.log('🔍 No responding Modbus devices were found.');
  process.exit(0);
})();
