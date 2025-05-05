import mongoose from 'mongoose';
import { Device } from './models';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Get MongoDB URI from environment or use default
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log('Connecting to:', MONGO_URI);
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB!');
    console.log('Connection state:', mongoose.connection.readyState);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Check Device model is registered
    const modelNames = mongoose.modelNames();
    console.log('Registered models:', modelNames);
    
    // Try to find devices - check collection name
    let deviceCollection = 'devices';
    if (!collections.some(c => c.name === 'devices')) {
      // Try other possible collection names
      const possibleNames = ['device', 'Devices', 'Device'];
      for (const name of possibleNames) {
        if (collections.some(c => c.name === name)) {
          deviceCollection = name;
          console.log(`Found devices with collection name: ${name}`);
          break;
        }
      }
    }
    
    // Check for devices in the collection
    const rawDevices = await mongoose.connection.db.collection(deviceCollection).find({}).toArray();
    console.log(`Found ${rawDevices.length} devices directly from collection '${deviceCollection}':`);
    console.log(JSON.stringify(rawDevices.map(d => ({ _id: d._id, name: d.name })), null, 2));
    
    // Try using the model
    const modelDevices = await Device.find({}).lean();
    console.log(`Found ${modelDevices.length} devices using Mongoose model:`);
    console.log(JSON.stringify(modelDevices.map(d => ({ _id: d._id, name: d.name })), null, 2));
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the check
checkDatabase().then(() => {
  console.log('Database check complete');
  process.exit(0);
}).catch(err => {
  console.error('Database check failed:', err);
  process.exit(1);
});