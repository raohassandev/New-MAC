/**
 * Database connection verification script
 * Checks if client database is properly connected and device models are working
 *
 * To run:
 * node scripts/verify-db-connection.js
 */

import { set, connect, connection, Schema, model, modelNames as _modelNames } from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

// Main function to check database connection
async function verifyDatabaseConnection() {
  try {
    console.log('Starting database connection verification...');

    // Get MongoDB URI from environment or use default
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log('Connecting to:', MONGO_URI);

    // Configure mongoose
    set('strictQuery', false);

    // Connect to MongoDB
    await connect(MONGO_URI);
    console.log('Connected to MongoDB!');
    console.log('Connection state:', connection.readyState);
    console.log('Database name:', connection.name);

    // List all collections
    const collections = await connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(c => console.log(`- ${c.name}`));

    // Check device collection
    let deviceCollection = collections.find(c =>
      ['devices', 'device', 'Devices', 'Device'].includes(c.name),
    );

    if (deviceCollection) {
      console.log(`\nFound device collection: ${deviceCollection.name}`);

      // Count documents in device collection
      const count = await connection.db.collection(deviceCollection.name).countDocuments();
      console.log(`Total devices in collection: ${count}`);

      // Check sample device
      if (count > 0) {
        const sampleDevice = await connection.db.collection(deviceCollection.name).findOne();
        console.log('\nSample device document structure:');
        console.log(
          JSON.stringify(
            {
              _id: sampleDevice._id,
              name: sampleDevice.name,
              connectionType:
                sampleDevice.connectionType ||
                (sampleDevice.connectionSetting
                  ? sampleDevice.connectionSetting.connectionType
                  : 'N/A'),
              hasDataPoints: sampleDevice.dataPoints
                ? `Yes (${sampleDevice.dataPoints.length})`
                : 'No',
              hasRegisters: sampleDevice.registers
                ? `Yes (${sampleDevice.registers.length})`
                : 'No',
            },
            null,
            2,
          ),
        );
      }
    } else {
      console.log('\nWARNING: No device collection found!');
    }

    // Try creating a Device model
    try {
      // Minimal schema for testing
      const DeviceSchema = new Schema({
        name: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        testField: { type: String, default: 'test-connection' },
      });

      // Create test model with timestamp
      const timestamp = Date.now();
      const TestDevice = model(`TestDevice_${timestamp}`, DeviceSchema);

      // Try creating a test document (without saving to verify schema)
      const testDoc = new TestDevice({ name: `Test Device ${timestamp}` });
      console.log('\nTest device model creation successful');
      console.log('Test document validation:', testDoc.validateSync() ? 'Failed' : 'Passed');

      // Display model information
      console.log('\nModel information:');
      console.log(`- Model name: ${TestDevice.modelName}`);
      console.log(`- Database: ${TestDevice.db.name}`);
      console.log(`- Collection: ${TestDevice.collection.name}`);
    } catch (modelError) {
      console.error('\nError creating test model:', modelError);
    }

    // Check for existing models
    const modelNames = _modelNames();
    console.log('\nRegistered models in Mongoose:');
    modelNames.forEach(name => console.log(`- ${name}`));

    console.log('\nDatabase connection verification complete!');
  } catch (error) {
    console.error('Error during database verification:', error);
  } finally {
    // Close the mongoose connection
    await connection.close();
    console.log('Database connection closed');
  }
}

// Run the verification
verifyDatabaseConnection()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
