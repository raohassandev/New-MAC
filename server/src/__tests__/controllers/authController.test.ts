import { Request, Response } from 'express';
import { login, register, getMe } from '../../controllers/authController';
import User from '../../client/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../middleware/errorMiddleware', () => ({
  errorHandler: jest.fn((err, req, res) => {
    res.status(500).json({ message: 'Server error', error: err.message });
  }),
}));

describe('Auth Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockUser: any;

  beforeEach(() => {
    req = {
      body: {},
      user: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockUser = {
      _id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      permissions: ['view_devices', 'view_profiles'],
      toObject: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('login function', () => {
    test('should authenticate user and return token with user data', async () => {
      // Setup mocks
      req.body = {
        email: 'test@example.com',
        password: 'correct-password',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (jwt.sign as jest.Mock).mockReturnValueOnce('mock-jwt-token');

      // Execute function
      await login(req as Request, res as Response);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', undefined);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'test-user-id' },
        expect.any(String),
        expect.any(Object),
      );

      expect(res.json).toHaveBeenCalledWith({
        _id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        permissions: ['view_devices', 'view_profiles'],
        token: 'mock-jwt-token',
      });
    });

    test('should return 401 for invalid email', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'any-password',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      await login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test('should return 401 for incorrect password', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('register function', () => {
    test('should create new user and return token with user data', async () => {
      // Setup mocks
      req.body = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'new-password',
      };

      const createdUser = {
        ...mockUser,
        _id: 'new-user-id',
        name: 'New User',
        email: 'newuser@example.com',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValueOnce('mock-salt');
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-password');
      (User.create as jest.Mock).mockResolvedValueOnce(createdUser);
      (jwt.sign as jest.Mock).mockReturnValueOnce('mock-jwt-token');

      // Execute function
      await register(req as Request, res as Response);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 'mock-salt');
      expect(User.create).toHaveBeenCalledWith({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'hashed-password',
        role: 'user',
        permissions: ['view_devices', 'view_profiles'],
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'new-user-id',
          name: 'New User',
          email: 'newuser@example.com',
          token: 'mock-jwt-token',
        }),
      );
    });

    test('should return 400 if required fields are missing', async () => {
      req.body = {
        name: 'New User',
        // Missing email and password
      };

      await register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please fill all fields' });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    test('should return 400 if user already exists', async () => {
      req.body = {
        name: 'Existing User',
        email: 'test@example.com',
        password: 'new-password',
      };

      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      await register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
    });
  });

  describe('getMe function', () => {
    test('should return current user data', async () => {
      req.user = { id: 'test-user-id' };

      (User.findById as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(mockUser),
      });

      await getMe(req as Request, res as Response);

      expect(User.findById).toHaveBeenCalledWith('test-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    test('should return 404 if user not found', async () => {
      req.user = { id: 'nonexistent-user-id' };

      (User.findById as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(null),
      });

      await getMe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });
});
