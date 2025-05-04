/**
 * Utility script to verify database configuration
 * Run with: node verifyDBConfig.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Configuration output
console.log('=== DATABASE CONFIGURATION ===');
console.log('Main DB URI:', process.env.MONGO_URI || 'mongodb://localhost:27017/client');
console.log('AMX Library DB URI:', process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx');

// Verify .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n=== ENV FILE CONTENT ===');
  console.log(envContent);
} else {
  console.log('\nWARNING: .env file not found at', envPath);
}

// Check current database connections
(async () => {
  try {
    let clientDB, amxDB;
    
    // Connect to client database
    try {
      console.log('\n=== TESTING CLIENT DATABASE CONNECTION ===');
      clientDB = await mongoose.createConnection(process.env.MONGO_URI || 'mongodb://localhost:27017/client');
      console.log('✅ Successfully connected to client database:', clientDB.db.databaseName);
      
      // Check collections
      const clientCollections = await clientDB.db.listCollections().toArray();
      console.log('Collections in client database:', clientCollections.map(c => c.name).join(', '));

      // Check for devicetypes in wrong database
      if (clientCollections.some(c => c.name === 'devicetypes' || c.name === 'devicedriver')) {
        console.log('⚠️ WARNING: Found devicetypes or devicedriver collections in client database!');
        console.log('Run npm run fix-db to migrate these collections to the AMX database');
      }
    } catch (error) {
      console.error('❌ Failed to connect to client database:', error.message);
    }
    
    // Connect to AMX database
    try {
      console.log('\n=== TESTING AMX DATABASE CONNECTION ===');
      amxDB = await mongoose.createConnection(process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx');
      console.log('✅ Successfully connected to AMX database:', amxDB.db.databaseName);
      
      // Check collections
      const amxCollections = await amxDB.db.listCollections().toArray();
      console.log('Collections in AMX database:', amxCollections.map(c => c.name).join(', '));
      
      // Check for expected collections
      if (!amxCollections.some(c => c.name === 'devicetypes')) {
        console.log('⚠️ devicetypes collection not found in AMX database');
      }
      if (!amxCollections.some(c => c.name === 'devicedriver')) {
        console.log('⚠️ devicedriver collection not found in AMX database');
      }
    } catch (error) {
      console.error('❌ Failed to connect to AMX database:', error.message);
    }
    
    // Close connections
    if (clientDB) await clientDB.close();
    if (amxDB) await amxDB.close();
    
  } catch (error) {
    console.error('Error verifying database configuration:', error);
  } finally {
    // Exit process
    process.exit(0);
  }
})();