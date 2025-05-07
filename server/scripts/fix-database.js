/**
 * Script to migrate devicetypes and devicedriver collections from client to amx database
 */
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

// MongoDB connection strings
const CLIENT_DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
const LIBRARY_DB_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';

async function migrateCollections() {
  console.log('Starting migration of devicetypes and devicedriver from client to amx database...');

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

    // Check if collections exist in client database
    const clientCollections = await clientDb.listCollections().toArray();
    const clientCollectionNames = clientCollections.map(col => col.name);

    // Check for devicetypes collection
    if (clientCollectionNames.includes('devicetypes')) {
      console.log('Found devicetypes collection in client database, migrating to AMX...');

      // Get all documents from client devicetypes
      const deviceTypes = await clientDb.collection('devicetypes').find({}).toArray();
      console.log(`Found ${deviceTypes.length} device types to migrate`);

      if (deviceTypes.length > 0) {
        // Insert into AMX database
        try {
          const result = await amxDb.collection('devicetypes').insertMany(deviceTypes);
          console.log(`Successfully migrated ${result.insertedCount} device types to AMX database`);

          // Delete from client database
          await clientDb.collection('devicetypes').drop();
          console.log('Dropped devicetypes collection from client database');
        } catch (error) {
          if (error.code === 11000) {
            console.log(
              'Some documents already exist in the AMX database. Dropping the client collection anyway...',
            );
            await clientDb.collection('devicetypes').drop();
            console.log('Dropped devicetypes collection from client database');
          } else {
            throw error;
          }
        }
      } else {
        console.log('No device types to migrate, dropping empty collection');
        await clientDb.collection('devicetypes').drop();
      }
    } else {
      console.log('No devicetypes collection found in client database');
    }

    // Check for devicedriver collection
    if (clientCollectionNames.includes('devicedriver')) {
      console.log('Found devicedriver collection in client database, migrating to AMX...');

      // Get all documents from client devicedriver
      const devicedriver = await clientDb.collection('devicedriver').find({}).toArray();
      console.log(`Found ${devicedriver.length} devicedriver to migrate`);

      if (devicedriver.length > 0) {
        // Insert into AMX database
        try {
          const result = await amxDb.collection('devicedriver').insertMany(devicedriver);
          console.log(`Successfully migrated ${result.insertedCount} devicedriver to AMX database`);

          // Delete from client database
          await clientDb.collection('devicedriver').drop();
          console.log('Dropped devicedriver collection from client database');
        } catch (error) {
          if (error.code === 11000) {
            console.log(
              'Some documents already exist in the AMX database. Dropping the client collection anyway...',
            );
            await clientDb.collection('devicedriver').drop();
            console.log('Dropped devicedriver collection from client database');
          } else {
            throw error;
          }
        }
      } else {
        console.log('No devicedriver to migrate, dropping empty collection');
        await clientDb.collection('devicedriver').drop();
      }
    } else {
      console.log('No devicedriver collection found in client database');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close connections
    if (clientConnection) await clientConnection.close();
    if (amxConnection) await amxConnection.close();
    console.log('Database connections closed');
  }
}

// Run the migration
migrateCollections().catch(console.error);
