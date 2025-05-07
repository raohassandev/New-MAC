// Test script for integrating with deviceController
const ModbusRTU = require("modbus-serial");
const { createModbusRTUClient, safeCloseModbusClient } = require('/Users/israrulhaq/Desktop/MAC/server/src/client/controllers/modbusHelper');

// Serial port settings
const PORT = '/dev/tty.usbserial-A50285BI';
const BAUD_RATE = 9600;
const PARITY = 'none';
const SLAVE_ID = 1;

// Function to directly test the modbusHelper functions
async function testModbusHelper() {
    console.log(`\n🔧 Testing modbusHelper functions...`);
    
    let client = null;
    
    try {
        // 1. Test creating a client using the helper function
        console.log(`🔄 Creating Modbus RTU client using helper function...`);
        client = await createModbusRTUClient(PORT, {
            baudRate: BAUD_RATE,
            parity: PARITY, 
            unitId: SLAVE_ID,
            timeout: 3000 // 3 second timeout
        });
        
        console.log(`✅ Successfully created and connected client!`);
        
        // 2. Try reading some registers
        console.log(`🔍 Reading holding registers...`);
        const holdingResult = await client.readHoldingRegisters(0, 5);
        console.log(`📊 Holding registers data:`, holdingResult.data);
        
        // 3. Try reading input registers
        console.log(`🔍 Reading input registers...`);
        const inputResult = await client.readInputRegisters(0, 5);
        console.log(`📊 Input registers data:`, inputResult.data);
        
        // 4. Test safely closing the client
        console.log(`🔌 Testing safeCloseModbusClient function...`);
        await safeCloseModbusClient(client);
        client = null; // Clear reference after closing
        
        console.log(`✅ Successfully closed client using helper function!`);
        
        return { success: true };
    } catch (error) {
        console.error(`❌ Error in modbusHelper test: ${error.message}`);
        
        // Try to safely close the client if it exists
        if (client) {
            console.log(`🚧 Attempting to clean up client after error...`);
            try {
                await safeCloseModbusClient(client);
                console.log(`✅ Successfully closed client after error`);
            } catch (closeError) {
                console.error(`⚠️ Error closing client: ${closeError.message}`);
            }
        }
        
        return { success: false, error };
    }
}

// Function to simulate how deviceController would create a device
async function simulateDeviceCreation() {
    console.log(`\n🔄 Simulating device creation process...`);
    
    // Create a mock device configuration (similar to what would be in the database)
    const mockDevice = {
        _id: "test-device-001",
        name: "Test Serial Device",
        connectionSetting: {
            connectionType: "rtu",
            rtu: {
                serialPort: PORT,
                baudRate: BAUD_RATE,
                parity: PARITY,
                dataBits: 8,
                stopBits: 1,
                slaveId: SLAVE_ID
            }
        },
        dataPoints: [
            {
                range: {
                    fc: 3, // Function code for holding registers
                    start: 0,
                    count: 5
                },
                parser: {
                    parameters: [
                        {
                            name: "Test Parameter 1",
                            registerIndex: 0,
                            dataType: "UINT16",
                            byteOrder: "AB",
                            description: "Test parameter 1"
                        }
                    ]
                }
            }
        ]
    };
    
    let client = null;
    
    try {
        // Extract connection parameters (similar to what happens in the controller)
        const { connectionSetting } = mockDevice;
        
        // Select serial port and other settings
        const serialPort = connectionSetting.rtu.serialPort;
        const baudRate = connectionSetting.rtu.baudRate;
        const parity = connectionSetting.rtu.parity;
        const slaveId = connectionSetting.rtu.slaveId;
        
        console.log(`🔌 Connecting to device with parameters:`);
        console.log(`   - Port: ${serialPort}`);
        console.log(`   - Baud: ${baudRate}`);
        console.log(`   - Parity: ${parity}`);
        console.log(`   - Slave ID: ${slaveId}`);
        
        // Create client (like in the controller)
        client = await createModbusRTUClient(serialPort, {
            baudRate,
            parity,
            dataBits: connectionSetting.rtu.dataBits || 8,
            stopBits: connectionSetting.rtu.stopBits || 1,
            unitId: slaveId,
            timeout: 2000
        });
        
        console.log(`✅ Connected successfully!`);
        
        // Test reading a register from the data point configuration
        const dataPoint = mockDevice.dataPoints[0];
        const startAddress = dataPoint.range.start;
        const count = dataPoint.range.count;
        
        console.log(`🔍 Reading ${count} registers from address ${startAddress}...`);
        
        // Determine which function to call based on the function code
        let data;
        switch (dataPoint.range.fc) {
            case 1: // Read Coils
                data = await client.readCoils(startAddress, count);
                break;
            case 2: // Read Discrete Inputs
                data = await client.readDiscreteInputs(startAddress, count);
                break;
            case 3: // Read Holding Registers
                data = await client.readHoldingRegisters(startAddress, count);
                break;
            case 4: // Read Input Registers
                data = await client.readInputRegisters(startAddress, count);
                break;
            default:
                throw new Error(`Unsupported function code: ${dataPoint.range.fc}`);
        }
        
        console.log(`📊 Data read successfully:`, data.data);
        
        // Close the client
        await safeCloseModbusClient(client);
        client = null;
        
        console.log(`✅ Device test completed successfully`);
        
        return { success: true, data: data.data };
    } catch (error) {
        console.error(`❌ Error in device simulation: ${error.message}`);
        
        // Try to safely close the client if it exists
        if (client) {
            console.log(`🚧 Attempting to clean up client after error...`);
            try {
                await safeCloseModbusClient(client);
                console.log(`✅ Successfully closed client after error`);
            } catch (closeError) {
                console.error(`⚠️ Error closing client: ${closeError.message}`);
            }
        }
        
        return { success: false, error };
    }
}

// Run the tests
async function runAllTests() {
    console.log(`🔌 Starting comprehensive Modbus RTU integration tests...`);
    
    // Test the modbusHelper functions
    const helperResult = await testModbusHelper();
    
    // Test the device creation simulation
    const deviceResult = await simulateDeviceCreation();
    
    // Summarize results
    console.log(`\n📋 TEST RESULTS SUMMARY:`);
    console.log(`   • Direct modbusHelper test: ${helperResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   • Device creation simulation: ${deviceResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (helperResult.success && deviceResult.success) {
        console.log(`\n🎉 ALL TESTS PASSED! The serial port is working correctly with the system.`);
        console.log(`   You can now use the device in your application with these parameters:`);
        console.log(`   - Port: ${PORT}`);
        console.log(`   - Baud Rate: ${BAUD_RATE}`);
        console.log(`   - Parity: ${PARITY}`);
        console.log(`   - Slave ID: ${SLAVE_ID}`);
    } else {
        console.log(`\n⚠️ SOME TESTS FAILED. Please check the error messages above.`);
        
        if (!helperResult.success) {
            console.log(`   Modbus helper issues might indicate problems with your modbusHelper.ts implementation.`);
        }
        
        if (!deviceResult.success) {
            console.log(`   Device creation issues might indicate problems with your device controller implementation.`);
        }
    }
}

// Execute all tests
runAllTests().catch(err => {
    console.error(`🔥 Unexpected error in test runner: ${err.message}`);
    console.error(err.stack);
});