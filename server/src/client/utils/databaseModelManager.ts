/**
 * Universal Database Model Manager
 * Replaces all duplicate database model access logic
 * Maintains 100% compatibility with existing functionality
 */

import mongoose from 'mongoose';
import { IDevice } from '../models/device.model';
import {
  getClientDbConnection,
  getClientDeviceModel,
  createDeviceModel,
  Device,
} from '../models/index.model';

export interface ModelResult<T = IDevice> {
  model: mongoose.Model<T>;
  source: 'cached' | 'app_locals' | 'main_db' | 'client_db' | 'default' | 'reconnected' | 'unknown';
  connectionState: number;
  databaseName: string;
}

export interface ValidatedModelResult<T = IDevice> {
  model: mongoose.Model<T> | null;
  error: string | null;
  statusCode: number;
  source?: string;
}

/**
 * Universal Database Model Manager
 * Centralizes all database model access with full validation
 */
export class DatabaseModelManager {
  
  /**
   * Get Device model with comprehensive fallback logic
   * Replaces getDeviceModel(), ensureClientDeviceModel(), and getValidatedDeviceModel()
   */
  static async getDeviceModel(reqContext?: any): Promise<mongoose.Model<IDevice>> {
    const logPrefix = '[DatabaseModelManager]';
    
    // Strategy 1: Try cached client device model (fastest)
    try {
      const cachedModel = getClientDeviceModel();
      if (cachedModel && this.isValidClientModel(cachedModel)) {
        console.log(`${logPrefix} Using cached client device model`);
        return cachedModel;
      }
    } catch (error) {
      console.warn(`${logPrefix} Cached model access failed: ${error}`);
    }
    
    // Strategy 2: Try from app.locals (request context)
    if (reqContext?.app?.locals?.clientModels?.Device) {
      const appLocalsModel = reqContext.app.locals.clientModels.Device;
      if (this.isValidClientModel(appLocalsModel)) {
        console.log(`${logPrefix} Using client-specific Device model from app.locals`);
        return appLocalsModel;
      } else {
        console.log(`${logPrefix} app.locals model exists but has invalid connection state: ${appLocalsModel.db?.readyState}`);
      }
    }
    
    // Strategy 3: Try mainDB connection from app.locals
    if (reqContext?.app?.locals?.mainDB) {
      const mainDB = reqContext.app.locals.mainDB;
      if ((mainDB.readyState as number) === 1 && mainDB.name === 'client') {
        try {
          const mainDbModel = createDeviceModel(mainDB);
          console.log(`${logPrefix} Created device model with mainDB connection`);
          return mainDbModel;
        } catch (err) {
          console.error(`${logPrefix} Failed to create device model with mainDB: ${err}`);
        }
      } else {
        console.warn(`${logPrefix} mainDB is available but not connected to client database (state: ${mainDB.readyState}, name: ${mainDB.name})`);
      }
    }
    
    // Strategy 4: Try cached client connection
    try {
      const clientDb = getClientDbConnection();
      if (clientDb && (clientDb.readyState as number) === 1 && clientDb.name === 'client') {
        const clientDbModel = createDeviceModel(clientDb);
        console.log(`${logPrefix} Created device model with cached client connection`);
        return clientDbModel;
      }
    } catch (err) {
      console.error(`${logPrefix} Failed to create device model with cached connection: ${err}`);
    }
    
    // Strategy 5: Check default Device model
    if (this.isValidClientModel(Device)) {
      console.log(`${logPrefix} Using default Device model as fallback`);
      return Device;
    }
    
    // Strategy 6: Attempt to repair mongoose connection (last resort)
    try {
      console.warn(`${logPrefix} All connection attempts failed, attempting to recreate default connection`);
      
      // Check if we need to recreate the connection
      if ((mongoose.connection.readyState as number) !== 1) {
        // Wait for connection to finish if connecting
        if ((mongoose.connection.readyState as number) === 2) {
          console.log(`${logPrefix} Mongoose is connecting, waiting for completion...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // If still not connected, try to reconnect
        if ((mongoose.connection.readyState as number) !== 1) {
          const clientDbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/client';
          await mongoose.connect(clientDbUri);
          console.log(`${logPrefix} Reconnected to database`);
        }
      }
      
      return Device;
    } catch (reconnectError) {
      console.error(`${logPrefix} Failed to reconnect to database: ${reconnectError}`);
      
      // At this point, we've tried everything - just return Device and hope for the best
      return Device;
    }
  }
  
  /**
   * Get Device model with full validation and error details
   * Replaces getValidatedDeviceModel() functionality
   */
  static async getValidatedDeviceModel(reqContext?: any): Promise<ValidatedModelResult> {
    const logPrefix = '[DatabaseModelManager]';
    
    try {
      // Try to get a properly connected device model
      const DeviceModel = await this.getDeviceModel(reqContext);
      
      // If we couldn't get a valid model, return an error
      if (!DeviceModel) {
        console.error(`${logPrefix} Failed to obtain a valid device model`);
        return {
          model: null,
          error: 'Database connection error: Could not initialize database model',
          statusCode: 500,
        };
      }
      
      // Double-check the model is connected to the client database
      if (DeviceModel.db?.name !== 'client') {
        console.error(`${logPrefix} Model is connected to wrong database: ${DeviceModel.db?.name}`);
        
        // Try to force reconnect
        const reconnectedModel = await this.forceReconnect(reqContext);
        
        if (!reconnectedModel || reconnectedModel.db?.name !== 'client') {
          return {
            model: null,
            error: 'Database connection error: Connected to wrong database',
            statusCode: 500,
          };
        }
        
        // Successfully reconnected
        return {
          model: reconnectedModel,
          error: null,
          statusCode: 200,
          source: 'reconnected'
        };
      }
      
      // Model is valid and properly connected
      return {
        model: DeviceModel,
        error: null,
        statusCode: 200,
        source: 'validated'
      };
    } catch (error: any) {
      console.error(`${logPrefix} Error in getValidatedDeviceModel: ${error}`);
      return {
        model: null,
        error: `Database error: ${error.message || 'Unknown error'}`,
        statusCode: 500,
      };
    }
  }
  
  /**
   * Ensure we have a valid client device model with force reconnect option
   * Replaces ensureClientDeviceModel() functionality
   */
  static async ensureClientDeviceModel(reqContext?: any, forceReconnect: boolean = false): Promise<mongoose.Model<IDevice> | null> {
    const logPrefix = '[DatabaseModelManager]';
    
    if (!forceReconnect) {
      // First try to get the cached model
      let DeviceModel = getClientDeviceModel();
      
      // Check if model is valid and connected to client DB
      const isValidModel = DeviceModel && 
        DeviceModel.db?.readyState === 1 && 
        DeviceModel.db?.name === 'client';
      
      // If model is valid, return it
      if (isValidModel) {
        console.log(`${logPrefix} Using cached client device model`);
        return DeviceModel;
      }
    }
    
    // If invalid or forcing reconnect, try to get a new model
    console.log(`${logPrefix} ${forceReconnect ? 'Forcing reconnect' : 'No valid model'}, creating new connection`);
    
    // Try from request.app.locals if available
    if (reqContext?.app?.locals) {
      if (reqContext.app.locals.clientModels?.Device) {
        const appLocalsModel = reqContext.app.locals.clientModels.Device;
        
        if (appLocalsModel && 
            appLocalsModel.db?.name === 'client' && 
            appLocalsModel.db?.readyState === 1) {
          console.log(`${logPrefix} Using client device model from app.locals`);
          return appLocalsModel;
        } else {
          console.warn(`${logPrefix} app.locals model exists but is not connected to client database`);
        }
      }
      
      // Try creating a model with mainDB connection
      if (reqContext.app.locals.mainDB) {
        const mainDB = reqContext.app.locals.mainDB;
        
        if (mainDB.readyState === 1 && mainDB.name === 'client') {
          try {
            const mainDbModel = createDeviceModel(mainDB);
            console.log(`${logPrefix} Created device model with mainDB connection`);
            return mainDbModel;
          } catch (err) {
            console.error(`${logPrefix} Failed to create device model with mainDB: ${err}`);
          }
        } else {
          console.warn(`${logPrefix} mainDB is available but not connected to client database (state: ${(mainDB.readyState as number)}, name: ${mainDB.name})`);
        }
      }
    }
    
    // Try with the cached connection
    const clientDb = getClientDbConnection();
    if (clientDb && clientDb.readyState === 1 && clientDb.name === 'client') {
      try {
        const clientDbModel = createDeviceModel(clientDb);
        console.log(`${logPrefix} Created device model with cached client connection`);
        return clientDbModel;
      } catch (err) {
        console.error(`${logPrefix} Failed to create device model with cached connection: ${err}`);
      }
    }
    
    // Could not create a valid device model
    console.error(`${logPrefix} Could not create a valid device model connected to client database`);
    return null;
  }
  
  /**
   * Force reconnection to client database
   */
  static async forceReconnect(reqContext?: any): Promise<mongoose.Model<IDevice> | null> {
    return await this.ensureClientDeviceModel(reqContext, true);
  }
  
  /**
   * Check if a model is valid and connected to client database
   */
  static isValidClientModel(model: mongoose.Model<any> | null): boolean {
    if (!model || !model.db) return false;
    return (model.db.readyState as number) === 1 && model.db.name === 'client';
  }
  
  /**
   * Get detailed model information for debugging
   */
  static getModelInfo(model: mongoose.Model<any> | null): ModelResult | null {
    if (!model) return null;
    
    return {
      model,
      source: 'unknown',
      connectionState: model.db?.readyState || 0,
      databaseName: model.db?.name || 'unknown'
    };
  }
  
  /**
   * Validate model connection state
   */
  static validateModelConnection(model: mongoose.Model<any> | null): boolean {
    return this.isValidClientModel(model);
  }
  
  /**
   * Legacy compatibility functions
   * Maintain exact same function signatures for backward compatibility
   */
  
  // Legacy getDeviceModel function signature
  static async getDeviceModelLegacy(reqContext: any): Promise<mongoose.Model<IDevice>> {
    return await this.getDeviceModel(reqContext);
  }
  
  // Legacy ensureClientDeviceModel function signature  
  static async ensureClientDeviceModelLegacy(
    reqContext?: any,
    forceReconnect: boolean = false
  ): Promise<mongoose.Model<IDevice> | null> {
    return await this.ensureClientDeviceModel(reqContext, forceReconnect);
  }
  
  // Legacy getValidatedDeviceModel function signature
  static async getValidatedDeviceModelLegacy(reqContext: any): Promise<ValidatedModelResult> {
    return await this.getValidatedDeviceModel(reqContext);
  }
}

export default DatabaseModelManager;