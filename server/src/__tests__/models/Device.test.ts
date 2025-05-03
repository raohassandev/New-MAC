import mongoose from 'mongoose';
import Device from '../../models/Device';

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
      ip: '192.168.1.100',
      slaveId: 1,
    };

    const device = await Device.create(deviceData);
    expect(device._id).toBeDefined();
    expect(device.name).toBe('Minimal Device');
    expect(device.ip).toBe('192.168.1.100');
    expect(device.slaveId).toBe(1);
    
    // Check default values
    expect(device.port).toBe(502);
    expect(device.enabled).toBe(true);
    expect(device.registers).toEqual([]);
    expect(device.createdAt).toBeInstanceOf(Date);
    expect(device.updatedAt).toBeInstanceOf(Date);
  });

  test('creates a device with all fields', async () => {
    const now = new Date();
    const deviceData = {
      name: 'Full Device',
      ip: '192.168.1.101',
      port: 503,
      slaveId: 2,
      enabled: false,
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
    expect(device.ip).toBe('192.168.1.101');
    expect(device.port).toBe(503);
    expect(device.slaveId).toBe(2);
    expect(device.enabled).toBe(false);
    expect(device.registers).toHaveLength(1);
    expect(device.registers[0].name).toBe('Temperature');
    expect(device.registers[0].address).toBe(100);
    expect(device.registers[0].length).toBe(2);
    expect(device.registers[0].scaleFactor).toBe(10);
    expect(device.registers[0].decimalPoint).toBe(1);
    expect(device.registers[0].byteOrder).toBe('AB CD');
    expect(device.registers[0].unit).toBe('°C');
    expect(device.lastSeen).toEqual(now);
  });

  test('updates the updatedAt timestamp on save', async () => {
    // Create a device
    const device = await Device.create({
      name: 'Update Test Device',
      ip: '192.168.1.102',
      slaveId: 3,
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
      ip: '192.168.1.103',
      slaveId: 4,
    };

    await expect(Device.create(invalidDeviceData)).rejects.toThrow();
  });

  test('updates existing device correctly', async () => {
    // Create a device
    const device = await Device.create({
      name: 'Original Device',
      ip: '192.168.1.104',
      slaveId: 5,
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
      },
      { new: true, runValidators: true }
    );
    
    expect(updatedDevice).not.toBeNull();
    if (updatedDevice) {
      expect(updatedDevice.name).toBe('Updated Device');
      expect(updatedDevice.ip).toBe('192.168.1.104'); // Unchanged
      expect(updatedDevice.enabled).toBe(false);
      expect(updatedDevice.registers[0].name).toBe('Updated Register');
      expect(updatedDevice.registers[0].address).toBe(200); // Unchanged
    }
  });

  test('deletes device correctly', async () => {
    // Create a device
    const device = await Device.create({
      name: 'Device to Delete',
      ip: '192.168.1.105',
      slaveId: 6,
    });
    
    // Verify it exists
    const deviceId = device._id;
    expect(await Device.findById(deviceId)).not.toBeNull();
    
    // Delete it
    await device.deleteOne();
    
    // Verify it's gone
    expect(await Device.findById(deviceId)).toBeNull();
  });

  test('supports querying by multiple criteria', async () => {
    // Create multiple devices
    await Device.create([
      {
        name: 'Device A',
        ip: '192.168.1.110',
        slaveId: 10,
        enabled: true,
      },
      {
        name: 'Device B',
        ip: '192.168.1.111',
        slaveId: 11,
        enabled: false,
      },
      {
        name: 'Device C',
        ip: '192.168.1.112',
        slaveId: 12,
        enabled: true,
      },
    ]);
    
    // Query all enabled devices
    const enabledDevices = await Device.find({ enabled: true });
    expect(enabledDevices).toHaveLength(2);
    expect(enabledDevices.map(d => d.name)).toEqual(['Device A', 'Device C']);
    
    // Query by IP
    const deviceByIp = await Device.findOne({ ip: '192.168.1.111' });
    expect(deviceByIp).not.toBeNull();
    expect(deviceByIp?.name).toBe('Device B');
    
    // Query by multiple criteria
    const deviceByMultiple = await Device.findOne({
      enabled: true,
      slaveId: 12,
    });
    expect(deviceByMultiple).not.toBeNull();
    expect(deviceByMultiple?.name).toBe('Device C');
  });
});