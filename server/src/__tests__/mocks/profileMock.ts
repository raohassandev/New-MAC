// @ts-nocheck
import { jest } from '@jest/globals';

// Create mock profile data
const mockProfile = {
  _id: 'profile-123',
  name: 'Test Profile',
  description: 'A test profile for unit testing',
  type: 'reading',
  registers: [
    { address: 1, name: 'Temperature', dataType: 'float', unit: 'C' },
    { address: 2, name: 'Pressure', dataType: 'int', unit: 'Pa' }
  ],
  schedule: {
    frequency: 60,
    startTime: '08:00',
    endTime: '20:00',
    daysOfWeek: [1, 2, 3, 4, 5]
  },
  createdBy: 'user-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  toObject: jest.fn().mockImplementation(function() { return this; }),
  toJSON: jest.fn().mockImplementation(function() { return this; }),
};

// Mock Profile model
const ProfileMock = {
  findById: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockProfile),
    select: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockProfile)
    })),
    populate: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockProfile)
    })),
  })),
  findOne: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockProfile),
    select: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockProfile)
    })),
  })),
  find: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue([mockProfile]),
    limit: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockProfile])
    })),
    skip: jest.fn().mockImplementation(() => ({
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockProfile])
      }))
    })),
    sort: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockProfile]),
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockProfile])
      })),
      skip: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue([mockProfile])
        }))
      })),
    })),
  })),
  create: jest.fn().mockResolvedValue(mockProfile),
  findByIdAndUpdate: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockProfile)
  })),
  findByIdAndDelete: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue({ _id: 'profile-123' })
  })),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  countDocuments: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(1)
  })),
};

// Add prototype methods
ProfileMock.prototype = {
  save: jest.fn().mockResolvedValue(mockProfile),
};

export { mockProfile, ProfileMock };