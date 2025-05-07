/**
 * Database Connection Test Script
 *
 * This script tests direct connection to MongoDB databases used by the MACSYS server.
 * It helps isolate database connectivity issues from server issues.
 */

import { createConnection } from 'mongoose';
import { config } from 'dotenv';
import fs from 'fs';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Database connection information
const databases = [
  {
    name: 'Client Database',
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/client',
    collections: ['devices', 'users', 'profiles', 'alerts'],
  },
  {
    name: 'AMX Library Database',
    uri: process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx',
    collections: ['devicedrivers', 'devicetypes', 'templates'],
  },
];

// Test connection to a single database
const testDatabaseConnection = async dbInfo => {
  console.log(`\n${colors.cyan}Testing connection to ${dbInfo.name}:${colors.reset} ${dbInfo.uri}`);

  let connection;
  try {
    // Connect to database with a short timeout
    connection = await createConnection(dbInfo.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`${colors.green}✓ Successfully connected to ${dbInfo.name}${colors.reset}`);

    // Get database information
    const admin = connection.db.admin();
    const serverInfo = await admin.serverInfo();
    console.log(`  MongoDB Version: ${serverInfo.version}`);
    console.log(`  Database name: ${connection.name}`);

    // List collections in the database
    console.log(`  Collections in database:`);
    const collections = await connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`  Found ${collectionNames.length} collections: ${collectionNames.join(', ')}`);

    // Check expected collections
    for (const expectedCollection of dbInfo.collections) {
      if (collectionNames.includes(expectedCollection)) {
        console.log(
          `  ${colors.green}✓ Expected collection found:${colors.reset} ${expectedCollection}`,
        );

        // Get count of documents in the collection
        const count = await connection.db.collection(expectedCollection).countDocuments();
        console.log(`    Document count: ${count}`);
      } else {
        console.log(
          `  ${colors.yellow}⚠ Expected collection missing:${colors.reset} ${expectedCollection}`,
        );
      }
    }

    return true;
  } catch (error) {
    console.log(
      `${colors.red}✗ Failed to connect to ${dbInfo.name}:${colors.reset} ${error.message}`,
    );
    return false;
  } finally {
    // Close the connection
    if (connection) {
      await connection.close();
      console.log(`  Connection closed`);
    }
  }
};

// Main function to test all database connections
const testDatabaseConnections = async () => {
  console.log(
    `\n${colors.magenta}=============== DATABASE CONNECTION TEST ================${colors.reset}`,
  );
  console.log(
    `${colors.magenta}Testing MACSYS database connections ${new Date().toISOString()}${colors.reset}\n`,
  );

  // Print environment information
  console.log(`${colors.blue}Environment variables:${colors.reset}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  MONGO_URI: ${process.env.MONGO_URI || 'not set (using default localhost)'}`);
  console.log(
    `  LIBRARY_DB_URI: ${process.env.LIBRARY_DB_URI || 'not set (using default localhost)'}`,
  );

  let successCount = 0;

  // Test each database
  for (const db of databases) {
    const success = await testDatabaseConnection(db);
    if (success) successCount++;
  }

  // Print summary
  console.log(
    `\n${colors.magenta}====================== TEST SUMMARY ======================${colors.reset}`,
  );
  if (successCount === databases.length) {
    console.log(
      `${colors.green}All database connections successful (${successCount}/${databases.length})${colors.reset}`,
    );
  } else {
    console.log(
      `${colors.yellow}Some database connections failed (${successCount}/${databases.length} successful)${colors.reset}`,
    );

    console.log(`\n${colors.yellow}Troubleshooting tips:${colors.reset}`);
    console.log('1. Make sure MongoDB is running');
    console.log('2. Check that connection URIs are correct in .env file');
    console.log('3. Verify network connectivity to database servers');
    console.log('4. Check if authentication credentials are valid');
  }
  console.log(
    `${colors.magenta}==========================================================${colors.reset}\n`,
  );
};

// Run the tests
testDatabaseConnections().catch(error => {
  console.error(`${colors.red}Test failed with error:${colors.reset}`, error);
  process.exit(1);
});
