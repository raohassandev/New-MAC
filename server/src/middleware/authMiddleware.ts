import { NextFunction, Request, Response } from 'express';

import { User } from '../client/models';
import jwt from 'jsonwebtoken';

// Add custom property to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Protect routes
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  // Debug info
  console.log('Checking authorization, headers:', req.headers.authorization);

  // Check if token exists in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token found:', token.substring(0, 10) + '...');

      // Check if it's a demo token (tokens with a specific format from the client app)
      if (token.split('.').length === 3 && token.includes('demo_signature')) {
        console.log('Demo token detected, allowing access');
        // Create a demo user for development purposes
        req.user = {
          _id: 'demo_user_id',
          id: 'demo_user_id', // Add id field for both property access patterns
          name: 'Demo User',
          email: 'demo@example.com',
          role: 'admin',
          permissions: [
            'view_devices',
            'add_devices',
            'edit_devices',
            'delete_devices',
            'manage_devices',
            'view_profiles',
            'add_profiles',
            'edit_profiles',
            'delete_profiles',
            'manage_profiles',
          ],
        };
        console.log('Created demo user:', req.user);
        return next();
      }

      // For real tokens, verify with JWT
      try {
        console.log('Verifying JWT token');
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'fallbacksecret',
        ) as jwt.JwtPayload;

        console.log('Token decoded:', decoded);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');
        console.log('User found from database:', user);

        if (!user) {
          console.log('User not found in database, creating temporary admin user');
          // For development - create a temporary user if token is valid but user isn't in DB
          req.user = {
            _id: decoded.id || 'temp_user_id',
            id: decoded.id || 'temp_user_id',
            name: decoded.name || 'Temporary User',
            email: decoded.email || 'temp@example.com',
            role: 'admin',
            permissions: [
              'view_devices',
              'add_devices',
              'edit_devices',
              'delete_devices',
              'manage_devices',
            ],
          };
          return next();
        }

        // Ensure user has both _id and id fields for consistent access
        req.user = user;
        if (!req.user.id && req.user._id) {
          req.user.id = req.user._id.toString();
        }

        console.log('User set in request:', req.user);
        next();
      } catch (jwtError) {
        console.error('JWT verification error:', jwtError);
        res.status(401).json({ message: 'Invalid token' });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Not authorized' });
    }
  } else if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Check user permissions
export const checkPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Check if user has any of the required permissions
    const hasPermission = req.user.permissions.some((permission: string) =>
      permissions.includes(permission),
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied, insufficient permissions' });
    }

    next();
  };
};
