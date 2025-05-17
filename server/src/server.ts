// server/src/server.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { initializeDatabases } from './config/database';
import { clientRouter } from './client/routes/index.routes';
import { amxRouter } from './amx/routes/index.routes';
import { apiLogger } from './utils/logger';
// Import the device controller for explicit route registration
import * as deviceController from './client/controllers/device.controller';
// Import debug middleware
import { debugRequestMiddleware } from './middleware/debug.middleware';

// Load environment variables
dotenv.config();
console.log('Environment loaded, PORT:', process.env.PORT || '3333 (default)');

// Create Express app
const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3333', 10);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Morgan logger
// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Configure API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req: Request, res: Response, next: NextFunction) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      message: 'Too many requests, please try again later',
      rateLimit: true,
      retryAfter: Math.floor(15 * 60)
    });
  }
});

// Configure stricter rate limiting for device read operations
const deviceReadLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  limit: 5, // limit each IP to 5 device read requests per 10 seconds
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many device read requests, please slow down your polling rate',
  handler: (req: Request, res: Response, next: NextFunction) => {
    console.warn(`Device read rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      message: 'Too many device read requests, please slow down your polling rate',
      rateLimit: true,
      retryAfter: 10
    });
  }
});

// Error handler for tracking API errors
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`API Error: ${err.message}`);
  console.error(`Route: ${req.method} ${req.path}`);
  console.error(`IP: ${req.ip}`);
  console.error(`Body: ${JSON.stringify(req.body)}`);
  console.error(`Stack: ${err.stack}`);
  
  res.status(500).json({
    message: 'An error occurred while processing your request',
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
};

// Middleware
app.use(cors({
  origin: ['http://localhost:5173' , 'http://localhost:5174' ,'http://localhost:5175' ],
  credentials: true
}));
app.use(express.json());

// Add Morgan logger
app.use(morgan('combined', { stream: accessLogStream })); // Log to file
app.use(morgan('dev')); // Also log to console with concise format

// Add debug middleware
app.use(debugRequestMiddleware);

// Apply rate limiting to all requests
app.use(apiLimiter);

// Apply stricter rate limiting to device read operations
app.use('/client/api/devices/:id/read', (req, res, next) => {
  // Check if the path matches the device read pattern
  if (req.path.match(/\/client\/api\/devices\/[^\/]+\/read/)) {
    return deviceReadLimiter(req, res, next);
  }
  next();
});



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

    // Mounting client API routes
    app.use('/client/api', clientRouter);
    console.log(`✓ Mounted client API routes at /client/api`);

    // Mounting AMX API routes
    app.use('/amx/api', amxRouter);
    console.log(`✓ Mounted AMX API routes at /amx/api`);
    
    // Note: Monitoring routes are now part of the client API routes
    // Event logging is available at /client/api/monitoring
    console.log(`✓ Event logging available at /client/api/monitoring`);

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
    
    // Add error tracking middleware last
    app.use(errorHandler);
  

    // Start server
    const server = app.listen(PORT, async () => {
      console.log(`MACSYS Backend running on port ${PORT}`);
      console.log(
        `- Client DB: connected (${process.env.MONGO_URI || 'mongodb://localhost:27017/client'})`,
      );
      console.log(
        `- AMX DB: connected (${process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx'})`,
      );

      // Initialize the automatic polling service for all enabled devices
      try {
        // Import the auto-polling service
        const { startAutoPollingService } = require('./client/services/autoPolling.service');
        
        // Start the auto-polling service
        // await startAutoPollingService();
        console.log('✅ Auto-polling service started - all enabled devices will be polled automatically');
      } catch (pollingError) {
        console.warn('⚠️ Failed to start auto-polling service:', pollingError);
        console.log('⚠️ Auto-polling is disabled. Device polling only starts when explicitly requested by the frontend or API.');
      }

      // Initialize the schedule processor service
      try {
        // Import the schedule processor service
        const { ScheduleProcessorService } = require('./client/services/scheduleProcessor.service');
        
        // Create a mock request object with app locals for the schedule processor
        const scheduleProcessorReq = {
          app: {
            locals: app.locals
          }
        };
        
        // Start the schedule processor
        ScheduleProcessorService.start(scheduleProcessorReq);
        console.log('✅ Schedule processor service started - schedules will be processed automatically every minute');
      } catch (scheduleError) {
        console.warn('⚠️ Failed to start schedule processor service:', scheduleError);
        console.log('⚠️ Schedule processing is disabled. Schedules will not be applied automatically.');
      }
    });

    return server;
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

export { app, startServer };
