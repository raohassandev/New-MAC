#!/usr/bin/env node

/**
 * Quick test for the aggregate historical data endpoint
 */

const http = require('http');

// Test configuration
const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/client/api/devices/data/historical/aggregate?parameterName=Temperature&aggregationType=average&groupBy=daily',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWYxY2RkOTkzNzkxZjVmZjhlYjBhYyIsInVzZXJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3MzcwMzE5MDMsImV4cCI6MTczNzExODMwM30.e4MVD1lRnKpJOt6Gu1sGCXE9zCrlj7I1y2Dg5xRCJdg'
  }
};

console.log('Testing aggregate endpoint...');
console.log(`URL: http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\nResponse:');
      console.log(JSON.stringify(response, null, 2));
    } catch (err) {
      console.log('\nRaw response:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();