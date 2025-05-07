/**
 * MACSYS Database Initialization Script
 *
 * This script initializes the dual database architecture by creating
 * the necessary collections in each database.
 */

import { createConnection } from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function initializeDatabases() {
  try {
    console.log('=== MACSYS DATABASE INITIALIZATION ===');

    // Client database
    const clientURI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log(`Connecting to client database: ${clientURI}`);

    const clientConn = await createConnection(clientURI);
    console.log('Connected to client database');

    // AMX database
    const amxURI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log(`Connecting to AMX database: ${amxURI}`);

    const amxConn = await createConnection(amxURI);
    console.log('Connected to AMX database');

    // Create client collections if needed
    console.log('\nCreating client collections...');
    await createCollectionIfNotExists(clientConn, 'users');
    await createCollectionIfNotExists(clientConn, 'devices');
    await createCollectionIfNotExists(clientConn, 'profiles');
    await createCollectionIfNotExists(clientConn, 'alerts');

    // Create AMX collections if needed
    console.log('\nCreating AMX collections...');
    await createCollectionIfNotExists(amxConn, 'devicetypes');
    await createCollectionIfNotExists(amxConn, 'templates');

    console.log('\n✓ Databases initialized successfully');

    // Close connections
    await clientConn.close();
    await amxConn.close();

    process.exit(0);
  } catch (error) {
    console.error('\nDatabase initialization failed:', error);
    process.exit(1);
  }
}

async function createCollectionIfNotExists(connection, collectionName) {
  try {
    // Check if the collection exists
    const collections = await connection.db.listCollections({ name: collectionName }).toArray();

    if (collections.length === 0) {
      // Collection does not exist, create it
      await connection.db.createCollection(collectionName);
      console.log(`  ✓ Created collection: ${collectionName}`);
    } else {
      console.log(`  ✓ Collection already exists: ${collectionName}`);
    }
  } catch (error) {
    console.error(`  ✗ Error creating collection ${collectionName}:`, error);
    throw error;
  }
}

initializeDatabases();
