/**
 * MACSYS Database Migration Script
 * 
 * This script helps fix collection placement issues by migrating collections
 * to their correct databases in the dual database architecture.
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateCollections() {
  console.log('=== MACSYS DATABASE MIGRATION ===');
  
  try {
    // Connect to client database
    const clientURI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log(`Connecting to client database: ${clientURI}`);
    
    const clientConn = await mongoose.createConnection(clientURI);
    const clientCollections = await clientConn.db.listCollections().toArray();
    console.log('Client DB collections:', clientCollections.map(c => c.name));
    
    // Connect to AMX database
    const amxURI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log(`Connecting to AMX database: ${amxURI}`);
    
    const amxConn = await mongoose.createConnection(amxURI);
    const amxCollections = await amxConn.db.listCollections().toArray();
    console.log('AMX DB collections:', amxCollections.map(c => c.name));
    
    // Define which collections should be in which database
    const collectionMap = {
      client: ['users', 'devices', 'profiles', 'alerts'],
      amx: ['devicetypes', 'templates']
    };
    
    let migrationsMade = false;
    
    // Check for AMX collections in client db that need migration
    for (const collection of collectionMap.amx) {
      if (clientCollections.some(c => c.name === collection)) {
        console.log(`\nMigrating '${collection}' from client DB to AMX DB...`);
        
        // Get the data from client database
        const data = await clientConn.db.collection(collection).find({}).toArray();
        console.log(`  Found ${data.length} documents to migrate`);
        
        if (data.length > 0) {
          // Insert data into AMX database
          if (amxCollections.some(c => c.name === collection)) {
            console.log(`  Collection '${collection}' already exists in AMX DB, updating documents...`);
            for (const doc of data) {
              await amxConn.db.collection(collection).updateOne(
                { _id: doc._id },
                { $set: doc },
                { upsert: true }
              );
            }
          } else {
            console.log(`  Creating collection '${collection}' in AMX DB...`);
            await amxConn.db.createCollection(collection);
            await amxConn.db.collection(collection).insertMany(data);
          }
          
          // Remove original collection from client database
          console.log(`  Removing collection '${collection}' from client DB...`);
          await clientConn.db.dropCollection(collection);
          migrationsMade = true;
        }
      }
    }
    
    // Check for client collections in AMX db that need migration
    for (const collection of collectionMap.client) {
      if (amxCollections.some(c => c.name === collection)) {
        console.log(`\nMigrating '${collection}' from AMX DB to client DB...`);
        
        // Get the data from AMX database
        const data = await amxConn.db.collection(collection).find({}).toArray();
        console.log(`  Found ${data.length} documents to migrate`);
        
        if (data.length > 0) {
          // Insert data into client database
          if (clientCollections.some(c => c.name === collection)) {
            console.log(`  Collection '${collection}' already exists in client DB, updating documents...`);
            for (const doc of data) {
              await clientConn.db.collection(collection).updateOne(
                { _id: doc._id },
                { $set: doc },
                { upsert: true }
              );
            }
          } else {
            console.log(`  Creating collection '${collection}' in client DB...`);
            await clientConn.db.createCollection(collection);
            await clientConn.db.collection(collection).insertMany(data);
          }
          
          // Remove original collection from AMX database
          console.log(`  Removing collection '${collection}' from AMX DB...`);
          await amxConn.db.dropCollection(collection);
          migrationsMade = true;
        }
      }
    }
    
    if (!migrationsMade) {
      console.log('\n✓ No migrations needed - collections are already in correct databases');
    } else {
      console.log('\n✓ Migration completed successfully');
    }
    
    // Close connections
    await clientConn.close();
    await amxConn.close();
    
    process.exit(0);
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  }
}

migrateCollections();