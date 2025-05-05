import mongoose from 'mongoose';
import { getClientDbConnection, getClientDeviceModel, createDeviceModel, Device, IDevice } from '../models';

/**
 * Helper function to ensure we have a valid device model connected to the client database
 * Returns null if no valid model can be created
 * 
 * @param req Express request object (optional)
 * @param forceReconnect Force creation of a new model with client connection
 * @returns A Device model connected to the client database or null if not possible
 */
export const ensureClientDeviceModel = async (
  req?: any, 
  forceReconnect: boolean = false
): Promise<mongoose.Model<IDevice> | null> => {
  // First try to get the cached model
  let DeviceModel = getClientDeviceModel();
  
  // Check if model is valid and connected to client DB
  const isValidModel = DeviceModel && 
                       DeviceModel.db?.readyState === 1 && 
                       DeviceModel.db?.name === 'client';
                       
  // If model is valid and we're not forcing reconnect, return it
  if (isValidModel && !forceReconnect) {
    console.log('[dbHelper] Using cached client device model');
    return DeviceModel;
  }
  
  // If invalid or forcing reconnect, try to get a new model
  console.log(`[dbHelper] ${forceReconnect ? 'Forcing reconnect' : 'No valid model'}, creating new connection`);
  
  // Try from request.app.locals if available
  if (req?.app?.locals) {
    if (req.app.locals.clientModels?.Device) {
      DeviceModel = req.app.locals.clientModels.Device;
      
      if (DeviceModel.db?.name === 'client' && DeviceModel.db?.readyState === 1) {
        console.log('[dbHelper] Using client device model from app.locals');
        return DeviceModel;
      } else {
        console.warn('[dbHelper] app.locals model exists but is not connected to client database');
      }
    }
    
    // Try creating a model with mainDB connection
    if (req.app.locals.mainDB) {
      const mainDB = req.app.locals.mainDB;
      
      if (mainDB.readyState === 1 && mainDB.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDB);
          console.log('[dbHelper] Created device model with mainDB connection');
          return DeviceModel;
        } catch (err) {
          console.error('[dbHelper] Failed to create device model with mainDB:', err);
        }
      } else {
        console.warn(`[dbHelper] mainDB is available but not connected to client database (state: ${mainDB.readyState}, name: ${mainDB.name})`);
      }
    }
  }
  
  // Try with the cached connection
  const clientDb = getClientDbConnection();
  if (clientDb && clientDb.readyState === 1 && clientDb.name === 'client') {
    try {
      DeviceModel = createDeviceModel(clientDb);
      console.log('[dbHelper] Created device model with cached client connection');
      return DeviceModel;
    } catch (err) {
      console.error('[dbHelper] Failed to create device model with cached connection:', err);
    }
  }
  
  // Could not create a valid device model
  console.error('[dbHelper] Could not create a valid device model connected to client database');
  return null;
};

/**
 * Checks if the provided model is connected to the client database
 * 
 * @param model Mongoose model to check
 * @returns Boolean indicating if the model is connected to the client database
 */
export const isClientDatabaseModel = (model: mongoose.Model<any> | null): boolean => {
  if (!model || !model.db) return false;
  return model.db.readyState === 1 && model.db.name === 'client';
};

/**
 * Get device model with database validation
 * Shorthand helper for controllers to get a device model with proper error handling
 * 
 * @param req Express request object
 * @returns Object with the model and result status
 */
export const getValidatedDeviceModel = async (req: any): Promise<{
  model: mongoose.Model<IDevice> | null;
  error: string | null;
  statusCode: number;
}> => {
  try {
    // Try to get a properly connected device model
    const DeviceModel = await ensureClientDeviceModel(req);
    
    // If we couldn't get a valid model, return an error
    if (!DeviceModel) {
      console.error('[dbHelper] Failed to obtain a valid device model');
      return {
        model: null,
        error: 'Database connection error: Could not initialize database model',
        statusCode: 500
      };
    }
    
    // Double-check the model is connected to the client database
    if (DeviceModel.db?.name !== 'client') {
      console.error(`[dbHelper] Model is connected to wrong database: ${DeviceModel.db?.name}`);
      
      // Try to force reconnect
      const reconnectedModel = await ensureClientDeviceModel(req, true);
      
      if (!reconnectedModel || reconnectedModel.db?.name !== 'client') {
        return {
          model: null,
          error: 'Database connection error: Connected to wrong database',
          statusCode: 500
        };
      }
      
      // Successfully reconnected
      return {
        model: reconnectedModel,
        error: null,
        statusCode: 200
      };
    }
    
    // Model is valid and properly connected
    return {
      model: DeviceModel,
      error: null,
      statusCode: 200
    };
  } catch (error: any) {
    console.error('[dbHelper] Error in getValidatedDeviceModel:', error);
    return {
      model: null,
      error: `Database error: ${error.message || 'Unknown error'}`,
      statusCode: 500
    };
  }
};

export default {
  ensureClientDeviceModel,
  isClientDatabaseModel,
  getValidatedDeviceModel
};