// src/config/database.ts
import mongoose from 'mongoose';
import { createDeviceModel } from '../client/models/device.model';
import { createDeviceDriverModel } from '../amx/models/deviceDriver.model';
import { createDeviceTypeModel } from '../amx/models/deviceType.model';
import HistoricalData from '../client/models/historicalData.model';
import RealtimeData from '../client/models/realtimeData.model';
import { createScheduleModels } from '../client/models/schedule.model';
import EventLog from '../client/models/eventLog.model';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connection instances
let clientConnection: mongoose.Connection | null = null;
let amxConnection: mongoose.Connection | null = null;

// Models
let clientModels: any = {};
let amxModels: any = {};

/**
 * Initialize database connections and models
 */
export const initializeDatabases = async () => {
  try {
    // Connect to client database with timeout and connection options
    const clientUri = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log('Connecting to client database:', clientUri);
    clientConnection = await mongoose.createConnection(clientUri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });
    
    // Wait for client connection to be ready
    if (clientConnection.readyState !== 1) {
      await new Promise((resolve) => {
        clientConnection!.once('open', resolve);
      });
    }
    console.log('Client database connected successfully');

    // Connect to AMX library database with timeout and connection options
    const amxUri = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log('Connecting to AMX library database:', amxUri);
    amxConnection = await mongoose.createConnection(amxUri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });
    
    // Wait for AMX connection to be ready
    if (amxConnection.readyState !== 1) {
      await new Promise((resolve) => {
        amxConnection!.once('open', resolve);
      });
    }
    console.log('AMX library database connected successfully');

    // Initialize client models using the clientModels function from index.model.ts
    const { clientModels: createClientModels } = await import('../client/models/index.model');
    clientModels = createClientModels(clientConnection);

    // Initialize AMX models with AMX connection
    const { amxModels: createAmxModels } = await import('../amx/models/index.model');
    amxModels = createAmxModels(amxConnection);

    return { clientConnection, amxConnection, clientModels, amxModels };
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

/**
 * Connect to client database (replaces client/config/db.ts)
 */
export const connectClientToDB = async (): Promise<mongoose.Connection> => {
  if (clientConnection && clientConnection.readyState === 1) {
    return clientConnection;
  }

  try {
    const mainDBUri = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log('Connecting to client database...');

    // Configure Mongoose
    mongoose.set('strictQuery', false);

    // Create connection
    clientConnection = await mongoose.createConnection(mainDBUri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });

    console.log('Client database connected successfully');

    // Initialize database indexes
    await initializeClientIndexes(clientConnection);

    return clientConnection;
  } catch (error) {
    console.error('Error connecting to client database:', error);
    throw error;
  }
};

/**
 * Initialize client database indexes for better query performance
 */
const initializeClientIndexes = async (connection: mongoose.Connection): Promise<void> => {
  try {
    if (connection.readyState !== 1) {
      console.warn('Database not connected, skipping index creation');
      return;
    }

    // Get or create Device model
    const DeviceModel = clientModels.Device || createDeviceModel(connection);

    // Create indexes
    try {
      await DeviceModel.collection.createIndex({ name: 1 }, { unique: true });
      await DeviceModel.collection.createIndex({ deviceDriverId: 1 });
      await DeviceModel.collection.createIndex({ usage: 1 });
      await DeviceModel.collection.createIndex({ tags: 1 });

      console.log('Database indexes created successfully');
    } catch (indexError) {
      console.error('Error creating specific index:', indexError);
      // Continue even if one index fails
    }
  } catch (error) {
    console.error('Error creating database indexes:', error);
    // Don't throw error here to allow application to start even if indexes fail
  }
};

/**
 * Connect to AMX database (replaces amx/config/db.ts)
 */
export const connectAmxToDB = async (): Promise<mongoose.Connection> => {
  if (amxConnection && amxConnection.readyState === 1) {
    return amxConnection;
  }

  try {
    const libraryDBUri = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log('Connecting to AMX library database...');

    // Create a separate connection for the AMX library database
    amxConnection = await mongoose.createConnection(libraryDBUri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });

    console.log('AMX library database connected successfully');
    return amxConnection;
  } catch (error) {
    console.error('Error connecting to AMX library database:', error);
    throw error;
  }
};

/**
 * Get client database connection
 */
export const getClientConnection = () => clientConnection;

/**
 * Get AMX database connection
 */
export const getAmxConnection = () => amxConnection;

/**
 * Get client models
 */
export const getClientModels = () => clientModels;

/**
 * Get AMX models
 */
export const getAmxModels = () => amxModels;

/**
 * Close all database connections
 */
export const closeConnections = async () => {
  if (clientConnection) await clientConnection.close();
  if (amxConnection) await amxConnection.close();
  console.log('All database connections closed');
};

export default {
  initializeDatabases,
  connectClientToDB,
  connectAmxToDB,
  getClientConnection,
  getAmxConnection,
  getClientModels,
  getAmxModels,
  closeConnections,
};
