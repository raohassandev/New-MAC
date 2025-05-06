import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserMock } from './mocks/userMock';
import { DeviceMock } from './mocks/deviceMock';
import { ProfileMock } from './mocks/profileMock';

// Load environment variables
dotenv.config();

// Set test specific environment variables
process.env.NODE_ENV = 'test';
process.env.MONGO_URI_TEST = 'mongodb://localhost:27017/macsys_test';
process.env.JWT_SECRET = 'test-jwt-secret';

// Global setup
beforeAll(async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI_TEST as string);
      console.log('Successfully connected to test MongoDB');
    }
  } catch (error) {
    console.error('Error connecting to test MongoDB:', error);
    process.exit(1);
  }
});

// Global teardown
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('Closed MongoDB connection');
  }
});

// Mocks for environment variables
jest.mock('../config/database', () => ({
  connectClientToDB: jest.fn().mockResolvedValue({}),
  connectAmxToDB: jest.fn().mockResolvedValue({}),
  __esModule: true,
  default: {
    connectClientToDB: jest.fn().mockResolvedValue({}),
    connectAmxToDB: jest.fn().mockResolvedValue({}),
  },
}));

// Mock JWT for testing
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn().mockImplementation((token, secret, callback) => {
    if (token === 'invalid-token') {
      return callback(new Error('jwt invalid'), null);
    }
    return callback(null, { id: 'test-user-id' });
  }),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Model mocks are imported at the top of the file

// Mock the User model
jest.mock('../client/models/User', () => ({
  __esModule: true,
  default: UserMock,
}));

// Mock the Device model
jest.mock('../client/models/Device', () => ({
  __esModule: true,
  default: DeviceMock,
}));

// Mock the Profile model
jest.mock('../client/models/Profile', () => ({
  __esModule: true,
  default: ProfileMock,
}));
