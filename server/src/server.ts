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
import { initializeDevicePolling } from './client/services/deviceInitializer';

// Load environment variables
dotenv.config();
console.log('Environment loaded, PORT:', process.env.PORT || '3334 (default)');

// Create Express app
const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3334', 10); // Changed to 3334 to avoid conflicts

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

// Add a debug endpoint for database check
app.get('/debug/db', async (req, res) => {
  try {
    // Check all connections
    const connectionInfo = {
      defaultConnection: {
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.name,
        models: mongoose.modelNames()
      },
      clientDB: req.app.locals.mainDB ? {
        readyState: req.app.locals.mainDB.readyState,
        name: req.app.locals.mainDB.name,
        models: req.app.locals.mainDB.modelNames?.() || []
      } : null,
      amxDB: req.app.locals.libraryDB ? {
        readyState: req.app.locals.libraryDB.readyState,
        name: req.app.locals.libraryDB.name,
        models: req.app.locals.libraryDB.modelNames?.() || []
      } : null,
      clientModels: req.app.locals.clientModels ? 
        Object.keys(req.app.locals.clientModels).map(key => ({
          name: key,
          db: req.app.locals.clientModels[key].db?.name || 'unknown'
        })) : [],
      libraryModels: req.app.locals.libraryModels ?
        Object.keys(req.app.locals.libraryModels).map(key => ({
          name: key,
          db: req.app.locals.libraryModels[key].db?.name || 'unknown'
        })) : []
    };

    // Try to fetch one device directly from the client DB collection
    let deviceCount = 0;
    let deviceSample = null;
    if (req.app.locals.mainDB?.readyState === 1) {
      try {
        const devices = await req.app.locals.mainDB.collection('devices').find({}).limit(1).toArray();
        deviceCount = await req.app.locals.mainDB.collection('devices').countDocuments();
        deviceSample = devices[0] ? {
          _id: devices[0]._id,
          name: devices[0].name,
          make: devices[0].make,
          model: devices[0].model
        } : null;
      } catch (dbError) {
        console.error('Error fetching devices from client DB:', dbError);
      }
    }

    res.json({
      timestamp: new Date(),
      connections: connectionInfo,
      devices: {
        count: deviceCount,
        sample: deviceSample
      }
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      error: 'Error checking database connections',
      message: error.message || 'Unknown error'
    });
  }
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
  console.log(`Server configured to use port: ${PORT}`);
  console.log(`Port source: ${process.env.PORT ? 'Environment variable' : 'Default value (3334)'}`);
  
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
    const server = app.listen(PORT, async () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : PORT;
      
      console.log(`MACSYS Backend running on port ${actualPort}`);
      console.log(`Server address: ${JSON.stringify(server.address())}`);
      console.log(`- Client DB: connected (${process.env.MONGO_URI || 'mongodb://localhost:27017/client'})`);
      console.log(`- AMX DB: connected (${process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx'})`);
      
      // Initialize device polling (default 30 second interval)
      try {
        // Check environment to determine if we should enable developer mode
        const isDevelopment = process.env.NODE_ENV === 'development';
        const developerMode = isDevelopment && process.env.ENABLE_DEVELOPER_MODE === 'true';
        
        // Enable developer mode if in development environment and the environment variable is set
        await initializeDevicePolling(30000, developerMode);
        
        if (developerMode) {
          console.log('Developer mode enabled: Some physical devices may be skipped to prevent errors');
        }
      } catch (err) {
        console.error('Failed to initialize device polling:', err);
      }
    });
    
    return server;
  } catch (err) {
    console.error('Database connection error:', err);
    console.log('Attempting to start server without database connections...');

    // Try to start server even if database connections fail
    const server = app.listen(PORT, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : PORT;
      
      console.log(`MACSYS Backend running on port ${actualPort} (without database connections)`);
      console.log(`Server address: ${JSON.stringify(server.address())}`);
      console.log('WARNING: The server is running without database connections. Some features may not work.');
    });
    
    return server;
  }
};

export { app, startServer };