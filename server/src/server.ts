import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './client/models/User';
import path from 'path';
import { connectClientToDB } from './client/config/db';
import { amxModels } from './amx/models';
import { clientRouter } from './client/routes';
import connectAmxToDB from './amx/config/db';
import { amxRouter } from './amx/routes';


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
    const amxDBConnection = amxModels(deviceDriveDB);
    
    // Add library models to app locals
    app.locals.libraryModels = amxDBConnection;


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