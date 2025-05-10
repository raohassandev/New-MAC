/**
 * Script to check MongoDB connection and diagnose issues
 */
const mongoose = require('mongoose');
require('dotenv').config();

// Get MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';

// Helper function to print connection status
function getConnectionStatus(readyState) {
  switch (readyState) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

async function checkConnection() {
  try {
    console.log(`Attempting to connect to MongoDB at: ${MONGO_URI}`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB connected successfully`);
    console.log(`Connection status: ${getConnectionStatus(mongoose.connection.readyState)}`);
    console.log(`Database name: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
    console.log(`Port: ${mongoose.connection.port}`);
    
    // Check if we can access collections
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`\nCollections available in '${mongoose.connection.name}' database:`);
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
      
      // Check specifically for devices collection
      const deviceCollection = collections.find(c => c.name === 'devices');
      if (deviceCollection) {
        console.log(`\nFound 'devices' collection`);
        
        // Define simple device schema
        const deviceSchema = new mongoose.Schema({}, { strict: false });
        const Device = mongoose.model('Device', deviceSchema);
        
        // Count devices
        const count = await Device.countDocuments();
        console.log(`Total devices in collection: ${count}`);
        
        if (count > 0) {
          // Get sample devices
          const devices = await Device.find().select('_id name').limit(5);
          console.log(`\nSample devices:`);
          devices.forEach(device => {
            console.log(`- ${device._id}: ${device.name}`);
          });
          
          // Get IDs only
          console.log(`\nSample device IDs:`);
          devices.forEach(device => {
            console.log(`- ${device._id}`);
          });
        } else {
          console.log(`No devices found in collection`);
        }
      } else {
        console.log(`\nWARNING: 'devices' collection not found!`);
      }
    } catch (err) {
      console.error(`Error accessing collections:`, err);
    }
  } catch (err) {
    console.error(`MongoDB connection error:`, err);
  } finally {
    // Close the connection
    try {
      await mongoose.disconnect();
      console.log(`\nMongoDB disconnected`);
    } catch (err) {
      console.error(`Error disconnecting from MongoDB:`, err);
    }
    
    // Exit process
    process.exit(0);
  }
}

// Run the check
checkConnection();