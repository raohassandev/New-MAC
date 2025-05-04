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
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;

  // Check if token exists in header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Check if it's a demo token (tokens with a specific format from the client app)
      if (token.split('.').length === 3 && token.includes('demo_signature')) {
        console.log('Demo token detected, allowing access');
        // Create a demo user for development purposes
        req.user = {
          _id: 'demo_user_id',
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
        return next();
      }

      // For real tokens, verify with JWT
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'fallbacksecret'
        ) as jwt.JwtPayload;

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
          return res.status(401).json({ message: 'User not found' });
        }

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
      permissions.includes(permission)
    );

    if (!hasPermission) {
      return res
        .status(403)
        .json({ message: 'Access denied, insufficient permissions' });
    }

    next();
  };
};
