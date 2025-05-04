import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mockUser, mockRegularUser } from '../mocks/userMock';
import { mockDevice, mockDevice2 } from '../mocks/deviceMock';
import { mockProfile } from '../mocks/profileMock';

// Variable to store MongoDB memory server instance
let mongoServer: MongoMemoryServer;

/**
 * Setup function for E2E tests
 * Creates an in-memory MongoDB server and connects to it
 */
export const setupE2ETest = async () => {
  // Create a new MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  return mongoUri;
};

/**
 * Teardown function for E2E tests
 * Closes the MongoDB connection and stops the memory server
 */
export const teardownE2ETest = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Generate auth token for testing
 */
export const generateAuthToken = (userId: string = 'user-123', role: string = 'admin') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
};

/**
 * Setup mock data for tests
 * Creates users, devices, and profiles in the database
 */
export const setupMockData = async () => {
  // Mock the necessary models for the tests
  jest.mock('../../models/User', () => ({
    __esModule: true,
    default: {
      create: jest.fn().mockResolvedValue(mockUser),
      findById: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockUser)
      })),
      findOne: jest.fn().mockImplementation((criteria) => {
        if (criteria.email === 'regular@example.com') {
          return {
            exec: jest.fn().mockResolvedValue(mockRegularUser)
          };
        }
        return {
          exec: jest.fn().mockResolvedValue(mockUser)
        };
      }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
    }
  }));

  jest.mock('../../models/Device', () => ({
    __esModule: true,
    default: {
      create: jest.fn().mockResolvedValue(mockDevice),
      findById: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockDevice)
      })),
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockDevice, mockDevice2])
      })),
      findByIdAndUpdate: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue({ ...mockDevice, name: 'Updated Device' })
      })),
      findByIdAndDelete: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue({ _id: mockDevice._id })
      })),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
    }
  }));

  jest.mock('../../models/Profile', () => ({
    __esModule: true,
    default: {
      create: jest.fn().mockResolvedValue(mockProfile),
      findById: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockProfile)
      })),
      find: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([mockProfile])
      })),
      findByIdAndUpdate: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue({ ...mockProfile, name: 'Updated Profile' })
      })),
      findByIdAndDelete: jest.fn().mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue({ _id: mockProfile._id })
      })),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    }
  }));

  // Mock JWT verification for authentication
  jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('test-token'),
    verify: jest.fn().mockImplementation((token, secret, callback) => {
      if (token === 'invalid-token') {
        return callback(new Error('jwt invalid'), null);
      }
      return callback(null, { id: 'user-123', role: 'admin' });
    }),
  }));

  // Mock bcryptjs for password hashing and comparison
  jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn().mockImplementation((password, hash) => {
      // Allow specific test passwords to work
      return Promise.resolve(
        password === 'correct-password' || 
        password === 'securepassword' || 
        password === 'adminpass' || 
        password === 'regularpass'
      );
    }),
  }));
};