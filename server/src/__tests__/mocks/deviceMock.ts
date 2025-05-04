// @ts-nocheck
import { jest } from '@jest/globals';

// Create mock device data with updated structure
const mockDevice = {
  _id: 'device-123',
  name: 'Test Device',
  make: 'Test Maker',
  model: 'Test Model',
  description: 'Test device for unit tests',
  deviceType: 'Power Meter',
  enabled: true,
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
        count: 2,
        fc: 3
      },
      parser: {
        parameters: [
          {
            name: 'Voltage',
            dataType: 'FLOAT',
            scalingFactor: 1,
            decimalPoint: 1,
            byteOrder: 'ABCD',
            signed: true,
            registerRange: 'Electrical',
            registerIndex: 0,
            wordCount: 2
          }
        ]
      }
    }
  ],
  tags: ['test', 'mock'],
  createdBy: {
    userId: 'user-123',
    username: 'testuser',
    email: 'test@example.com'
  },
  lastSeen: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  toObject: jest.fn().mockImplementation(function() { return this; }),
  toJSON: jest.fn().mockImplementation(function() { return this; }),
};

// Create a second mock device for testing device groups
const mockDevice2 = {
  ...mockDevice,
  _id: 'device-456',
  name: 'Test Device 2',
  connectionSetting: {
    connectionType: 'rtu',
    rtu: {
      serialPort: '/dev/ttyS0',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      slaveId: 2
    }
  }
};

// Mock Device model
const DeviceMock = {
  findById: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockDevice),
    select: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockDevice)
    })),
    populate: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockDevice)
    })),
  })),
  findOne: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockDevice),
    select: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockDevice)
    })),
  })),
  find: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue([mockDevice, mockDevice2]),
    limit: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockDevice, mockDevice2])
    })),
    skip: jest.fn().mockImplementation(() => ({
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockDevice, mockDevice2])
      }))
    })),
    sort: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockDevice, mockDevice2]),
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockDevice, mockDevice2])
      })),
      skip: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue([mockDevice, mockDevice2])
        }))
      })),
    })),
  })),
  create: jest.fn().mockResolvedValue(mockDevice),
  findByIdAndUpdate: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockDevice)
  })),
  findByIdAndDelete: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue({ _id: 'device-123' })
  })),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
  countDocuments: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(2)
  })),
};

// Add prototype methods
DeviceMock.prototype = {
  save: jest.fn().mockResolvedValue(mockDevice),
};

export { mockDevice, mockDevice2, DeviceMock };