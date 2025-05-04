import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './client/models/User';
import path from 'path';
import { connectClientToDB } from './client/config/db';
import { initLibraryModels } from './amx/models';

import { clientRouter } from './client/routes';
import connectAmxToDB from './amx/config/db';
import { amxRouter } from './amx/routes';

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
  app.use('/client/api', clientRouter);
  app.use('/amx/api', amxRouter);
  app.get('/', (req, res) => {
    res.send('MacSys Backend is working');
  });
  console.log('Routes configured');
} catch (error) {
  console.error('Error setting up routes:', error);
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
    const clientDB = await connectClientToDB();
    
    // Connect to library database
    const deviceDriveDB = await connectAmxToDB();
    
    // Store connections for use in other parts of the application
    app.locals.mainDB = clientDB;
    app.locals.libraryDB = deviceDriveDB;
    
    // Initialize library models with the library database connection
    const libraryModels = initLibraryModels(deviceDriveDB);
    
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