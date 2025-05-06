/**
 * A simple script to test the device connection endpoint
 * 
 * To run: node scripts/test-connection.js <deviceId>
 */

const http = require('http');

// Get the device ID from command line arguments
const deviceId = process.argv[2];

if (!deviceId) {
  console.error('Please provide a device ID as a command-line argument');
  console.error('Usage: node scripts/test-connection.js <deviceId>');
  process.exit(1);
}

console.log(`Testing connection for device: ${deviceId}`);

// Set up the HTTP options
const options = {
  hostname: 'localhost',
  port: 3333, // Adjust if your server runs on a different port
  path: `/client/api/devices/${deviceId}/test`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Make a raw HTTP request without any dependencies
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE BODY:');
    try {
      // Try to parse as JSON and pretty print
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      // If not valid JSON, just print as is
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
});

// End the request
req.end();