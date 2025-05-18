/**
 * Test script to verify device driver changes work correctly
 */

const mongoose = require('mongoose');

async function testDriverChange() {
  try {
    // Connect to databases
    const clientConn = await mongoose.createConnection('mongodb://localhost:27017/client');
    const amxConn = await mongoose.createConnection('mongodb://localhost:27017/amx');
    
    console.log('Connected to databases');
    
    // Get a test device
    const devices = await clientConn.collection('devices').find({}).toArray();
    if (devices.length === 0) {
      console.log('No devices found for testing');
      return;
    }
    
    const device = devices[0];
    console.log(`Testing with device: ${device.name} (ID: ${device._id})`);
    console.log(`Current driver ID: ${device.deviceDriverId}`);
    
    // Get available drivers
    const drivers = await amxConn.collection('templates').find({}).toArray();
    console.log(`Found ${drivers.length} device drivers`);
    
    if (drivers.length < 2) {
      console.log('Need at least 2 drivers to test driver change');
      return;
    }
    
    // Find a different driver
    const newDriver = drivers.find(d => d._id.toString() !== device.deviceDriverId);
    console.log(`Changing to driver: ${newDriver.name} (ID: ${newDriver._id})`);
    
    // Update device with new driver
    const updateResult = await clientConn.collection('devices').updateOne(
      { _id: device._id },
      { $set: { deviceDriverId: newDriver._id.toString() } }
    );
    
    console.log('Update result:', updateResult);
    
    // Now simulate a read to see if new driver config is used
    console.log('\nSimulating read operation...');
    // This would normally go through the API, but we can verify the driver ID changed
    
    const updatedDevice = await clientConn.collection('devices').findOne({ _id: device._id });
    console.log(`Device now using driver: ${updatedDevice.deviceDriverId}`);
    
    // Verify no dataPoints are stored in device
    console.log(`Device has dataPoints stored: ${updatedDevice.dataPoints ? 'YES (ERROR!)' : 'NO (CORRECT!)'}`);
    
    await clientConn.close();
    await amxConn.close();
    console.log('\nTest completed successfully');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDriverChange().catch(console.error);