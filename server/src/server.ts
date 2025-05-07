// server/src/server.ts
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabases } from './config/database';
import { clientRouter } from './client/routes';
import { amxRouter } from './amx/routes';
import { initializeDevicePolling } from './client/services/deviceInitializer';
// Import the device controller for explicit route registration
import * as deviceController from './client/controllers/deviceController';

// Load environment variables
dotenv.config();
console.log('Environment loaded, PORT:', process.env.PORT || '3333 (default)');

// Create Express app
const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3333', 10);

// Middleware
app.use(cors());
app.use(express.json());
console.log('Middleware configured');

// Database Connection and Server Start
const startServer = async () => {
  console.log('Attempting to connect to databases...');
  try {
    // Initialize database connections and models
    const { clientConnection, amxConnection, clientModels, amxModels } =
      await initializeDatabases();

    // Store connections and models in app.locals for use throughout the application
    app.locals.mainDB = clientConnection;
    app.locals.libraryDB = amxConnection;
    app.locals.clientModels = clientModels;
    app.locals.libraryModels = amxModels;

    // Add middleware to ensure device model is always available
    app.use((req, res, next) => {
      if (req.app.locals.clientModels?.Device) {
        // Cache the device model for quicker access
        req.app.locals.cachedDeviceModel = req.app.locals.clientModels.Device;
      }
      next();
    });

    // API routes with explicit route mapping for better debugging
    console.log('Setting up API routes...');

    // Mounting client API routes
    app.use('/client/api', clientRouter);
    console.log(`✓ Mounted client API routes at /client/api`);

    // Mounting AMX API routes
    app.use('/amx/api', amxRouter);
    console.log(`✓ Mounted AMX API routes at /amx/api`);

    // Add explicit route for device test endpoint to ensure it works
    // This is a temporary fix until we resolve the route registration issue
    app.post(
      '/client/api/devices/:id/test',
      deviceController.testDeviceConnection as express.RequestHandler,
    );
    console.log(`✓ Added explicit device test endpoint at /client/api/devices/:id/test`);

    app.get('/', (req, res) => {
      res.send('MacSys Backend is working');
    });

    // Health check endpoint
    app.get('/health', async (req, res) => {
      const health = {
        status: 'UP',
        timestamp: new Date(),
        services: {
          clientDB: clientConnection.readyState === 1 ? 'UP' : 'DOWN',
          amxDB: amxConnection.readyState === 1 ? 'UP' : 'DOWN',
        },
      };

      const httpStatus =
        health.services.clientDB === 'UP' && health.services.amxDB === 'UP' ? 200 : 503;

      res.status(httpStatus).json(health);
    });

    // Serve static assets in production
    if (process.env.NODE_ENV === 'production') {
      // Set static folder - point to Vite build output
      app.use(express.static(path.join(__dirname, '../../../client/dist')));

      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(__dirname, '../../../client/dist/index.html'));
      });
      console.log('Static assets configured for production');
    }

    // Start server
    const server = app.listen(PORT, async () => {
      console.log(`MACSYS Backend running on port ${PORT}`);
      console.log(
        `- Client DB: connected (${process.env.MONGO_URI || 'mongodb://localhost:27017/client'})`,
      );
      console.log(
        `- AMX DB: connected (${process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx'})`,
      );

      // Initialize device polling
      try {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const developerMode = isDevelopment && process.env.ENABLE_DEVELOPER_MODE === 'true';
        await initializeDevicePolling(30000, developerMode);

        if (developerMode) {
          console.log(
            'Developer mode enabled: Some physical devices may be skipped to prevent errors',
          );
        }
      } catch (err) {
        console.error('Failed to initialize device polling:', err);
      }
    });

    return server;
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

export { app, startServer };
