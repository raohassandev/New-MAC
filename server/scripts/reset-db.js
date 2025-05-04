/**
 * Script to reset the MongoDB database with initial data
 */
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB connection strings
const LIBRARY_DB_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';

// Initial device types data
const defaultDeviceTypes = [
  {
    name: 'Power Analyzer',
    description: 'For power monitoring devices',
    category: 'Power Monitoring',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: {
      userId: 'system',
      username: 'System',
      email: 'system@example.com',
    },
  },
  {
    name: 'Temperature Sensor',
    description: 'For temperature monitoring devices',
    category: 'Environmental Monitoring',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: {
      userId: 'system',
      username: 'System',
      email: 'system@example.com',
    },
  },
  {
    name: 'PLC',
    description: 'Programmable Logic Controllers',
    category: 'Industrial Automation',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: {
      userId: 'system',
      username: 'System',
      email: 'system@example.com',
    },
  },
];

async function resetLibraryDB() {
  console.log('Resetting AMX library database...');
  let client;

  try {
    client = await MongoClient.connect(LIBRARY_DB_URI);
    console.log('Connected to MongoDB library database');

    const db = client.db();
    
    // Drop all collections if they exist
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`Dropped collection: ${collection.name}`);
    }

    // Create collections and insert default data
    const deviceTypeCollection = db.collection('devicetypes');
    await deviceTypeCollection.insertMany(defaultDeviceTypes);
    console.log(`Inserted ${defaultDeviceTypes.length} default device types`);

    console.log('Library database reset complete');
  } catch (error) {
    console.error('Error resetting library database:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed');
    }
  }
}

// Run the reset function
(async () => {
  try {
    await resetLibraryDB();
    process.exit(0);
  } catch (error) {
    console.error('Error running reset script:', error);
    process.exit(1);
  }
})();