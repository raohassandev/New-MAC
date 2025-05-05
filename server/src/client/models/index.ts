import Alert from './Alert';
import Device, { createDeviceModel } from './Device';
import Profile from './Profile';
import User from './User';
import mongoose from 'mongoose';

// Export models
export { User, Device, Profile, Alert, createDeviceModel };

/**
 * Initialize and return all client models using the provided database connection
 * This function creates models connected to the Client database
 * 
 * @param connection Mongoose connection to the client database
 * @returns Object containing all client models
 */
export const clientModels = (connection: mongoose.Connection) => {
  if (!connection) {
    console.error('No client database connection provided to model factory');
    throw new Error('Invalid database connection');
  }

  try {
    // Create models using the provided client connection
    const DeviceModel = createDeviceModel(connection);
    
    console.log('Client models initialized successfully with specific connection');
    
    // Return an object containing all models
    return {
      Device: DeviceModel
    };
  } catch (error) {
    console.error('Error initializing client models:', error);
    throw error;
  }
};

// Export interfaces
export type { IUser } from './User';
export type { 
  IDevice, 
  IRegister, 
  IRange, 
  IParameter, 
  IParser, 
  IDataPoint,
  ITcpSettings,
  IRtuSettings,
  IConnectionSetting
} from './Device';
export type { IProfile, ISchedule, IScheduleTime } from './Profile';
export type { IAlert } from './Alert';
