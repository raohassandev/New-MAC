// @ts-nocheck
import { jest } from '@jest/globals';

// Create mock device data
const mockDevice = {
  _id: 'device-123',
  name: 'Test Device',
  ip: '192.168.1.100',
  port: 502,
  slaveId: 1,
  connectionType: 'tcp',
  enabled: true,
  registers: [
    { address: 1, name: 'Temperature', dataType: 'float', unit: 'C' }
  ],
  tags: ['test', 'mock'],
  lastSeen: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  toObject: jest.fn().mockImplementation(function() { return this; }),
  toJSON: jest.fn().mockImplementation(function() { return this; }),
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
    exec: jest.fn().mockResolvedValue([mockDevice]),
    limit: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockDevice])
    })),
    skip: jest.fn().mockImplementation(() => ({
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockDevice])
      }))
    })),
    sort: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockDevice]),
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockDevice])
      })),
      skip: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue([mockDevice])
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
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  countDocuments: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(1)
  })),
};

// Add prototype methods
DeviceMock.prototype = {
  save: jest.fn().mockResolvedValue(mockDevice),
};

export { mockDevice, DeviceMock };