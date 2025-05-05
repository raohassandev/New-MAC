import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './client/models/User';
import path from 'path';
import { connectClientToDB } from './client/config/db';
import { amxModels } from './amx/models';
import { clientModels } from './client/models';
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

// Add health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date(),
    services: {
      clientDB: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
      amxDB: req.app.locals.libraryDB?.readyState === 1 ? 'UP' : 'DOWN'
    }
  };
  
  const httpStatus = health.services.clientDB === 'UP' && 
                     health.services.amxDB === 'UP' ? 200 : 503;
  
  res.status(httpStatus).json(health);
});

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
    // Connect to client database (primary)
    const clientDB = await connectClientToDB();
    console.log('Successfully connected to client database');
    
    // Connect to AMX library database (secondary)
    const amxDB = await connectAmxToDB();
    console.log('Successfully connected to AMX library database');
    
    // Store connections for use in other parts of the application
    app.locals.mainDB = clientDB;
    app.locals.libraryDB = amxDB;
    
    // Initialize library models with the library database connection
    const amxDBConnection = amxModels(amxDB);
    
    // Initialize client models with the client database connection
    const clientDBModels = clientModels(clientDB);
    
    // Add models to app locals
    app.locals.libraryModels = amxDBConnection;
    app.locals.clientModels = clientDBModels;

    // Start server after successful database connections
    app.listen(PORT, () => {
      console.log(`MACSYS Backend running on port ${PORT}`);
      console.log(`- Client DB: connected (${process.env.MONGO_URI || 'mongodb://localhost:27017/client'})`);
      console.log(`- AMX DB: connected (${process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx'})`);
    });
  } catch (err) {
    console.error('Database connection error:', err);
    console.log('Attempting to start server without database connections...');

    // Try to start server even if database connections fail
    app.listen(PORT, () => {
      console.log(`MACSYS Backend running on port ${PORT} (without database connections)`);
      console.log('WARNING: The server is running without database connections. Some features may not work.');
    });
  }
};

export { app, startServer };