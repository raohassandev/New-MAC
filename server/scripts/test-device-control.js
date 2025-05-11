/**
 * Test script for device control endpoint
 * Usage: node test-device-control.js <deviceId>
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api'; // Update with your server URL
const deviceId = process.argv[2];

if (!deviceId) {
  console.error('Please provide a device ID as an argument');
  console.log('Usage: node test-device-control.js <deviceId>');
  process.exit(1);
}

// Sample control parameters - modify these based on your device
const controlParams = {
  parameters: [
    {
      name: 'Temperature Setpoint',
      registerIndex: 40001,
      value: 22.5,
      dataType: 'FLOAT32',
      byteOrder: 'ABCD'
    },
    {
      name: 'Mode',
      registerIndex: 40003,
      value: 1, // 0=Off, 1=Cool, 2=Heat, 3=Auto
      dataType: 'UINT16'
    },
    {
      name: 'Fan Speed',
      registerIndex: 40004,
      value: 50, // 0-100%
      dataType: 'UINT16'
    }
  ]
};

async function testDeviceControl() {
  try {
    console.log(`Testing device control for device ID: ${deviceId}`);
    console.log('Control parameters:', JSON.stringify(controlParams, null, 2));

    const response = await axios.post(
      `${BASE_URL}/devices/${deviceId}/control`,
      controlParams,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\nResponse:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\nError:');
    if (error.response) {
      // The request was made and the server responded with an error
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
  }
}

testDeviceControl();