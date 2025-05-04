import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User';
import routes from './routes';
import path from 'path';
import { connectMainDB, createLibraryDBConnection } from './config/db';
import { initLibraryModels } from './models/library';

console.log('Starting MacSys backend server initialization...');

// Load environment variables
dotenv.config();
console.log('Environment loaded, PORT:', process.env.PORT || '3333 (default)');

// Create Express app
const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3333', 10);

// Middleware
try {
  app.use(cors());
  app.use(express.json());
  console.log('Middleware configured');
} catch (error) {
  console.error('Error setting up middleware:', error);
}

// Initialize admin user if none exists
const initAdminUser = async () => {
  try {
    console.log('Checking for admin user...');
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('Creating default admin user...');
      await User.create({
        name: 'Admin User',
        email: 'admin@macsys.com',
        password: 'admin123',
        role: 'admin',
        permissions: [
          'manage_devices',
          'manage_profiles',
          'manage_users',
          'view_analytics',
          'view_devices',
          'view_profiles',
        ],
      });
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// API routes
try {
  app.use('/api', routes);
  app.get('/', (req, res) => {
    res.send('MacSys Backend is working');
  });
  console.log('Routes configured');
} catch (error) {
  console.error('Error setting up routes:', error);
}

// Mock data for backward compatibility
try {
  app.get('/api/getDevices', (req: Request, res: Response) => {
    // Temporary mock data
    const devices = [
      {
        _id: '1',
        name: 'Server Room Cooler',
        ip: '192.168.1.100',
        port: 502,
        slaveId: 1,
        enabled: true,
        registers: [
          {
            name: 'Temperature',
            address: 0,
            length: 2,
            unit: '°C',
          },
        ],
      },
      {
        _id: '2',
        name: 'Office AC',
        ip: '192.168.1.101',
        port: 502,
        slaveId: 2,
        enabled: false,
        registers: [
          {
            name: 'Humidity',
            address: 2,
            length: 2,
            unit: '%',
          },
        ],
      },
    ];

    res.json(devices);
  });
  console.log('Mock data routes configured');
} catch (error) {
  console.error('Error setting up mock data routes:', error);
}

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  try {
    // Set static folder - point to Vite build output
    app.use(express.static(path.join(__dirname, '../../../client/dist')));

    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, '../../../client/dist/index.html'));
    });
    console.log('Static assets configured for production');
  } catch (error) {
    console.error('Error setting up static assets:', error);
  }
}

// Database Connection and Server Start
const startServer = async () => {
  console.log('Attempting to connect to databases...');
  try {
    // Connect to main database
    const mainDB = await connectMainDB();
    
    // Connect to library database
    const libraryDB = await createLibraryDBConnection();
    
    // Store connections for use in other parts of the application
    app.locals.mainDB = mainDB;
    app.locals.libraryDB = libraryDB;
    
    // Initialize library models with the library database connection
    const libraryModels = initLibraryModels(libraryDB);
    
    // Add library models to app locals
    (app.locals as any).libraryModels = libraryModels;

    // Initialize admin user when MongoDB connection is established
    await initAdminUser();

    // Start server after successful database connections
    app.listen(PORT, () => {
      console.log(`MacSys Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database connection error:', err);
    console.log('Attempting to start server without database connections...');

    // Try to start server even if database connections fail
    app.listen(PORT, () => {
      console.log(`MacSys Backend running on port ${PORT} (without database connections)`);
    });
  }
};

export { app, startServer };