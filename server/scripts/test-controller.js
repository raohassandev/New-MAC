/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * A script to directly test the testDeviceConnection controller function
 *
 * To run: node scripts/test-controller.js <deviceId>
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Get the device ID from command line arguments
const deviceId = process.argv[2];

if (!deviceId) {
  console.error('Please provide a device ID as a command-line argument');
  console.error('Usage: node scripts/test-controller.js <deviceId>');
  process.exit(1);
}

async function testController() {
  try {
    // Connect to the MongoDB database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/client');
    console.log('Connected to MongoDB');

    // Dynamically import the controller to avoid transpiling issues
    const { testDeviceConnection } = require('../dist/client/controllers/deviceController');

    // Create mock request and response objects
    const req = {
      params: { id: deviceId },
      app: { locals: {} },
    };

    const res = {
      status: code => {
        console.log(`Response status: ${code}`);
        return res;
      },
      json: data => {
        console.log('Response data:');
        console.log(JSON.stringify(data, null, 2));
      },
    };

    // Call the controller function directly
    console.log(`Testing connection for device: ${deviceId}`);
    await testDeviceConnection(req, res);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

testController();
