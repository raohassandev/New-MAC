import mongoose from 'mongoose';
import { createDeviceDriverModel } from './deviceDriverModel';
import { createDeviceTypeModel } from './deviceTypeModel';

/**
 * Initialize and return all AMX library models using the provided database connection
 * This function creates models connected to the AMX database
 *
 * @param connection Mongoose connection to the AMX library database
 * @returns Object containing all AMX library models
 */
export const amxModels = (connection: mongoose.Connection) => {
  if (!connection) {
    console.error('No AMX database connection provided to model factory');
    throw new Error('Invalid database connection');
  }

  try {
    // Create models using the provided AMX connection
    const DeviceDriver = createDeviceDriverModel(connection);
    const DeviceType = createDeviceTypeModel(connection);

    console.log('AMX models initialized successfully');

    // Return an object containing all models
    return {
      DeviceDriver,
      DeviceType,
    };
  } catch (error) {
    console.error('Error initializing AMX models:', error);
    throw error;
  }
};

// Export model creation functions for individual usage
export * from './deviceDriverModel';
export * from './deviceTypeModel';
