/**
 * Script to test device retrieval from MongoDB
 * 
 * Usage: 
 * node check-device.js <deviceId>
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/client', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Define the Device schema
const deviceSchema = new mongoose.Schema({
  name: String,
  description: String,
  enabled: Boolean,
  // Add any other fields you need
}, { 
  strict: false  // Allow extra fields not defined in the schema
});

// Get the device by ID
async function getDevice(deviceId) {
  try {
    // Create the Device model
    const Device = mongoose.model('Device', deviceSchema);
    
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`Invalid device ID format: ${deviceId}`);
      return null;
    }

    // Get the device
    const device = await Device.findById(deviceId);
    return device;
  } catch (error) {
    console.error('Error getting device:', error);
    return null;
  }
}

// List all devices (sample)
async function listDevices() {
  try {
    // Create the Device model
    const Device = mongoose.model('Device', deviceSchema);
    
    // Count devices
    const count = await Device.countDocuments();
    console.log(`Total devices: ${count}`);
    
    // Get sample devices
    if (count > 0) {
      const devices = await Device.find().select('_id name').limit(5);
      console.log('Sample devices:');
      devices.forEach(device => {
        console.log(`- ${device._id}: ${device.name}`);
      });
    }
  } catch (error) {
    console.error('Error listing devices:', error);
  }
}

// Main function
async function main() {
  // Get device ID from command line
  const deviceId = process.argv[2];
  
  // Connect to MongoDB
  const connected = await connectToMongoDB();
  if (!connected) {
    process.exit(1);
  }
  
  // List devices
  await listDevices();
  
  // If a device ID was provided, get the device
  if (deviceId) {
    console.log(`\nLooking up device with ID: ${deviceId}`);
    const device = await getDevice(deviceId);
    
    if (device) {
      console.log(`Device found: ${device.name}`);
      console.log('Device details:', JSON.stringify(device, null, 2));
    } else {
      console.log(`No device found with ID: ${deviceId}`);
    }
  }
  
  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

// Run the main function
main().catch(error => {
  console.error('Error in main function:', error);
  process.exit(1);
});