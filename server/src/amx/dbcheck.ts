import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectAmxToDB } from '../config/database';

// Load environment variables
dotenv.config();

async function checkDatabase() {
  try {
    console.log('Checking AMX database connection...');
    
    // Get MongoDB URI from environment or use default
    const AMX_MONGO_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log('Connecting to:', AMX_MONGO_URI);
    
    // Connect to MongoDB using centralized config
    const connection = await connectAmxToDB();
    console.log('Connected to AMX MongoDB!');
    console.log('Connection state:', connection.readyState);
    
    // List all collections
    const collections = await connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Check registered models
    const modelNames = connection.modelNames();
    console.log('Registered models:', modelNames);
    
    // Check for devicedrivers collection
    if (collections.some(c => c.name === 'devicedrivers')) {
      const drivers = await connection.db.collection('devicedrivers').find({}).toArray();
      console.log(`Found ${drivers.length} device drivers in AMX database:`);
      console.log(JSON.stringify(drivers.map(d => ({ _id: d._id, name: d.name })), null, 2));
    } else {
      console.log('No devicedrivers collection found');
    }
    
    // Check for devicetypes collection
    if (collections.some(c => c.name === 'devicetypes')) {
      const types = await connection.db.collection('devicetypes').find({}).toArray();
      console.log(`Found ${types.length} device types in AMX database:`);
      console.log(JSON.stringify(types.map(t => ({ _id: t._id, name: t.name })), null, 2));
    } else {
      console.log('No devicetypes collection found');
    }
    
    // Check for devices collection (not expected in AMX db, but checking anyway)
    if (collections.some(c => c.name === 'devices')) {
      const devices = await connection.db.collection('devices').find({}).toArray();
      console.log(`Found ${devices.length} devices in AMX database:`);
      console.log(JSON.stringify(devices.map(d => ({ _id: d._id, name: d.name })), null, 2));
    } else {
      console.log('No devices collection found in AMX database (expected)');
    }
    
    // Close the connection
    await connection.close();
    console.log('AMX database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the check
checkDatabase().then(() => {
  console.log('AMX database check complete');
  process.exit(0);
}).catch(err => {
  console.error('AMX database check failed:', err);
  process.exit(1);
});