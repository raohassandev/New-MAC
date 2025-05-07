import { MongoClient } from 'mongodb';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('Connecting to MongoDB...');

  try {
    // Connect to MongoDB
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    console.log('Connected to MongoDB');

    // Get devices from the client database
    const db = client.db('client');
    const devices = await db.collection('devices').find({}).toArray();

    console.log(`Found ${devices.length} devices:`);
    devices.forEach(device => {
      console.log(`- ${device._id}: ${device.name}`);
    });

    // Create a JSON response that matches the API format
    const response = {
      devices,
      pagination: {
        total: devices.length,
        page: 1,
        limit: 100,
        pages: 1,
      },
    };

    // Save to a file
    const outputFile = join(__dirname, 'devices-response.json');
    writeFileSync(outputFile, JSON.stringify(response, null, 2));

    console.log(`\nResponse saved to ${outputFile}`);

    // Close the connection
    await client.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
