/**
 * Script to check collections in both databases and fix if needed
 */
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

// MongoDB connection strings
const CLIENT_DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
const LIBRARY_DB_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';

async function checkCollections() {
  console.log('========== DATABASE COLLECTION CHECK ==========');
  let clientConnection;
  let amxConnection;

  try {
    // Connect to both databases
    clientConnection = await MongoClient.connect(CLIENT_DB_URI);
    amxConnection = await MongoClient.connect(LIBRARY_DB_URI);

    console.log(`Connected to client database: ${CLIENT_DB_URI}`);
    console.log(`Connected to AMX database: ${LIBRARY_DB_URI}`);

    const clientDb = clientConnection.db();
    const amxDb = amxConnection.db();

    // Get collections from both databases
    const clientCollections = await clientDb.listCollections().toArray();
    const amxCollections = await amxDb.listCollections().toArray();

    console.log('\n===== CLIENT DATABASE COLLECTIONS =====');
    console.log(clientCollections.map(c => c.name).join(', '));

    console.log('\n===== AMX DATABASE COLLECTIONS =====');
    console.log(amxCollections.map(c => c.name).join(', '));

    // Check if devicetypes exists in client database (should not)
    const deviceTypesInClient = clientCollections.some(c => c.name === 'devicetypes');
    const devicedriverInClient = clientCollections.some(c => c.name === 'devicedriver');

    if (deviceTypesInClient || devicedriverInClient) {
      console.log(
        '\n⚠️  ISSUE DETECTED: devicetypes or devicedriver collection exists in client database',
      );
      console.log('This is incorrect - these collections should only exist in the AMX database');
      console.log('Run the fix-db script to migrate these collections to the correct database');
    } else {
      console.log(
        '\n✅ No devicetypes or devicedriver collections found in client database - Good!',
      );
    }

    // Check if collections exist in AMX database (should)
    const deviceTypesInAmx = amxCollections.some(c => c.name === 'devicetypes');
    const devicedriverInAmx = amxCollections.some(c => c.name === 'devicedriver');

    if (!deviceTypesInAmx) {
      console.log('\n⚠️  devicetypes collection not found in AMX database');
      console.log('This collection should exist in the AMX database');
    }

    if (!devicedriverInAmx) {
      console.log('\n⚠️  devicedriver collection not found in AMX database');
      console.log('This collection should exist in the AMX database');
    }

    if (deviceTypesInAmx && devicedriverInAmx) {
      console.log('\n✅ Found devicetypes and devicedriver collections in AMX database - Good!');
    }

    console.log('\n========== CHECK COMPLETE ==========');
  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    // Close connections
    if (clientConnection) await clientConnection.close();
    if (amxConnection) await amxConnection.close();
    console.log('Database connections closed');
  }
}

// Run the check
checkCollections().catch(console.error);
