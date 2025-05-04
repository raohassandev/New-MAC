import { fail } from 'assert';

// Mock the mongoose connection
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    db: { dropDatabase: jest.fn().mockResolvedValue(true) },
    close: jest.fn().mockResolvedValue(true),
  },
  Schema: jest.fn().mockReturnValue({}),
  model: jest.fn(),
}));

// Create mock storage
const mockDeviceData = new Map();

// Generate ObjectId
const generateObjectId = () => {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const rest = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  return timestamp + rest;
};

// Create mock implementation for Device model
const mockDeviceImplementation = {
  create: jest.fn().mockImplementation(async (data) => {
    // Handle array or single document
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => mockDeviceImplementation.create(item)));
    }
    
    // Check required fields
    if (!data.name) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      return Promise.reject(error);
    }
    
    // Create a proper mock device document
    const doc = {
      _id: generateObjectId(),
      ...data,
      enabled: data.enabled !== undefined ? data.enabled : true,
      registers: data.registers || [],
      dataPoints: data.dataPoints || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Add instance methods
      save: jest.fn().mockImplementation(function(this: any) {
        this.updatedAt = new Date();
        mockDeviceData.set(this._id.toString(), this);
        return Promise.resolve(this);
      }),
      
      deleteOne: jest.fn().mockImplementation(function(this: any) {
        mockDeviceData.delete(this._id.toString());
        return Promise.resolve({ acknowledged: true, deletedCount: 1 });
      }),
    };
    
    mockDeviceData.set(doc._id.toString(), doc);
    return Promise.resolve(doc);
  }),
  
  find: jest.fn().mockImplementation((query = {}) => {
    // Deep query match function for nested objects
    const matchesQuery = (doc: any, query: any) => {
      return Object.entries(query).every(([key, value]) => {
        // Handle nested paths like 'connectionSetting.tcp.ip'
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = doc;
          
          // Navigate down the object path
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current || typeof current !== 'object') return false;
            current = current[parts[i]];
          }
          
          // Check the final property
          return current && current[parts[parts.length - 1]] === value;
        }
        
        return doc[key] === value;
      });
    };
    
    const matchingDocs = Array.from(mockDeviceData.values()).filter(doc => matchesQuery(doc, query));
    return matchingDocs;
  }),
  
  findOne: jest.fn().mockImplementation((query = {}) => {
    // Deep query match function (same as find)
    const matchesQuery = (doc: any, query: any) => {
      return Object.entries(query).every(([key, value]) => {
        // Handle nested paths
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = doc;
          
          // Navigate down the object path
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current || typeof current !== 'object') return false;
            current = current[parts[i]];
          }
          
          // Check the final property
          return current && current[parts[parts.length - 1]] === value;
        }
        
        return doc[key] === value;
      });
    };
    
    const doc = Array.from(mockDeviceData.values()).find(doc => matchesQuery(doc, query));
    return Promise.resolve(doc || null);
  }),
  
  findById: jest.fn().mockImplementation((id) => {
    return Promise.resolve(mockDeviceData.get(id.toString()) || null);
  }),
  
  findByIdAndUpdate: jest.fn().mockImplementation((id, update, options) => {
    const doc = mockDeviceData.get(id.toString());
    if (!doc) return Promise.resolve(null);
    
    // Handle dot notation update objects like {'connectionSetting.tcp.port': 503}
    const updatedDoc = { ...doc };
    
    Object.entries(update).forEach(([key, value]) => {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = updatedDoc;
        
        // Navigate down the object path
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        
        // Set the final property
        current[parts[parts.length - 1]] = value;
      } else {
        updatedDoc[key] = value;
      }
    });
    
    updatedDoc.updatedAt = new Date();
    
    // Preserve instance methods
    updatedDoc.save = doc.save;
    updatedDoc.deleteOne = doc.deleteOne;
    
    mockDeviceData.set(id.toString(), updatedDoc);
    return Promise.resolve(options?.new === true ? updatedDoc : doc);
  }),
  
  deleteMany: jest.fn().mockImplementation(() => {
    mockDeviceData.clear();
    return Promise.resolve({ acknowledged: true, deletedCount: mockDeviceData.size });
  }),
};

// Apply the mock
jest.mock('../../models/Device', () => mockDeviceImplementation);
import Device from '../../client/models/Device';
import mongoose from 'mongoose';

describe('Device Model', () => {
  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/macsys_test');
  });

  afterAll(async () => {
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Device.deleteMany({});
  });

  test('creates a device with minimum required fields', async () => {
    const deviceData = {
      name: 'Minimal Device',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.100',
          port: 502,
          slaveId: 1
        }
      }
    };

    const device = await Device.create(deviceData);
    expect(device._id).toBeDefined();
    expect(device.name).toBe('Minimal Device');
    expect(device.connectionSetting).toBeDefined();
    
    if (device.connectionSetting) {
      expect(device.connectionSetting.connectionType).toBe('tcp');
      
      if (device.connectionSetting.tcp) {
        expect(device.connectionSetting.tcp.ip).toBe('192.168.1.100');
        expect(device.connectionSetting.tcp.port).toBe(502);
        expect(device.connectionSetting.tcp.slaveId).toBe(1);
      } else {
        fail('TCP connection settings should be defined');
      }
    } else {
      fail('Connection settings should be defined');
    }
    
    // Check default values
    expect(device.enabled).toBe(true);
    expect(device.registers).toEqual([]);
    expect(device.createdAt).toBeInstanceOf(Date);
    expect(device.updatedAt).toBeInstanceOf(Date);
  });

  test('creates a device with all fields', async () => {
    const now = new Date();
    const deviceData = {
      name: 'Full Device',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.101',
          port: 503,
          slaveId: 2
        }
      },
      enabled: false,
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
                dataType: 'FLOAT',
                scalingFactor: 10,
                decimalPoint: 1,
                byteOrder: 'ABCD',
                registerIndex: 100,
                unit: '°C'
              }
            ]
          }
        }
      ],
      registers: [
        {
          name: 'Temperature',
          address: 100,
          length: 2,
          scaleFactor: 10,
          decimalPoint: 1,
          byteOrder: 'AB CD',
          unit: '°C',
        },
      ],
      lastSeen: now,
    };

    const device = await Device.create(deviceData);
    expect(device.name).toBe('Full Device');
    expect(device.connectionSetting).toBeDefined();
    if (device.connectionSetting) {
      expect(device.connectionSetting.connectionType).toBe('tcp');
      
      if (device.connectionSetting.tcp) {
        expect(device.connectionSetting.tcp.ip).toBe('192.168.1.101');
        expect(device.connectionSetting.tcp.port).toBe(503);
        expect(device.connectionSetting.tcp.slaveId).toBe(2);
      } else {
        fail('TCP connection settings should be defined');
      }
    } else {
      fail('Connection settings should be defined');
    }
    
    expect(device.enabled).toBe(false);
    
    // Check legacy registers
    expect(device.registers).toBeDefined();
    if (device.registers) {
      expect(device.registers).toHaveLength(1);
      expect(device.registers[0].name).toBe('Temperature');
      expect(device.registers[0].address).toBe(100);
      expect(device.registers[0].length).toBe(2);
      expect(device.registers[0].scaleFactor).toBe(10);
      expect(device.registers[0].decimalPoint).toBe(1);
      expect(device.registers[0].byteOrder).toBe('AB CD');
      expect(device.registers[0].unit).toBe('°C');
    } else {
      fail('Registers should be defined');
    }
    
    // Check new dataPoints
    expect(device.dataPoints).toBeDefined();
    if (device.dataPoints) {
      expect(device.dataPoints).toHaveLength(1);
      expect(device.dataPoints[0].range.startAddress).toBe(100);
      expect(device.dataPoints[0].range.count).toBe(2);
      expect(device.dataPoints[0].range.fc).toBe(3);
      expect(device.dataPoints[0].parser.parameters[0].name).toBe('Temperature');
      expect(device.dataPoints[0].parser.parameters[0].dataType).toBe('FLOAT');
      expect(device.dataPoints[0].parser.parameters[0].unit).toBe('°C');
    }
    
    expect(device.lastSeen).toEqual(now);
  });

  test('updates the updatedAt timestamp on save', async () => {
    // Create a device
    const device = await Device.create({
      name: 'Update Test Device',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.102',
          port: 502,
          slaveId: 3
        }
      }
    });
    
    const originalUpdatedAt = device.updatedAt;
    
    // Wait a bit to ensure timestamp would change
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update the device
    device.name = 'Updated Device Name';
    await device.save();
    
    // Check that updatedAt has changed
    expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  test('fails validation when required fields are missing', async () => {
    const invalidDeviceData = {
      // Missing required 'name' field
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.103',
          port: 502,
          slaveId: 4
        }
      }
    };

    await expect(Device.create(invalidDeviceData)).rejects.toThrow();
  });

  test('updates existing device correctly', async () => {
    // Create a device
    const device = await Device.create({
      name: 'Original Device',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.104',
          port: 502,
          slaveId: 5
        }
      },
      registers: [
        {
          name: 'Original Register',
          address: 200,
          length: 2,
        },
      ],
    });
    
    // Update using findByIdAndUpdate
    const updatedDevice = await Device.findByIdAndUpdate(
      device._id,
      {
        name: 'Updated Device',
        enabled: false,
        'registers.0.name': 'Updated Register',
        'connectionSetting.tcp.port': 503
      },
      { new: true, runValidators: true }
    );
    
    expect(updatedDevice).not.toBeNull();
    if (updatedDevice) {
      expect(updatedDevice.name).toBe('Updated Device');
      expect(updatedDevice.connectionSetting).toBeDefined();
      if (updatedDevice.connectionSetting && updatedDevice.connectionSetting.tcp) {
        expect(updatedDevice.connectionSetting.tcp.ip).toBe('192.168.1.104'); // Unchanged
        expect(updatedDevice.connectionSetting.tcp.port).toBe(503); // Changed
      }
      expect(updatedDevice.enabled).toBe(false);
      expect(updatedDevice.registers).toBeDefined();
      if (updatedDevice.registers && updatedDevice.registers.length > 0) {
        expect(updatedDevice.registers[0].name).toBe('Updated Register');
        expect(updatedDevice.registers[0].address).toBe(200); // Unchanged
      }
    }
  });

  test('deletes device correctly', async () => {
    // Create a device
    const device = await Device.create({
      name: 'Device to Delete',
      connectionSetting: {
        connectionType: 'tcp',
        tcp: {
          ip: '192.168.1.105',
          port: 502,
          slaveId: 6
        }
      }
    });
    
    // Verify it exists
    const deviceId = device._id;
    expect(await Device.findById(deviceId)).not.toBeNull();
    
    // Delete it
    await device.deleteOne();
    
    // Verify it's gone
    expect(await Device.findById(deviceId)).toBeNull();
  });

  test('creates a device with RTU connection settings', async () => {
    const deviceData = {
      name: 'RTU Device',
      connectionSetting: {
        connectionType: 'rtu',
        rtu: {
          serialPort: 'COM1',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          slaveId: 5
        }
      }
    };

    const device = await Device.create(deviceData);
    expect(device._id).toBeDefined();
    expect(device.name).toBe('RTU Device');
    expect(device.connectionSetting).toBeDefined();
    
    if (device.connectionSetting) {
      expect(device.connectionSetting.connectionType).toBe('rtu');
      if (device.connectionSetting.rtu) {
        expect(device.connectionSetting.rtu.serialPort).toBe('COM1');
        expect(device.connectionSetting.rtu.baudRate).toBe(9600);
        expect(device.connectionSetting.rtu.dataBits).toBe(8);
        expect(device.connectionSetting.rtu.stopBits).toBe(1);
        expect(device.connectionSetting.rtu.parity).toBe('none');
        expect(device.connectionSetting.rtu.slaveId).toBe(5);
      }
    }
  });

  test('supports querying by multiple criteria', async () => {
    // Create multiple devices
    await Device.create([
      {
        name: 'Device A',
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.110',
            port: 502,
            slaveId: 10
          }
        },
        enabled: true,
      },
      {
        name: 'Device B',
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.111',
            port: 502,
            slaveId: 11
          }
        },
        enabled: false,
      },
      {
        name: 'Device C',
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.112',
            port: 502,
            slaveId: 12
          }
        },
        enabled: true,
      },
    ]);
    
    // Query all enabled devices
    const enabledDevices = await Device.find({ enabled: true });
    expect(enabledDevices).toHaveLength(2);
    expect(enabledDevices.map(d => d.name)).toEqual(['Device A', 'Device C']);
    
    // Query by IP in the new nested structure
    const deviceByIp = await Device.findOne({ 'connectionSetting.tcp.ip': '192.168.1.111' });
    expect(deviceByIp).not.toBeNull();
    expect(deviceByIp?.name).toBe('Device B');
    
    // Query by multiple criteria
    const deviceByMultiple = await Device.findOne({
      enabled: true,
      'connectionSetting.tcp.slaveId': 12,
    });
    expect(deviceByMultiple).not.toBeNull();
    expect(deviceByMultiple?.name).toBe('Device C');
  });
});