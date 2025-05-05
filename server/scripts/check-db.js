const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';
const clientDbName = 'client';

async function main() {
  console.log('Attempting to connect to MongoDB...');
  
  try {
    // Create a new MongoClient
    const client = new MongoClient(url);
    
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Connect to the client database
    const db = client.db(clientDbName);
    console.log(`Connected to database: ${clientDbName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`Collections in ${clientDbName} database:`);
    collections.forEach(col => console.log(`- ${col.name}`));
    
    // Check for devices collection and count documents
    if (collections.some(col => col.name === 'devices')) {
      const devices = await db.collection('devices').find({}).toArray();
      console.log(`\nFound ${devices.length} devices in the 'devices' collection:`);
      
      // Print device info
      devices.forEach(device => {
        console.log(`- ${device._id}: ${device.name} (${device.make || 'Unknown'} ${device.model || ''})`);
      });
    } else {
      console.log('No devices collection found');
    }
    
    // Close the connection
    await client.close();
    console.log('\nDatabase connection closed');
  } catch (err) {
    console.error('Error connecting to database:', err);
  }
}

main().catch(console.error);