// Modbus serial port test with advanced port locking resolution
const ModbusRTU = require("modbus-serial");
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Serial port settings
const PORT = '/dev/tty.usbserial-A50285BI';
const BAUD_RATE = 9600;
const PARITY = 'none';
const SLAVE_ID = 1;

// Force close any processes using the port
async function forceClosePort(port) {
    console.log(`🔍 Checking if port ${port} is in use...`);
    
    try {
        // Find processes using the port
        const { stdout: lsofOutput } = await execAsync(`lsof | grep ${port.split('/').pop()}`);
        
        if (lsofOutput) {
            console.log(`⚠️ Port ${port} is in use by other processes:`);
            console.log(lsofOutput);
            
            // Extract PIDs from lsof output
            const pidRegex = /\s+(\d+)\s+/;
            const lines = lsofOutput.split('\n').filter(line => line.trim() !== '');
            const pids = [];
            
            for (const line of lines) {
                const match = line.match(pidRegex);
                if (match && match[1]) {
                    pids.push(match[1]);
                }
            }
            
            if (pids.length > 0) {
                console.log(`🛑 Found ${pids.length} processes using the port. PIDs: ${pids.join(', ')}`);
                
                // Kill each process (not auto-killing - print commands)
                console.log(`⚠️ To kill these processes, you can run the following commands:`);
                for (const pid of pids) {
                    console.log(`   kill ${pid}`);
                }
                
                return {
                    inUse: true,
                    pids
                };
            }
        } else {
            console.log(`✅ Port ${port} is not in use by any process.`);
        }
        
        return { inUse: false };
    } catch (error) {
        console.log(`❓ Could not check port status: ${error.message}`);
        return { inUse: false, error };
    }
}

// Test connecting to the Modbus device
async function testSerialConnection() {
    const client = new ModbusRTU();
    
    try {
        console.log(`\n📊 Testing Modbus RTU connection:`);
        console.log(`   - Port: ${PORT}`);
        console.log(`   - Baud Rate: ${BAUD_RATE}`);
        console.log(`   - Parity: ${PARITY}`);
        console.log(`   - Slave ID: ${SLAVE_ID}\n`);
        
        // First check if the port is free
        const portStatus = await forceClosePort(PORT);
        
        if (portStatus.inUse) {
            console.log(`⚠️ Port ${PORT} is locked by other processes. Please free the port first.`);
            return { success: false, reason: 'port_in_use', pids: portStatus.pids };
        }
        
        // Connect with timeout
        console.log(`🔄 Connecting to ${PORT}...`);
        
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
        client.setTimeout(1000);
        client.setID(SLAVE_ID);
        
        // Try to read registers
        console.log(`🔍 Reading registers from slave ID ${SLAVE_ID}...`);
        
        // Try both holding and input registers
        try {
            console.log(`   Testing holding registers...`);
            const holdingData = await client.readHoldingRegisters(0, 5);
            console.log(`   ✅ Holding registers data:`, holdingData.data);
        } catch (holdingErr) {
            console.log(`   ❌ Holding registers error: ${holdingErr.message}`);
        }
        
        try {
            console.log(`   Testing input registers...`);
            const inputData = await client.readInputRegisters(0, 5);
            console.log(`   ✅ Input registers data:`, inputData.data);
        } catch (inputErr) {
            console.log(`   ❌ Input registers error: ${inputErr.message}`);
        }
        
        // Check internal socket/port state
        console.log(`\n🧪 Internal client state check:`);
        try {
            const isOpenMethod = typeof client.isOpen === 'boolean';
            console.log(`   - client.isOpen property exists: ${isOpenMethod}`);
            if (isOpenMethod) {
                console.log(`   - client.isOpen value: ${client.isOpen}`);
            }
            
            // Analyze internal _port object
            const portInfo = client._port;
            if (portInfo) {
                console.log(`   - Internal port info:`);
                console.log(`     - Port open: ${portInfo.isOpen}`);
                console.log(`     - Port path: ${portInfo.path}`);
            } else {
                console.log(`   - No internal port info available`);
            }
        } catch (stateErr) {
            console.log(`   ❌ Error checking client state: ${stateErr.message}`);
        }
        
        // Close connection
        await client.close();
        console.log(`👋 Connection closed successfully.`);
        
        return { success: true };
    } catch (err) {
        console.error(`❌ Connection ERROR: ${err.message}`);
        
        // Check if it's a port locking issue
        if (err.message.includes('Cannot lock port') || 
            err.message.includes('Resource temporarily unavailable')) {
            console.log(`\n⚠️ Port locking issue detected. The port is likely in use by another process.`);
            
            // Get more information about the port usage
            const portStatus = await forceClosePort(PORT);
            
            return { 
                success: false, 
                reason: 'port_locked',
                error: err,
                pids: portStatus.pids || []
            };
        }
        
        // Try to close the client in case it's partially open
        try {
            await client.close();
            console.log(`👋 Connection closed after error.`);
        } catch (closeErr) {
            console.error(`⚠️ Error closing connection: ${closeErr.message}`);
        }
        
        return { success: false, error: err };
    }
}

// Run the test
console.log(`🔌 Starting Modbus RTU port verification tool...`);
testSerialConnection()
    .then(result => {
        if (result.success) {
            console.log(`\n✅ SUCCESS! The serial port ${PORT} is accessible and working.`);
        } else if (result.reason === 'port_in_use' || result.reason === 'port_locked') {
            console.log(`\n⚠️ The serial port ${PORT} is currently locked by another process.`);
            if (result.pids && result.pids.length > 0) {
                console.log(`   To resolve this issue, try the following:`);
                console.log(`   1. Stop any other applications that might be using the port`);
                console.log(`   2. Run these commands to kill the processes using the port:`);
                for (const pid of result.pids) {
                    console.log(`      kill ${pid}`);
                }
                console.log(`   3. Run this script again after processes are terminated`);
            }
        } else {
            console.log(`\n❌ Failed to connect to the serial port ${PORT}.`);
            console.log(`   Troubleshooting tips:`);
            console.log(`   1. Verify the device is powered on`);
            console.log(`   2. Check physical connections (cable, USB port)`);
            console.log(`   3. Try a different baud rate (common: 9600, 19200)`);
            console.log(`   4. Try a different parity setting (none, even, odd)`);
            console.log(`   5. Make sure no other applications are using the port`);
        }
    })
    .catch(err => {
        console.error(`🔥 Script failed with error: ${err.message}`);
    });