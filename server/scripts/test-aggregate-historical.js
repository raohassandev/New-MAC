#!/usr/bin/env node

/**
 * Test script for the new aggregate historical data endpoint
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const API_BASE = 'http://localhost:5001/client/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWYxY2RkOTkzNzkxZjVmZjhlYjBhYyIsInVzZXJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3MzcwMzE5MDMsImV4cCI6MTczNzExODMwM30.e4MVD1lRnKpJOt6Gu1sGCXE9zCrlj7I1y2Dg5xRCJdg'; // Update with a valid token

// Test cases
const testCases = [
  {
    name: 'Daily average temperature',
    params: {
      parameterName: 'Temperature',
      aggregationType: 'average',
      groupBy: 'daily',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  },
  {
    name: 'Monthly total energy',
    params: {
      parameterName: 'Energy',
      aggregationType: 'sum',
      groupBy: 'monthly',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  },
  {
    name: 'Hourly max power',
    params: {
      parameterName: 'Power',
      aggregationType: 'max',
      groupBy: 'hourly',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  },
  {
    name: 'Weekly average humidity',
    params: {
      parameterName: 'Humidity',
      aggregationType: 'average',
      groupBy: 'weekly',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  },
  {
    name: 'Yearly count of status changes',
    params: {
      parameterName: 'Status',
      aggregationType: 'count',
      groupBy: 'yearly',
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  }
];

async function testAggregateEndpoint() {
  console.log(chalk.blue('\n=== Testing Aggregate Historical Data Endpoint ===\n'));
  
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  for (const testCase of testCases) {
    console.log(chalk.cyan(`\nTest: ${testCase.name}`));
    console.log(chalk.gray('Parameters:'), testCase.params);
    
    try {
      const url = `${API_BASE}/devices/data/historical/aggregate`;
      const response = await axios.get(url, {
        headers,
        params: testCase.params
      });
      
      if (response.data.success) {
        console.log(chalk.green('✓ Success'));
        console.log(chalk.gray('Summary:'));
        console.log(chalk.gray(`  - Total devices: ${response.data.summary.totalDevices}`));
        console.log(chalk.gray(`  - Total data points: ${response.data.summary.totalDataPoints}`));
        console.log(chalk.gray(`  - Date groups: ${response.data.summary.dateGroups}`));
        
        if (response.data.data && response.data.data.length > 0) {
          console.log(chalk.gray('\nFirst 3 results:'));
          response.data.data.slice(0, 3).forEach(item => {
            console.log(chalk.gray(`  - Date: ${item.date}, ${testCase.params.aggregationType}: ${item[testCase.params.aggregationType]}, Devices: ${item.deviceCount}`));
          });
        } else {
          console.log(chalk.yellow('No data found for this query'));
        }
      } else {
        console.log(chalk.red('✗ Request failed:'), response.data.message);
      }
    } catch (error) {
      console.log(chalk.red('✗ Error:'), error.response?.data?.message || error.message);
    }
  }
  
  // Test error case
  console.log(chalk.cyan('\n\nTest: Missing parameter'));
  try {
    const url = `${API_BASE}/devices/data/historical/aggregate`;
    const response = await axios.get(url, {
      headers,
      params: {
        aggregationType: 'average',
        groupBy: 'daily'
      }
    });
    
    console.log(chalk.red('✗ Should have failed but didn\'t'));
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(chalk.green('✓ Correctly returned 400 error:'), error.response.data.message);
    } else {
      console.log(chalk.red('✗ Unexpected error:'), error.message);
    }
  }
  
  console.log(chalk.blue('\n=== Test Complete ===\n'));
}

// Run the test
testAggregateEndpoint().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});