// @ts-nocheck
import { jest } from '@jest/globals';

// Create mock user data
const mockUser = {
  _id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashed_password',
  role: 'admin',
  permissions: [
    'view_devices',
    'add_devices',
    'edit_devices',
    'delete_devices',
    'manage_profiles'
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  toObject: jest.fn().mockImplementation(function() { return this; }),
  toJSON: jest.fn().mockImplementation(function() { return this; }),
  matchPassword: jest.fn().mockResolvedValue(true),
};

// Mock regular user data
const mockRegularUser = {
  _id: 'user-456',
  name: 'Regular User',
  email: 'regular@example.com',
  password: 'hashed_password',
  role: 'user',
  permissions: [
    'view_devices'
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  toObject: jest.fn().mockImplementation(function() { return this; }),
  toJSON: jest.fn().mockImplementation(function() { return this; }),
  matchPassword: jest.fn().mockResolvedValue(true),
};

// Mock User model 
const UserMock = {
  findById: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockUser),
    select: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockUser)
    })),
  })),
  findOne: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockUser),
    select: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockUser)
    })),
  })),
  find: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue([mockUser, mockRegularUser]),
    limit: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockUser, mockRegularUser])
    })),
    skip: jest.fn().mockImplementation(() => ({
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockUser, mockRegularUser])
      }))
    })),
    sort: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue([mockUser, mockRegularUser]),
      limit: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockUser, mockRegularUser])
      })),
      skip: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue([mockUser, mockRegularUser])
        }))
      })),
    })),
  })),
  create: jest.fn().mockResolvedValue(mockUser),
  findByIdAndUpdate: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(mockUser)
  })),
  findByIdAndDelete: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue({ _id: 'user-123' })
  })),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
  countDocuments: jest.fn().mockImplementation(() => ({
    exec: jest.fn().mockResolvedValue(2)
  })),
};

// Setup mockUser with appropriate methods
mockUser.save = jest.fn().mockResolvedValue(mockUser);
mockRegularUser.save = jest.fn().mockResolvedValue(mockRegularUser);

// Setup specifics for authentication
const generateAuthToken = jest.fn().mockReturnValue('test-token');
mockUser.generateAuthToken = generateAuthToken;
mockRegularUser.generateAuthToken = generateAuthToken;

// Add prototype methods
UserMock.prototype = {
  save: jest.fn().mockResolvedValue(mockUser),
  matchPassword: jest.fn().mockResolvedValue(true),
  generateAuthToken: generateAuthToken
};

export { mockUser, mockRegularUser, UserMock };