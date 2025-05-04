/**
 * Script to initialize MongoDB databases and collections
 * Run this script directly with MongoDB shell:
 * mongosh mongo-init.js
 */

// Define databases
const clientDb = 'client';
const amxDb = 'amx';

// Function to initialize a database with collections
function initializeDatabase(dbName, collections) {
  print(`Initializing database: ${dbName}`);
  
  // Connect to the database
  const db = db.getSiblingDB(dbName);
  
  // Create each collection
  collections.forEach(collection => {
    print(`Creating collection: ${collection}`);
    db.createCollection(collection);
  });
  
  print(`Database ${dbName} initialized with collections: ${collections.join(', ')}`);
}

// Initialize client database
initializeDatabase(clientDb, [
  'users', 
  'devices', 
  'profiles',
  'alerts'
]);

// Initialize AMX database
initializeDatabase(amxDb, [
  'devicetypes',
  'devicedriver'
]);

// Insert sample data into AMX database
const amxDB = db.getSiblingDB(amxDb);

// Check if device types already exist
const deviceTypesCount = amxDB.devicetypes.countDocuments();
if (deviceTypesCount === 0) {
  print('Inserting sample device types...');
  
  // Insert default device types
  amxDB.devicetypes.insertMany([
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
  ]);
  
  print('Sample device types inserted successfully');
} else {
  print(`Found ${deviceTypesCount} existing device types, skipping sample data insertion`);
}

print('Database initialization complete!');