/**
 * MACSYS Database Verification Script
 *
 * This script verifies the correct setup of the dual database architecture
 * by checking if collections are in the correct databases.
 */

import { createConnection } from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

async function verifyDatabases() {
  console.log('=== MACSYS DATABASE VERIFICATION ===');

  try {
    console.log('Checking environment variables...');
    if (!process.env.MONGO_URI) {
      console.log(
        'WARNING: MONGO_URI not found in environment. Using default: mongodb://localhost:27017/client',
      );
    }

    if (!process.env.LIBRARY_DB_URI) {
      console.log(
        'WARNING: LIBRARY_DB_URI not found in environment. Using default: mongodb://localhost:27017/amx',
      );
    }

    // Check client database
    const clientURI = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log(`Connecting to client database: ${clientURI}`);

    const clientConn = await createConnection(clientURI);
    const clientCollections = await clientConn.db.listCollections().toArray();
    console.log(
      'Client DB collections:',
      clientCollections.map(c => c.name),
    );

    // Check AMX database
    const amxURI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log(`Connecting to AMX database: ${amxURI}`);

    const amxConn = await createConnection(amxURI);
    const amxCollections = await amxConn.db.listCollections().toArray();
    console.log(
      'AMX DB collections:',
      amxCollections.map(c => c.name),
    );

    // Verify collections are in correct databases
    const issues = [];

    // Check for collections that should be in AMX but found in client
    const amxOnlyCollections = ['devicetypes', 'templates'];
    amxOnlyCollections.forEach(collection => {
      if (clientCollections.some(c => c.name === collection)) {
        issues.push(`ERROR: ${collection} found in client DB (should be in AMX DB)`);
      }
    });

    // Check for collections that should be in client but found in AMX
    const clientOnlyCollections = ['users', 'devices', 'profiles', 'alerts'];
    clientOnlyCollections.forEach(collection => {
      if (amxCollections.some(c => c.name === collection)) {
        issues.push(`ERROR: ${collection} found in AMX DB (should be in client DB)`);
      }
    });

    // Check for missing collections in AMX
    amxOnlyCollections.forEach(collection => {
      if (!amxCollections.some(c => c.name === collection)) {
        issues.push(`ERROR: ${collection} missing from AMX DB`);
      }
    });

    // Check for missing collections in client
    clientOnlyCollections.forEach(collection => {
      if (!clientCollections.some(c => c.name === collection) && collection !== 'alerts') {
        // Alerts might not exist yet, so only warn
        if (collection === 'alerts') {
          console.log(
            `NOTE: ${collection} collection not found in client DB - may be created later`,
          );
        } else {
          issues.push(`ERROR: ${collection} missing from client DB`);
        }
      }
    });

    if (issues.length > 0) {
      console.log('\n=== ISSUES FOUND ===');
      issues.forEach(issue => console.log(issue));
      console.log('\nRun the database migration script to fix these issues:');
      console.log('npm run db:migrate');
    } else {
      console.log('\n✓ All collections are in correct databases');
    }

    // Close connections
    await clientConn.close();
    await amxConn.close();

    console.log('\nVerification complete.');
    process.exit(issues.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\nVerification failed:', error);
    process.exit(1);
  }
}

verifyDatabases();
