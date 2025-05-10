/**
 * Script to check for a specific device ID in MongoDB
 * Usage: node check-specific-device.js <deviceId>
 */
const mongoose = require('mongoose');
require('dotenv').config();

// Get the device ID from command line
const deviceId = process.argv[2];

if (!deviceId) {
  console.error('Please provide a device ID as a command line argument');
  console.error('Usage: node check-specific-device.js <deviceId>');
  process.exit(1);
}

// Get MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';

async function checkDevice(id) {
  console.log(`Checking for device with ID: ${id}`);
  
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB connected successfully`);
    
    // Check if ID is valid
    const isValidId = mongoose.Types.ObjectId.isValid(id);
    console.log(`Device ID is ${isValidId ? 'valid' : 'INVALID'} MongoDB ObjectId`);
    
    if (!isValidId) {
      console.log('WARNING: The provided ID is not a valid MongoDB ObjectId');
      console.log('This might be why the device is not being found in the database');
      console.log('Attempting to search anyway with string comparison...');
    }
    
    // Define simple device schema
    const deviceSchema = new mongoose.Schema({}, { strict: false });
    const Device = mongoose.model('Device', deviceSchema);
    
    // Try to find by ID
    const device = await Device.findById(id);
    
    if (device) {
      console.log(`SUCCESS: Device found with findById:`);
      console.log(JSON.stringify(device, null, 2));
    } else {
      console.log(`Device not found with findById`);
      
      // Try string _id search as fallback
      console.log('Trying string _id search...');
      const deviceByStringId = await Device.findOne({ _id: id });
      
      if (deviceByStringId) {
        console.log(`SUCCESS: Device found with string _id search:`);
        console.log(JSON.stringify(deviceByStringId, null, 2));
      } else {
        console.log(`Device not found with string _id search`);
        
        // Get some sample device IDs
        const devices = await Device.find().select('_id name').limit(5);
        console.log(`\nSample devices in the database:`);
        devices.forEach(d => {
          console.log(`- ${d._id}: ${d.name}`);
        });
        
        console.log('\nRecommended action: Use one of these IDs instead of the provided ID');
      }
    }
  } catch (err) {
    console.error(`Error:`, err);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the check
checkDevice(deviceId);