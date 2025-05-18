import { createConnection, Schema } from 'mongoose';

// Create a connection to AMX database
async function main() {
  try {
    console.log('Connecting to AMX database...');
    const amxConnection = await createConnection('mongodb://localhost:27017/amx');
    console.log('Connected to AMX database');

    console.log('Connecting to client database...');
    const clientConnection = await createConnection('mongodb://localhost:27017/client');
    console.log('Connected to client database');

    // Get device types from AMX database
    const deviceTypes = await amxConnection.collection('devicetypes').find({}).toArray();
    console.log(`Found ${deviceTypes.length} device types in AMX database:`);
    console.log(deviceTypes.map(type => ({ id: type._id, name: type.name })));
    
    // Note: This script should be updated to create device drivers instead of devices
    // Device drivers are now the templates that devices reference
    console.log('⚠️  Note: This script should create device drivers, not devices with embedded configuration');

    // Create device schema
    const deviceSchema = new Schema({
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
          slaveId: { type: Number, default: 1 },
        },
        rtu: {
          serialPort: { type: String, default: '' },
          baudRate: { type: Number, default: 9600 },
          dataBits: { type: Number, default: 8 },
          stopBits: { type: Number, default: 1 },
          parity: { type: String, default: 'none' },
          slaveId: { type: Number, default: 1 },
        },
      },
      dataPoints: [
        {
          range: {
            startAddress: { type: Number, required: true },
            count: { type: Number, required: true, default: 1 },
            fc: { type: Number, required: true, default: 3 },
          },
          parser: {
            parameters: [
              {
                name: { type: String, required: true },
                dataType: { type: String, default: 'INT16' },
                registerIndex: { type: Number, required: true },
                scalingFactor: { type: Number, default: 1 },
                unit: { type: String },
              },
            ],
          },
        },
      ],
      lastSeen: { type: Date },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    // Create device model
    const Device = clientConnection.model('Device', deviceSchema, 'devices');

    // Create device from first device type in AMX database
    if (deviceTypes.length > 0) {
      const deviceType = deviceTypes[0];

      const testDevice = {
        name: `${deviceType.name} from AMX`,
        description: 'Created from AMX device type',
        enabled: true,
        make: 'AMX Import',
        model: deviceType.name,
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.100',
            port: 502,
            slaveId: 1,
          },
        },
        dataPoints: [
          {
            range: {
              startAddress: 0,
              count: 10,
              fc: 3,
            },
            parser: {
              parameters: [
                {
                  name: 'Temperature',
                  dataType: 'FLOAT',
                  registerIndex: 0,
                  scalingFactor: 0.1,
                  unit: '°C',
                },
              ],
            },
          },
        ],
        lastSeen: new Date(),
      };

      try {
        const savedDevice = await Device.create(testDevice);
        console.log('Device created from AMX type:', savedDevice._id);
      } catch (err) {
        if (err.code === 11000) {
          console.log('Device already exists, skipping creation');
          const existingDevice = await Device.findOne({ name: testDevice.name });
          console.log('Existing device ID:', existingDevice?._id);
        } else {
          throw err;
        }
      }
    }

    // List all devices in client database
    const clientDevices = await clientConnection.collection('devices').find({}).toArray();
    console.log(`Found ${clientDevices.length} devices in client database:`);
    clientDevices.forEach(device => {
      console.log(`- ${device._id}: ${device.name} (${device.make} ${device.model})`);
    });

    // Verify that the data can be queried using Mongoose API
    const modelDevices = await Device.find({});
    console.log(`Found ${modelDevices.length} devices using Mongoose model in client database:`);
    modelDevices.forEach(device => {
      console.log(`- ${device._id}: ${device.name} (${device.make} ${device.model})`);
    });

    // Close the connections
    await amxConnection.close();
    await clientConnection.close();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main().catch(console.error);
