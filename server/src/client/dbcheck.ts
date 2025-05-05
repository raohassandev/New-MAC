import mongoose from 'mongoose';
import { Device, createDeviceModel, clientModels, getClientDeviceModel, getClientDbConnection } from './models';
import dotenv from 'dotenv';
import { connectClientToDB } from './config/db'; 
import { ensureClientDeviceModel } from './utils/dbHelper';

// Load environment variables
dotenv.config();

async function checkDatabase() {
  let clientConnection: mongoose.Connection | null = null;
  
  try {
    console.log('========== DATABASE CONNECTION DIAGNOSTIC ==========');
    
    // Check default mongoose connection
    console.log('\n--- Default Mongoose Connection ---');
    if (mongoose.connection.readyState === 1) {
      console.log('Default mongoose connection is ACTIVE');
      console.log('Connected to database:', mongoose.connection.name);
      console.log('Models registered on default connection:', mongoose.modelNames());
    } else {
      console.log('Default mongoose connection is NOT ACTIVE (state:', mongoose.connection.readyState, ')');
    }
    
    // Connect to client database using our connectClientToDB function
    console.log('\n--- Client Database Connection ---');
    console.log('Connecting to client database using connectClientToDB()...');
    
    try {
      clientConnection = await connectClientToDB();
      console.log('✅ Successfully connected to client database!');
      console.log('Connection state:', clientConnection.readyState);
      console.log('Database name:', clientConnection.name);
      
      // Initialize client models
      console.log('\nInitializing client models with clientModels()...');
      const models = clientModels(clientConnection);
      console.log('✅ Client models initialized successfully');
      console.log('Available models:', Object.keys(models));
      
      // Check the Device model
      if (models.Device) {
        console.log('\n--- Device Model Check ---');
        console.log('Device model database:', models.Device.db?.name);
        console.log('Device model collection:', models.Device.collection.name);
        
        // Count devices using the model
        const deviceCount = await models.Device.countDocuments();
        console.log(`Found ${deviceCount} devices using the client Device model`);
        
        if (deviceCount > 0) {
          // Get a sample device
          const sampleDevice = await models.Device.findOne().lean();
          console.log('\nSample device:');
          console.log(`- ID: ${sampleDevice?._id}`);
          console.log(`- Name: ${sampleDevice?.name}`);
          console.log(`- Type: ${sampleDevice?.make} / ${sampleDevice?.model}`);
        }
      }
      
      // Check cached connection and model
      console.log('\n--- Cached Connection Check ---');
      const cachedConnection = getClientDbConnection();
      console.log('Cached client connection exists:', Boolean(cachedConnection));
      if (cachedConnection) {
        console.log('Cached connection state:', cachedConnection.readyState);
        console.log('Cached connection database:', cachedConnection.name);
      }
      
      const cachedModel = getClientDeviceModel();
      console.log('Cached device model exists:', Boolean(cachedModel));
      if (cachedModel) {
        console.log('Cached model database:', cachedModel.db?.name);
        console.log('Cached model collection:', cachedModel.collection.name);
      }
      
      // Test the helper function
      console.log('\n--- Testing dbHelper ---');
      const deviceModel = await ensureClientDeviceModel();
      if (deviceModel) {
        console.log('✅ ensureClientDeviceModel() returned a valid model');
        console.log('Model database:', deviceModel.db?.name);
        
        // Count devices using this model
        const count = await deviceModel.countDocuments();
        console.log(`Found ${count} devices using the model`);
      } else {
        console.log('❌ ensureClientDeviceModel() failed to return a valid model');
      }
      
      // Compare with raw database access
      console.log('\n--- Raw Collection Check ---');
      const collections = await clientConnection.db.listCollections().toArray();
      console.log('Collections in client database:', collections.map(c => c.name).join(', '));
      
      const rawDevices = await clientConnection.db.collection('devices').find({}).limit(5).toArray();
      console.log(`Found ${rawDevices.length} devices directly from 'devices' collection`);
      
      if (rawDevices.length > 0) {
        console.log('Sample devices from raw collection:');
        for (const device of rawDevices.slice(0, 3)) {
          console.log(`- ${device._id}: ${device.name} (${device.make || 'unknown'})`);
        }
      }
    } catch (connectionError) {
      console.error('❌ Error connecting to client database:', connectionError);
    }
    
    console.log('\n========== DIAGNOSTIC COMPLETE ==========');
  } catch (error) {
    console.error('Error during database check:', error);
  } finally {
    // Clean up connections
    try {
      if (clientConnection && clientConnection.readyState === 1) {
        await clientConnection.close();
        console.log('Client connection closed');
      }
      
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('Default mongoose connection closed');
      }
    } catch (closeError) {
      console.error('Error closing connections:', closeError);
    }
  }
}

// Run the check
checkDatabase().then(() => {
  console.log('Database diagnostics completed');
  process.exit(0);
}).catch(err => {
  console.error('Database diagnostics failed:', err);
  process.exit(1);
});