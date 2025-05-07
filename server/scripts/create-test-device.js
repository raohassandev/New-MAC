const mongoose = require('mongoose');

// Connect to the database
async function main() {
  try {
    console.log('Connecting to client database...');
    await mongoose.connect('mongodb://localhost:27017/client');
    console.log('Connected to client database');

    // Create a Device schema
    const deviceSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      description: { type: String, default: '' },
      enabled: { type: Boolean, default: true },
      make: { type: String, default: '' },
      model: { type: String, default: '' },
      connectionSetting: {
        connectionType: { type: String, enum: ['tcp', 'rtu'], default: 'tcp' },
        tcp: {
          ip: { type: String, default: '' },
          port: { type: Number, default: 502 },
          slaveId: { type: Number, default: 1 }
        },
        rtu: {
          serialPort: { type: String, default: '' },
          baudRate: { type: Number, default: 9600 },
          dataBits: { type: Number, default: 8 },
          stopBits: { type: Number, default: 1 },
          parity: { type: String, default: 'none' },
          slaveId: { type: Number, default: 1 }
        }
      },
      dataPoints: [{ 
        range: {
          startAddress: { type: Number, required: true },
          count: { type: Number, required: true, default: 1 },
          fc: { type: Number, required: true, default: 3 }
        },
        parser: {
          parameters: [{
            name: { type: String, required: true },
            dataType: { type: String, default: 'INT16' },
            registerIndex: { type: Number, required: true },
            scalingFactor: { type: Number, default: 1 },
            unit: { type: String }
          }]
        }
      }],
      lastSeen: { type: Date },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Create the Device model
    const Device = mongoose.model('Device', deviceSchema, 'devices');

    // Create a test device - Siemens PLC
    const testDevice = {
      name: 'Test Siemens S7 PLC',
      description: 'Test device for development',
      enabled: true,
      make: 'Siemens',
      model: 'S7-1200',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.100',
          port: 502,
          slaveId: 1
        }
      },
      dataPoints: [
        {
          range: {
            startAddress: 0,
            count: 10,
            fc: 3
          },
          parser: {
            parameters: [
              {
                name: 'Temperature',
                dataType: 'FLOAT',
                registerIndex: 0,
                scalingFactor: 0.1,
                unit: '°C'
              },
              {
                name: 'Pressure',
                dataType: 'FLOAT',
                registerIndex: 2,
                scalingFactor: 0.01,
                unit: 'Bar'
              }
            ]
          }
        }
      ],
      lastSeen: new Date()
    };

    // Save the device to the database
    try {
      const savedDevice = await Device.create(testDevice);
      console.log('Test device created:', savedDevice._id);
    } catch (err) {
      if (err.code === 11000) {
        console.log('Test device already exists, skipping creation');
        const existingDevice = await Device.findOne({ name: testDevice.name });
        console.log('Existing device ID:', existingDevice._id);
      } else {
        throw err;
      }
    }

    // List all devices
    const devices = await Device.find({});
    console.log(`Found ${devices.length} devices in the database:`);
    devices.forEach(device => {
      console.log(`- ${device._id}: ${device.name} (${device.make} ${device.model})`);
    });

    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main().catch(console.error);