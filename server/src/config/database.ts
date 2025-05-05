// src/config/database.js
const mongoose = require('mongoose');
const { createDeviceModel } = require('../client/models/Device');
const { createDeviceDriverModel } = require('../amx/models/deviceDriverModel');
const { createDeviceTypeModel } = require('../amx/models/deviceTypeModel');

// Connection instances
let clientConnection = null;
let amxConnection = null;

// Models
let clientModels = {};
let amxModels = {};

/**
 * Initialize database connections and models
 */
const initializeDatabases = async () => {
  try {
    // Connect to client database
    const clientUri = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
    console.log('Connecting to client database:', clientUri);
    clientConnection = await mongoose.createConnection(clientUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Client database connected successfully');

    // Connect to AMX library database
    const amxUri = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    console.log('Connecting to AMX library database:', amxUri);
    amxConnection = await mongoose.createConnection(amxUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('AMX library database connected successfully');

    // Initialize client models with client connection
    clientModels = {
      Device: createDeviceModel(clientConnection),
      // Add other client models here
    };

    // Initialize AMX models with AMX connection
    amxModels = {
      DeviceDriver: createDeviceDriverModel(amxConnection),
      DeviceType: createDeviceTypeModel(amxConnection)
      // Add other AMX models here
    };

    return { clientConnection, amxConnection, clientModels, amxModels };
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

/**
 * Get client database connection
 */
const getClientConnection = () => clientConnection;

/**
 * Get AMX database connection
 */
const getAmxConnection = () => amxConnection;

/**
 * Get client models
 */
const getClientModels = () => clientModels;

/**
 * Get AMX models
 */
const getAmxModels = () => amxModels;

/**
 * Close all database connections
 */
const closeConnections = async () => {
  if (clientConnection) await clientConnection.close();
  if (amxConnection) await amxConnection.close();
  console.log('All database connections closed');
};

module.exports = {
  initializeDatabases,
  getClientConnection,
  getAmxConnection,
  getClientModels,
  getAmxModels,
  closeConnections
};