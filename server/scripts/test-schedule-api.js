#!/usr/bin/env node

/**
 * Test script for the Schedule Management API
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const API_BASE = 'http://localhost:5001/client/api';
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

// Sample data
const sampleTemplate = {
  name: 'Test Office Hours',
  description: 'Test template for office hours',
  type: 'daily',
  rules: [
    {
      startTime: '06:00',
      endTime: '18:00',
      setpoint: 20,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      enabled: true,
      parameter: 'Temperature',
      registerAddress: 40001,
      returnToDefault: true,
      defaultSetpoint: 18
    },
    {
      startTime: '08:00',
      endTime: '22:00',
      setpoint: 22,
      days: ['Sat', 'Sun'],
      enabled: true,
      parameter: 'Temperature',
      registerAddress: 40001,
      returnToDefault: true,
      defaultSetpoint: 18
    }
  ],
  isPublic: false
};

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testScheduleAPI() {
  console.log(chalk.blue('\n=== Testing Schedule Management API ===\n'));
  
  let templateId;
  let deviceId = '6821fe542af1d1a3177c7fe1'; // Replace with actual device ID
  
  try {
    // 1. Create a schedule template
    console.log(chalk.cyan('1. Creating schedule template...'));
    const createResponse = await axios.post(`${API_BASE}/schedules/templates`, sampleTemplate, { headers });
    
    if (createResponse.data.success) {
      templateId = createResponse.data.template._id;
      console.log(chalk.green('✓ Template created successfully'));
      console.log(chalk.gray(`  Template ID: ${templateId}`));
    }
    
    // 2. Get all templates
    console.log(chalk.cyan('\n2. Getting all schedule templates...'));
    const getTemplatesResponse = await axios.get(`${API_BASE}/schedules/templates`, { headers });
    
    if (getTemplatesResponse.data.success) {
      console.log(chalk.green('✓ Templates retrieved successfully'));
      console.log(chalk.gray(`  Total templates: ${getTemplatesResponse.data.count}`));
    }
    
    // 3. Get template by ID
    console.log(chalk.cyan('\n3. Getting template by ID...'));
    const getTemplateResponse = await axios.get(`${API_BASE}/schedules/templates/${templateId}`, { headers });
    
    if (getTemplateResponse.data.success) {
      console.log(chalk.green('✓ Template retrieved successfully'));
      console.log(chalk.gray(`  Template name: ${getTemplateResponse.data.template.name}`));
    }
    
    // 4. Apply template to device
    console.log(chalk.cyan('\n4. Applying template to device...'));
    const applyData = {
      templateId: templateId,
      customRules: [
        {
          startTime: '20:00',
          endTime: '06:00',
          setpoint: 16,
          days: ['All'],
          enabled: true,
          parameter: 'Temperature',
          registerAddress: 40001,
          returnToDefault: false
        }
      ],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    const applyResponse = await axios.post(`${API_BASE}/schedules/devices/${deviceId}/apply`, applyData, { headers });
    
    if (applyResponse.data.success) {
      console.log(chalk.green('✓ Template applied to device successfully'));
    }
    
    // 5. Get device schedule
    console.log(chalk.cyan('\n5. Getting device schedule...'));
    const getScheduleResponse = await axios.get(`${API_BASE}/schedules/devices/${deviceId}`, { headers });
    
    if (getScheduleResponse.data.success) {
      console.log(chalk.green('✓ Device schedule retrieved successfully'));
      console.log(chalk.gray(`  Active: ${getScheduleResponse.data.schedule.active}`));
    }
    
    // 6. Update device schedule
    console.log(chalk.cyan('\n6. Updating device schedule...'));
    const updateData = {
      active: false,
      customRules: []
    };
    
    const updateResponse = await axios.put(`${API_BASE}/schedules/devices/${deviceId}`, updateData, { headers });
    
    if (updateResponse.data.success) {
      console.log(chalk.green('✓ Device schedule updated successfully'));
    }
    
    // 7. Get devices using template
    console.log(chalk.cyan('\n7. Getting devices using template...'));
    const devicesResponse = await axios.get(`${API_BASE}/schedules/templates/${templateId}/devices`, { headers });
    
    if (devicesResponse.data.success) {
      console.log(chalk.green('✓ Devices retrieved successfully'));
      console.log(chalk.gray(`  Device count: ${devicesResponse.data.count}`));
    }
    
    // 8. Delete template
    console.log(chalk.cyan('\n8. Deleting template...'));
    const deleteResponse = await axios.delete(`${API_BASE}/schedules/templates/${templateId}`, { headers });
    
    if (deleteResponse.data.success) {
      console.log(chalk.green('✓ Template deleted successfully'));
    }
    
  } catch (error) {
    console.log(chalk.red('\n✗ Error:'), error.response?.data?.message || error.message);
    console.log(chalk.gray('Error details:'), error.response?.data || error.message);
  }
  
  console.log(chalk.blue('\n=== Test Complete ===\n'));
}

// Run the test
testScheduleAPI().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});