import { Request, Response } from 'express';
import { protect, checkPermission } from '../../middleware/authMiddleware';

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

// Apply the mocks before importing
jest.mock('../../models/User', () => ({
  findById: jest.fn().mockImplementation(() => ({
    select: jest.fn().mockReturnThis() // This allows chaining .select()
  }))
}));

// Import after mocking
import jwt from 'jsonwebtoken';
import User from '../../client/models/User';

describe('Auth Middleware', () => {
  // Mocks and setup
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    
    // Reset mock implementations
    jest.clearAllMocks();
  });

  describe('protect middleware', () => {
    test('should return 401 if no token is provided', async () => {
      await protect(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if token format is invalid', async () => {
      req.headers = { authorization: 'InvalidFormat' };
      
      await protect(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should recognize demo token format', async () => {
      req.headers = { authorization: 'Bearer part1.part2.demo_signature' };
      
      await protect(req as Request, res as Response, next);
      
      expect(req.user).toEqual({
        _id: 'demo_user_id',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'admin',
        permissions: expect.arrayContaining(['view_devices', 'manage_devices']),
      });
      expect(next).toHaveBeenCalled();
    });

    test('should verify JWT token and call next if valid', async () => {
      req.headers = { authorization: 'Bearer valid.jwt.token' };
      
      const mockUser = { _id: 'real_user_id', name: 'Real User' };
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 'real_user_id' });
      
      // Override the default mock for this specific test
      (User.findById as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockResolvedValue(mockUser)
      }));
      
      await protect(req as Request, res as Response, next);
      
      expect(jwt.verify).toHaveBeenCalledWith('valid.jwt.token', expect.any(String));
      expect(User.findById).toHaveBeenCalledWith('real_user_id');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    test('should return 401 if JWT verification fails', async () => {
      req.headers = { authorization: 'Bearer invalid.jwt.token' };
      
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      await protect(req as Request, res as Response, next);
      
      expect(jwt.verify).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if user not found', async () => {
      req.headers = { authorization: 'Bearer valid.jwt.token' };
      
      (jwt.verify as jest.Mock).mockReturnValueOnce({ id: 'nonexistent_user_id' });
      
      // Return null for user not found
      (User.findById as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockResolvedValue(null)
      }));
      
      await protect(req as Request, res as Response, next);
      
      expect(User.findById).toHaveBeenCalledWith('nonexistent_user_id');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkPermission middleware', () => {
    test('should call next if user has required permission', () => {
      req.user = { permissions: ['view_devices', 'edit_devices'] };
      
      const middleware = checkPermission(['view_devices']);
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should call next if user has any of the required permissions', () => {
      req.user = { permissions: ['view_devices', 'edit_devices'] };
      
      const middleware = checkPermission(['delete_devices', 'edit_devices']);
      middleware(req as Request, res as Response, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if user has none of the required permissions', () => {
      req.user = { permissions: ['view_devices', 'edit_devices'] };
      
      const middleware = checkPermission(['delete_devices', 'manage_users']);
      middleware(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Access denied, insufficient permissions' 
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if user is not authenticated', () => {
      req.user = undefined;
      
      const middleware = checkPermission(['view_devices']);
      middleware(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});