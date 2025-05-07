// Direct Modbus RTU test script
const ModbusRTU = require("modbus-serial");

// Serial port settings
const PORT = '/dev/tty.usbserial-A50285BI';
const BAUD_RATE = 9600;
const PARITY = 'none';
const SLAVE_ID = 1;

// Test function
async function testDirectConnection() {
    const client = new ModbusRTU();
    
    try {
        // Set up error handler
        client.on('error', (err) => {
            console.error(`📛 Client error: ${err.message}`);
        });
        
        console.log(`🔄 Connecting to ${PORT} with baud rate ${BAUD_RATE} and parity ${PARITY}...`);
        
        // Connect with timeout
        const connectionPromise = client.connectRTUBuffered(PORT, {
            baudRate: BAUD_RATE,
            parity: PARITY,
            dataBits: 8,
            stopBits: 1
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Connection timeout after 5 seconds")), 5000);
        });
        
        await Promise.race([connectionPromise, timeoutPromise]);
        console.log(`✅ Connected successfully!`);
        
        // Set timeout and slave ID
        client.setTimeout(2000);
        client.setID(SLAVE_ID);
        
        // Test reading both types of registers
        console.log(`\n🔍 Testing register reads:`);
        
        // Read holding registers
        try {
            console.log(`   Reading holding registers (FC=3) at address 0...`);
            const holdingData = await client.readHoldingRegisters(0, 5);
            console.log(`   ✅ Holding registers data:`, holdingData.data);
            
            // Convert to hex for easier inspection
            const hexValues = holdingData.data.map(val =>
                typeof val === 'number' ? `0x${val.toString(16).padStart(4, '0')}` : 'non-numeric'
            );
            console.log(`   HEX: [${hexValues.join(', ')}]`);
        } catch (holdingErr) {
            console.log(`   ❌ Holding registers error: ${holdingErr.message}`);
        }
        
        // Read input registers
        try {
            console.log(`   Reading input registers (FC=4) at address 0...`);
            const inputData = await client.readInputRegisters(0, 5);
            console.log(`   ✅ Input registers data:`, inputData.data);
            
            // Convert to hex for easier inspection
            const hexValues = inputData.data.map(val =>
                typeof val === 'number' ? `0x${val.toString(16).padStart(4, '0')}` : 'non-numeric'
            );
            console.log(`   HEX: [${hexValues.join(', ')}]`);
        } catch (inputErr) {
            console.log(`   ❌ Input registers error: ${inputErr.message}`);
        }
        
        // Try different address ranges if available
        try {
            console.log(`   Reading holding registers at address 4096...`);
            const altData = await client.readHoldingRegisters(4096, 5);
            console.log(`   ✅ Alternate address data:`, altData.data);
        } catch (altErr) {
            console.log(`   ❌ Alternate address error: ${altErr.message}`);
        }
        
        // Close connection
        console.log(`\n👋 Closing connection...`);
        await client.close();
        console.log(`   Connection closed successfully.`);
        
        return true;
    } catch (err) {
        console.error(`\n❌ ERROR: ${err.message}`);
        
        // Try to close the connection if it's open
        try {
            await client.close();
            console.log(`   Connection closed after error.`);
        } catch (closeErr) {
            console.error(`   Error closing connection: ${closeErr.message}`);
        }
        
        return false;
    }
}

// Run the test
console.log(`🔌 Starting direct Modbus RTU test...`);
testDirectConnection()
    .then(success => {
        if (success) {
            console.log(`\n🎉 SUCCESS! The connection worked properly.`);
            console.log(`   Your device is accessible with these parameters:`);
            console.log(`   - Port: ${PORT}`);
            console.log(`   - Baud Rate: ${BAUD_RATE}`);
            console.log(`   - Parity: ${PARITY}`);
            console.log(`   - Slave ID: ${SLAVE_ID}`);
        } else {
            console.log(`\n❌ The test failed. Please check the error messages above.`);
        }
    })
    .catch(err => {
        console.error(`🔥 Unexpected error: ${err.message}`);
    });