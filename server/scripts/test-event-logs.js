const axios = require('axios');

const API_URL = 'http://localhost:3333/client/api';

async function testEventLogs() {
  try {
    console.log('Testing Event Log APIs...\n');

    // Test 1: Create an event log
    console.log('1. Creating event log...');
    const createResponse = await axios.post(`${API_URL}/monitoring/event-logs`, {
      type: 'info',
      message: 'Test event from test script',
      deviceId: 68275,
      deviceName: 'Test Device'
    });
    console.log('Event created:', createResponse.data.success);

    // Test 2: Get event logs
    console.log('\n2. Fetching event logs...');
    const getResponse = await axios.get(`${API_URL}/monitoring/event-logs?limit=5`);
    console.log(`Found ${getResponse.data.length} event logs`);
    
    if (getResponse.data.length > 0) {
      console.log('Latest event:', getResponse.data[0].message);
    }

    // Test 3: Get system stats
    console.log('\n3. Fetching system stats...');
    const statsResponse = await axios.get(`${API_URL}/monitoring/stats`);
    console.log('Event counts:', statsResponse.data.data.eventCounts);

    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testEventLogs();