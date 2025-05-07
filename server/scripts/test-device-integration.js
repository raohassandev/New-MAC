/**
 * Test script for the device backend integration
 * This script tests the CRUD operations for devices with the new model changes
 * 
 * To run:
 * node scripts/test-device-integration.js
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Set up API client
const API_URL = process.env.API_URL || 'http://localhost:3333';
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sample device for testing
const testDevice = {
  name: `Test Device ${Date.now()}`,
  description: 'Device created for testing the new form integration',
  enabled: true,
  make: 'Test Manufacturer',
  model: 'Test Model',
  connectionSetting: {
    connectionType: 'tcp',
    tcp: {
      ip: '192.168.1.100',
      port: 502,
      slaveId: 1
    }
  },
  // New fields
  deviceDriverId: '64e9b3a1e85f433a6cde5678', // This should be a valid device driver ID
  usage: 'energy_analysis',
  usageNotes: 'This is for testing the form integration',
  location: 'Test Location, Building 1',
  tags: ['test', 'integration', 'form']
};

// Function to get a demo token
const getDemoToken = () => {
  // Create a simple demo token format that our auth middleware will recognize
  // This is just for testing purposes
  return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlbW9fdXNlcl9pZCIsIm5hbWUiOiJEZW1vIFVzZXIiLCJlbWFpbCI6ImRlbW9AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2MzQ0MDc2MDAsImV4cCI6NDYzNDQwNzYwMH0.demo_signature';
};

// Set up the auth token
api.defaults.headers.common['Authorization'] = getDemoToken();

// Run the tests
const runTests = async () => {
  try {
    console.log('Starting device integration tests...');
    
    // Step 1: Create a device with the new fields
    console.log('\nTesting device creation...');
    const createdDevice = await api.post('/api/devices', testDevice);
    
    console.log('✓ Device created successfully');
    console.log('Device ID:', createdDevice.data._id);
    console.log('Device Name:', createdDevice.data.name);
    
    const deviceId = createdDevice.data._id;
    
    // Step 2: Get the device by ID
    console.log('\nTesting get device by ID...');
    const getResponse = await api.get(`/api/devices/${deviceId}`);
    
    console.log('✓ Device retrieved successfully');
    console.log('Device usage:', getResponse.data.usage);
    console.log('Device location:', getResponse.data.location);
    
    // Step 3: Update the device
    console.log('\nTesting device update...');
    const updateData = {
      usage: 'power_source',
      usageNotes: 'Updated notes for testing',
      location: 'Updated Test Location'
    };
    
    const updateResponse = await api.put(`/api/devices/${deviceId}`, updateData);
    
    console.log('✓ Device updated successfully');
    console.log('Updated usage:', updateResponse.data.usage);
    console.log('Updated location:', updateResponse.data.location);
    
    // Step 4: Get devices by device driver
    console.log('\nTesting get devices by device driver...');
    const driverResponse = await api.get(`/api/devices/by-driver/${testDevice.deviceDriverId}`);
    
    console.log('✓ Devices by device driver retrieved successfully');
    console.log('Number of devices with this driver:', driverResponse.data.devices.length);
    
    // Step 5: Get devices by usage category
    console.log('\nTesting get devices by usage category...');
    const usageResponse = await api.get(`/api/devices/by-usage/${updateData.usage}`);
    
    console.log('✓ Devices by usage category retrieved successfully');
    console.log('Number of devices with this usage:', usageResponse.data.devices.length);
    
    // Step 6: Delete the device
    console.log('\nTesting device deletion...');
    const deleteResponse = await api.delete(`/api/devices/${deviceId}`);
    
    console.log('✓ Device deleted successfully');
    console.log('Message:', deleteResponse.data.message);
    
    console.log('\nAll tests completed successfully! ✓');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  } finally {
    // Exit the process when done
    process.exit(0);
  }
};

// Run the tests
runTests();