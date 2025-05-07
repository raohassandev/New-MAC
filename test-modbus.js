// Simple Modbus RTU test script with detailed logging
const ModbusRTU = require("modbus-serial");

// Create new client
const client = new ModbusRTU();

// Set up logging for all events
client.on("error", (err) => {
    console.error(`📛 Client error: ${err.message}`);
});

// Connection parameters
const PORT = '/dev/tty.usbserial-A50285BI';
const BAUD_RATE = 9600;
const PARITY = 'none';
const SLAVE_ID = 1; // We'll try multiple slave IDs
const INPUT_START = 0;
const INPUT_COUNT = 5; // Reduced count for faster tests

// Connect and test
async function testModbusConnection() {
    try {
        console.log(`🔄 Attempting to connect to ${PORT} with baud rate ${BAUD_RATE} and parity ${PARITY}...`);
        
        // Detailed connection log
        console.log(`📋 Connection parameters:
        - Port: ${PORT}
        - Baud Rate: ${BAUD_RATE}
        - Parity: ${PARITY}
        - Slave ID: ${SLAVE_ID}
        - Input Register Start: ${INPUT_START}
        - Input Register Count: ${INPUT_COUNT}`);
        
        // Try to connect with a timeout
        console.log("⏱️ Connecting with 5s timeout...");
        const connectionPromise = client.connectRTUBuffered(PORT, { 
            baudRate: BAUD_RATE, 
            parity: PARITY,
            dataBits: 8,
            stopBits: 1
        });
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Connection timeout after 5 seconds")), 5000);
        });
        
        // Race the connection against the timeout
        await Promise.race([connectionPromise, timeoutPromise]);
        
        console.log("✅ Connected successfully!");
        
        // Set timeout and slave ID
        client.setTimeout(2000);
        client.setID(SLAVE_ID);
        
        console.log(`🔍 Reading input registers from slave ID ${SLAVE_ID}...`);
        
        // Try to read input registers with timeout
        console.log("⏱️ Reading input registers with 3s timeout...");
        const readPromise = client.readInputRegisters(INPUT_START, INPUT_COUNT);
        
        // Create a timeout promise for reading
        const readTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Read timeout after 3 seconds")), 3000);
        });
        
        // Race the read against the timeout
        const data = await Promise.race([readPromise, readTimeoutPromise]);
        
        console.log("📊 Successfully read data:");
        console.log(data.data);
        
        // Convert to hex for easier inspection
        const hexValues = data.data.map(val =>
            typeof val === 'number' ? val.toString(16).padStart(4, '0') : 'non-numeric'
        );
        console.log(`   HEX: [${hexValues.join(', ')}]`);
        
        // Close connection
        await client.close();
        console.log("👋 Connection closed.");
        
    } catch (err) {
        console.error(`❌ ERROR: ${err.message}`);
        console.error("Stack trace:", err.stack);
        
        // Try to close the connection if it's open
        try {
            await client.close();
            console.log("👋 Connection closed after error.");
        } catch (closeErr) {
            console.error(`⚠️ Error closing connection: ${closeErr.message}`);
        }
    }
}

// Function to test multiple slave IDs
async function testMultipleSlaveIds() {
    const slaveIds = [1, 2, 3, 4, 5]; // Try a range of common slave IDs
    
    console.log(`🔄 Testing ${slaveIds.length} slave IDs: ${slaveIds.join(', ')}`);
    
    for (const slaveId of slaveIds) {
        console.log(`\n🔍 Testing slave ID: ${slaveId}`);
        
        try {
            // Create a fresh client for each test to avoid issues
            const testClient = new ModbusRTU();
            
            // Connect
            console.log(`⏱️ Connecting with timeout...`);
            const connectionPromise = testClient.connectRTUBuffered(PORT, { 
                baudRate: BAUD_RATE, 
                parity: PARITY,
                dataBits: 8,
                stopBits: 1
            });
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Connection timeout")), 3000);
            });
            
            await Promise.race([connectionPromise, timeoutPromise]);
            console.log(`✅ Connected successfully!`);
            
            // Set slave ID and timeout
            testClient.setTimeout(1000);
            testClient.setID(slaveId);
            
            // Try to read input registers
            try {
                console.log(`🔍 Reading input registers from slave ID ${slaveId}...`);
                const data = await testClient.readInputRegisters(INPUT_START, INPUT_COUNT);
                
                console.log(`✅ Slave ID ${slaveId} RESPONDED!`);
                console.log(`📊 Data:`, data.data);
                
                // Convert to hex for easier inspection
                const hexValues = data.data.map(val =>
                    typeof val === 'number' ? val.toString(16).padStart(4, '0') : 'non-numeric'
                );
                console.log(`   HEX: [${hexValues.join(', ')}]`);
                
                // Found a responding device, no need to continue
                await testClient.close();
                return { success: true, slaveId, data: data.data };
            } catch (readErr) {
                console.log(`❌ Read from slave ID ${slaveId} failed: ${readErr.message}`);
            }
            
            // Close connection
            await testClient.close();
        } catch (err) {
            console.error(`❌ Test for slave ID ${slaveId} failed: ${err.message}`);
        }
    }
    
    return { success: false };
}

// Run the test with multiple slave IDs
console.log("🔌 Starting Modbus RTU connection test with multiple slave IDs...");
testMultipleSlaveIds()
  .then(result => {
    if (result.success) {
      console.log(`\n✅ SUCCESS! Found responding device at slave ID ${result.slaveId}`);
      console.log(`📋 Use these parameters for your applications:`);
      console.log(`   - PORT: ${PORT}`);
      console.log(`   - BAUD_RATE: ${BAUD_RATE}`);
      console.log(`   - PARITY: ${PARITY}`);
      console.log(`   - SLAVE_ID: ${result.slaveId}`);
    } else {
      console.log(`\n❌ No responding Modbus RTU device found on port ${PORT}`);
      console.log(`📋 Troubleshooting tips:`);
      console.log(`   1. Check the device is powered on`);
      console.log(`   2. Verify wiring connections (especially TX/RX)`);
      console.log(`   3. Try different baud rates (common: 9600, 19200, 38400)`);
      console.log(`   4. Try different parity settings (none, even, odd)`);
      console.log(`   5. Ensure the port isn't in use by another application`);
    }
  })
  .catch(err => {
    console.error(`🔥 Test failed with error: ${err.message}`);
  });