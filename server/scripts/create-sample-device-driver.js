/**
 * Create sample device drivers in the AMX database
 */

const { MongoClient } = require('mongodb');

async function createSampleDeviceDrivers() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    // Connect to AMX database
    await client.connect();
    const db = client.db('amx');
    console.log('Connected to AMX database');
    
    // Check existing templates
    const existingCount = await db.collection('templates').countDocuments();
    console.log(`Found ${existingCount} existing device drivers`);
    
    if (existingCount === 0) {
      console.log('Creating sample device drivers...');
      
      // Sample device driver 1 - Energy Analyzer
      const energyAnalyzer = {
        name: 'Generic Energy Analyzer',
        make: 'Generic',
        model: 'EA-001',
        description: 'Generic energy analyzer with basic measurements',
        enabled: true,
        deviceType: 'energy_analyzer',
        isDeviceDriver: true,
        dataPoints: [
          {
            range: {
              startAddress: 0,
              count: 4,
              fc: 3
            },
            parser: {
              parameters: [
                {
                  name: 'Voltage',
                  dataType: 'FLOAT32',
                  scalingFactor: 1,
                  decimalPoint: 2,
                  byteOrder: 'ABCD',
                  signed: false,
                  registerRange: 'Basic',
                  registerIndex: 0,
                  wordCount: 2,
                  unit: 'V'
                },
                {
                  name: 'Current',
                  dataType: 'FLOAT32',
                  scalingFactor: 1,
                  decimalPoint: 2,
                  byteOrder: 'ABCD',
                  signed: false,
                  registerRange: 'Basic',
                  registerIndex: 2,
                  wordCount: 2,
                  unit: 'A'
                }
              ]
            }
          }
        ],
        writableRegisters: [],
        controlParameters: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Sample device driver 2 - Temperature Sensor
      const tempSensor = {
        name: 'Temperature Sensor',
        make: 'TempCo',
        model: 'TS-100',
        description: 'Basic temperature sensor',
        enabled: true,
        deviceType: 'temperature_sensor',
        isDeviceDriver: true,
        dataPoints: [
          {
            range: {
              startAddress: 100,
              count: 2,
              fc: 3
            },
            parser: {
              parameters: [
                {
                  name: 'Temperature',
                  dataType: 'FLOAT32',
                  scalingFactor: 0.1,
                  decimalPoint: 1,
                  byteOrder: 'ABCD',
                  signed: true,
                  registerRange: 'Sensors',
                  registerIndex: 0,
                  wordCount: 2,
                  unit: '°C'
                }
              ]
            }
          }
        ],
        writableRegisters: [],
        controlParameters: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert sample device drivers
      const result1 = await db.collection('templates').insertOne(energyAnalyzer);
      console.log(`Created Energy Analyzer driver: ${result1.insertedId}`);
      
      const result2 = await db.collection('templates').insertOne(tempSensor);
      console.log(`Created Temperature Sensor driver: ${result2.insertedId}`);
      
      console.log('Sample device drivers created successfully!');
    } else {
      console.log('Device drivers already exist, skipping creation');
      
      // List existing drivers
      const drivers = await db.collection('templates').find({}).toArray();
      console.log('\nExisting device drivers:');
      drivers.forEach(driver => {
        console.log(`- ${driver.name} (${driver.make} ${driver.model}) - ID: ${driver._id}`);
      });
    }
    
    await client.close();
    console.log('\nDatabase connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createSampleDeviceDrivers().catch(console.error);