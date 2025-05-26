import mongoose from 'mongoose';
import {
  getClientDbConnection,
  getClientDeviceModel,
  createDeviceModel,
  Device,
  IDevice,
} from '../models/index.model';
import { DatabaseModelManager } from './databaseModelManager';

/**
 * Helper function to ensure we have a valid device model connected to the client database
 * Returns null if no valid model can be created
 * Now uses unified DatabaseModelManager for consistency
 *
 * @param req Express request object (optional)
 * @param forceReconnect Force creation of a new model with client connection
 * @returns A Device model connected to the client database or null if not possible
 */
export const ensureClientDeviceModel = async (
  req?: any,
  forceReconnect: boolean = false,
): Promise<mongoose.Model<IDevice> | null> => {
  return await DatabaseModelManager.ensureClientDeviceModel(req, forceReconnect);
};

/**
 * Checks if the provided model is connected to the client database
 * Now uses unified DatabaseModelManager for consistency
 *
 * @param model Mongoose model to check
 * @returns Boolean indicating if the model is connected to the client database
 */
export const isClientDatabaseModel = (model: mongoose.Model<any> | null): boolean => {
  return DatabaseModelManager.isValidClientModel(model);
};

/**
 * Get device model with database validation
 * Shorthand helper for controllers to get a device model with proper error handling
 * Now uses unified DatabaseModelManager for consistency
 *
 * @param req Express request object
 * @returns Object with the model and result status
 */
export const getValidatedDeviceModel = async (
  req: any,
): Promise<{
  model: mongoose.Model<IDevice> | null;
  error: string | null;
  statusCode: number;
}> => {
  return await DatabaseModelManager.getValidatedDeviceModel(req);
};

export default {
  ensureClientDeviceModel,
  isClientDatabaseModel,
  getValidatedDeviceModel,
};
