import mongoose from 'mongoose';
import { createDeviceDriverModel } from './deviceDriverModel';
import { createDeviceTypeModel } from './deviceTypeModel';

/**
 * Initialize and return all library models using the provided database connection
 * @param connection Mongoose connection to the library database
 * @returns Object containing all library models
 */
export const amxModels = (connection: mongoose.Connection) => {
  // Create models using the provided connection
  const DeviceDriver = createDeviceDriverModel(connection);
  const DeviceType = createDeviceTypeModel(connection);
  
  // Return an object containing all models
  return {
    DeviceDriver,
    DeviceType
  };
};

// Export model creation functions for individual usage
export * from './deviceDriverModel';
export * from './deviceTypeModel';