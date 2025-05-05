import { Request, Response } from 'express';

// Define a custom request type that includes user information
interface AuthRequest extends Request {
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    username?: string;
    email?: string;
  };
}
import mongoose from 'mongoose';

import { Device, createDeviceModel, IDevice, getClientDeviceModel, getClientDbConnection } from '../models';
import ModbusRTU from 'modbus-serial';

// @desc    Get all devices
// @route   GET /api/devices
// @access  Private
// export const getDevices = async (req: AuthRequest, res: Response) => {
//   try {
//     // Build filter for MongoDB query
//     const filter: Record<string, any> = {};
    
//     // Filter by enabled status (online/offline)
//     if (req.query.status) {
//       filter.enabled = req.query.status === 'online' ? true : false;
//     }
    
//     // Filter by device type/make
//     if (req.query.type) {
//       filter.make = req.query.type;
//     }
    
//     // Filter by device driver
//     if (req.query.deviceDriver) {
//       filter.deviceDriverId = req.query.deviceDriver;
//     }
    
//     // Filter by usage category
//     if (req.query.usage) {
//       filter.usage = req.query.usage;
//     }
    
//     // Filter by location
//     if (req.query.location) {
//       filter.location = { $regex: req.query.location, $options: 'i' };
//     }
    
//     // Exclude templates unless specifically requested
//     if (!req.query.includeTemplates) {
//       filter.isTemplate = { $ne: true };
//     }
    
//     // Text search on multiple fields
//     if (req.query.search) {
//       const searchString = String(req.query.search);
//       filter.$or = [
//         { name: { $regex: searchString, $options: 'i' } },
//         { description: { $regex: searchString, $options: 'i' } },
//         { make: { $regex: searchString, $options: 'i' } },
//         { model: { $regex: searchString, $options: 'i' } },
//         { 'connectionSetting.tcp.ip': { $regex: searchString, $options: 'i' } }
//       ];
//     }
    
//     // Filter by tags (support multiple tags)
//     if (req.query.tags) {
//       const tags = Array.isArray(req.query.tags) 
//         ? req.query.tags 
//         : String(req.query.tags).split(',');
        
//       if (tags.length > 0) {
//         filter.tags = { $in: tags };
//       }
//     }
    
//     // Set up pagination
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 50;
//     const skip = (page - 1) * limit;
    
//     // Set up sorting
//     let sortOptions: Record<string, 1 | -1> = { updatedAt: -1 }; // Default sort by last updated
    
//     if (req.query.sort) {
//       const sortField = String(req.query.sort);
//       const sortOrder = req.query.order === 'asc' ? 1 : -1;
//       sortOptions = { [sortField]: sortOrder };
//     }
    
//     // Execute query with pagination and sorting using the MongoDB native approach
//     const devices = await Device.collection.find(filter)
//       .sort(sortOptions)
//       .skip(skip)
//       .limit(limit)
//       .toArray();
    
//     // Get total count for pagination metadata
//     const totalDevices = await Device.collection.countDocuments(filter);



//     res.json({
//       devices,
//       pagination: {
//         total: totalDevices,
//         page,
//         limit,
//         pages: Math.ceil(totalDevices / limit)
//       }
//     });
//   } catch (error: any) {
//     console.error('Get devices error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };


export const getDevices = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] getDevices: Starting retrieval of devices');
    
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> = getClientDeviceModel() || Device;
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel || DeviceModel === Device) {
      console.log('[deviceController] No cached device model, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDB && mainDB.readyState === 1) {
        // Check if mainDB (client connection) is available even if clientModels isn't set up
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDB);
        } catch (err) {
          console.error('[deviceController] Error creating Device model with client connection:', err);
          console.warn('[deviceController] Falling back to default Device model');
        }
      } else {
        console.warn('[deviceController] No client database connection available');
      }
    } else {
      console.log('[deviceController] Using cached client device model');
    }
    
    // Safety check to ensure we only use client database models
    if (DeviceModel && DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }
    
    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Could not initialize database model'
      });
    }
    
    // Enhanced diagnostic logging
    console.log(`[deviceController] Database connection details:
      - Connection state: ${DeviceModel.db?.readyState || 'unknown'}
      - Database name: ${DeviceModel.db?.name || 'unknown'}
      - Collection name: ${DeviceModel.collection.name || 'unknown'}
      - Using client connection: ${DeviceModel.db?.name === 'client'}
    `);
    
    // Set up pagination properly
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    
    // Build filter for MongoDB query
    const filter: Record<string, any> = {};
    
    // Filter by enabled status (online/offline)
    if (req.query.status) {
      filter.enabled = req.query.status === 'online' ? true : false;
    }
    
    // Filter by device type/make
    if (req.query.type) {
      filter.make = req.query.type;
    }
    
    // Filter by device driver
    if (req.query.deviceDriver) {
      filter.deviceDriverId = req.query.deviceDriver;
    }
    
    // Filter by usage category
    if (req.query.usage) {
      filter.usage = req.query.usage;
    }
    
    // Exclude templates unless specifically requested
    if (!req.query.includeTemplates) {
      filter.isTemplate = { $ne: true };
    }
    
    // Text search on multiple fields
    if (req.query.search) {
      const searchString = String(req.query.search);
      filter.$or = [
        { name: { $regex: searchString, $options: 'i' } },
        { description: { $regex: searchString, $options: 'i' } },
        { make: { $regex: searchString, $options: 'i' } },
        { model: { $regex: searchString, $options: 'i' } },
        { 'connectionSetting.tcp.ip': { $regex: searchString, $options: 'i' } }
      ];
    }
    
    // Set up sorting
    let sortOptions: Record<string, 1 | -1> = { updatedAt: -1 }; // Default sort by last updated
    
    if (req.query.sort) {
      const sortField = String(req.query.sort);
      const sortOrder = req.query.order === 'asc' ? 1 : -1;
      sortOptions = { [sortField]: sortOrder };
    }
    
    console.log(`[deviceController] Executing find with filter: ${JSON.stringify(filter)}`);
    console.log(`[deviceController] Pagination: page=${page}, limit=${limit}, skip=${skip}`);
    
    // Execute query with pagination and use lean() for better performance
    const devices = await DeviceModel.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination metadata
    const totalDevices = await DeviceModel.countDocuments(filter);
    
    console.log(`[deviceController] Retrieved ${devices.length} devices from ${DeviceModel.db?.name || 'unknown'} database (total: ${totalDevices})`);
      
    return res.json({
      devices,
      pagination: {
        total: totalDevices,
        page,
        limit,
        pages: Math.ceil(totalDevices / limit)
      }
    });
  } catch (error: any) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get a single device
// @route   GET /api/devices/:id
// @access  Private
export const getDeviceById = async (req: AuthRequest, res: Response) => {
  try {
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for getDeviceById, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        // Use the client-specific model from app.locals if available
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDB && mainDB.readyState === 1) {
        // If we have a valid client connection but no model, create one
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDB);
        } catch (modelError) {
          console.error('[deviceController] Error creating Device model with client connection:', modelError);
          DeviceModel = Device; // Fall back to default
        }
      } else {
        // Fall back to default model as last resort
        console.warn('[deviceController] Client-specific Device model not found, using default');
        DeviceModel = Device;
      }
    } else {
      console.log('[deviceController] Using cached client device model for getDeviceById');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database for getDeviceById');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDB && mainDB.readyState === 1 && mainDB.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDB);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }
    
    // Check which database we're actually connected to
    const dbName = DeviceModel.db?.name || 'unknown';
    const connectionState = DeviceModel.db?.readyState || 0;
    console.log(`[deviceController] Device model connected to: ${dbName} (state: ${connectionState})`);
    console.log(`[deviceController] Looking for device with ID: ${req.params.id}`);
    
    // Check if we should populate the device driver data
    const populateDriver = req.query.includeDriver === 'true';
    
    // Use separate approach for population to avoid TypeScript errors
    if (populateDriver && mongoose.models.DeviceDriver) {
      // First get the device
      const device = await DeviceModel.findById(req.params.id);
      
      if (!device) {
        console.warn(`[deviceController] Device with ID ${req.params.id} not found in database ${dbName}`);
        return res.status(404).json({ message: 'Device not found' });
      }
      
      console.log(`[deviceController] Found device: ${device.name}`);
      
      // Then manually populate if there's a deviceDriverId
      if (device.deviceDriverId) {
        try {
          // Get DeviceDriver model from AMX models
          let DeviceDriver;
          if (req.app.locals.libraryModels && req.app.locals.libraryModels.DeviceDriver) {
            DeviceDriver = req.app.locals.libraryModels.DeviceDriver;
            console.log('[deviceController] Using AMX-specific DeviceDriver model');
          } else {
            try {
              DeviceDriver = mongoose.model('DeviceDriver') as mongoose.Model<any>;
              console.warn('[deviceController] AMX-specific DeviceDriver model not found, using default');
            } catch (modelError) {
              console.error('[deviceController] Error: DeviceDriver model not found:', modelError);
              return res.status(500).json({ message: 'Server error', error: 'DeviceDriver model not available' });
            }
          }
          
          const deviceDriver = await DeviceDriver.findById(device.deviceDriverId);
          console.log(`[deviceController] Populated device driver: ${deviceDriver?.name || 'Not found'}`);
          
          // Create a response object with the populated data
          const populatedDevice = device.toObject();
          // Add the device driver data using the property defined in our interface
          populatedDevice.driverData = deviceDriver;
          
          return res.json(populatedDevice);
        } catch (populateError) {
          // If population fails, just return the device without population
          console.warn('Could not populate device driver:', populateError);
          return res.json(device);
        }
      } else {
        // No deviceDriverId to populate
        return res.json(device);
      }
    } else {
      // No population needed, just get and return the device
      const device = await DeviceModel.findById(req.params.id);
      
      if (!device) {
        console.warn(`[deviceController] Device with ID ${req.params.id} not found in database ${dbName}`);
        return res.status(404).json({ message: 'Device not found' });
      }
      
      console.log(`[deviceController] Found device: ${device.name}`);
      return res.json(device);
    }
  } catch (error: any) {
    console.error('Get device error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new device
// @route   POST /api/devices
// @access  Private (Admin/Engineer)
export const createDevice = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] createDevice: Starting device creation process');
    
    // Add user information to the created device if authenticated
    if (req.user) {
      req.body.createdBy = {
        userId: req.user._id || req.user.id,
        username: req.user.name || req.user.username,
        email: req.user.email
      };
      console.log(`[deviceController] Device being created by user: ${req.body.createdBy.username}`);
    }
    
    // Log basic device information (without sensitive info)
    console.log(`[deviceController] Attempting to create device: "${req.body.name}" (Type: ${req.body.make || 'unknown'}, Model: ${req.body.model || 'unknown'})`);
    
    // Fix connection settings based on connection type
    const connectionSetting = req.body.connectionSetting;
    if (connectionSetting) {
      console.log(`[deviceController] Connection type: ${connectionSetting.connectionType}`);
      
      // For TCP connection, make sure RTU fields are set with defaults
      if (connectionSetting.connectionType === 'tcp') {
        connectionSetting.rtu = {
          serialPort: 'N/A',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          slaveId: 1
        };
      }
      
      // For RTU connection, make sure TCP fields are set with defaults
      if (connectionSetting.connectionType === 'rtu') {
        connectionSetting.tcp = {
          ip: 'N/A',
          port: 502,
          slaveId: 1
        };
      }
    }
    
    // Try to get the cached client device model first
    let DeviceModel = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for createDevice, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // First check if we have client models properly set up
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from clientModels');
      } 
      // If client models aren't available but mainDB is, create model with client connection
      else if (mainDB && mainDB.readyState === 1) {
        console.log('[deviceController] mainDB found but clientModels not available - creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDB);
          console.log('[deviceController] Successfully created Device model with client connection');
        } catch (modelError: any) {
          console.error(`[deviceController] ERROR: Failed to create Device model with client connection: ${modelError.message}`);
          return res.status(500).json({ 
            message: 'Database connection error',
            error: 'Could not create device model with client connection'
          });
        }
      } 
      // No client DB available - this is an error condition
      else {
        console.error('[deviceController] ERROR: No client database connection available for device creation');
        return res.status(500).json({ 
          message: 'Database connection error',
          error: 'Client database not available'
        });
      }
    } else {
      console.log('[deviceController] Using cached client device model for createDevice');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database for createDevice');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDB && mainDB.readyState === 1 && mainDB.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDB);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
          return res.status(500).json({ 
            message: 'Database connection error',
            error: 'Could not reconnect to client database'
          });
        }
      } else {
        return res.status(500).json({ 
          message: 'Database connection error',
          error: 'Wrong database connection and could not reconnect'
        });
      }
    }
    
    // Enhanced diagnostic logging about database connection
    console.log(`[deviceController] Database connection diagnostics:
      - Connection state: ${DeviceModel?.db?.readyState || 'unknown'} (1=connected, 0=disconnected)
      - Database name: ${DeviceModel?.db?.name || 'unknown'}
      - Collection name: ${DeviceModel?.collection?.name || 'unknown'}
      - Connection ID: ${DeviceModel?.db?.id || 'unknown'}
      - Using client DB: ${Boolean(mainDBConnection || (clientModels && clientModels.Device))}
    `);
    
    // Create the device with all provided data
    // At this point we've done all the validation, and DeviceModel should be non-null
    // But add a final check to satisfy TypeScript
    if (!DeviceModel) {
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Device model is null' 
      });
    }
    
    console.log(`[deviceController] Creating device in database: ${DeviceModel.db?.name || 'unknown'}`);
    const device = await DeviceModel.create(req.body);
    
    console.log(`[deviceController] Device created successfully! ID: ${device._id}, Name: ${device.name}`);
    
    // Return the created device
    res.status(201).json(device);
  } catch (error: any) {
    console.error('[deviceController] Create device error:', error);
    
    // Handle duplicate name error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res.status(400).json({ 
        message: 'A device with this name already exists',
        error: 'Duplicate device name'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
// @desc    Update a device
// @route   PUT /api/devices/:id
// @access  Private (Admin/Engineer)
export const updateDevice = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] updateDevice: Starting device update process');
    
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for updateDevice, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available 
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error('[deviceController] Error creating Device model with client connection:', err);
          console.warn('[deviceController] Falling back to default Device model');
          DeviceModel = Device;
        }
      } else {
        console.warn('[deviceController] No client database connection available');
        DeviceModel = Device;
      }
    } else {
      console.log('[deviceController] Using cached client device model');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Could not initialize database model'
      });
    }
    
    const device = await DeviceModel.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Ensure we don't overwrite createdBy field if not provided
    if (!req.body.createdBy && device.createdBy) {
      req.body.createdBy = device.createdBy;
    }
    
    // Fix connection settings based on connection type if they are being updated
    if (req.body.connectionSetting) {
      const connectionSetting = req.body.connectionSetting;
      
      // For TCP connection, make sure RTU fields are set with defaults
      if (connectionSetting.connectionType === 'tcp') {
        connectionSetting.rtu = {
          serialPort: 'N/A',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          slaveId: 1
        };
      }
      
      // For RTU connection, make sure TCP fields are set with defaults
      if (connectionSetting.connectionType === 'rtu') {
        connectionSetting.tcp = {
          ip: 'N/A',
          port: 502,
          slaveId: 1
        };
      }
    }
    
    // Update the updatedAt timestamp
    req.body.updatedAt = new Date();
    
    // Update device with new data
    const updatedDevice = await DeviceModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    console.log(`[deviceController] Device updated successfully! ID: ${device._id}, Name: ${device.name}`);
    res.json(updatedDevice);
  } catch (error: any) {
    console.error('Update device error:', error);
    
    // Handle duplicate name error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res.status(400).json({ 
        message: 'A device with this name already exists',
        error: 'Duplicate device name'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a device
// @route   DELETE /api/devices/:id
// @access  Private (Admin/Engineer)
export const deleteDevice = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] deleteDevice: Starting device deletion process');
    
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for deleteDevice, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available 
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error('[deviceController] Error creating Device model with client connection:', err);
          console.warn('[deviceController] Falling back to default Device model');
          DeviceModel = Device;
        }
      } else {
        console.warn('[deviceController] No client database connection available');
        DeviceModel = Device;
      }
    } else {
      console.log('[deviceController] Using cached client device model');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }
    
    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Could not initialize database model'
      });
    }
    
    const device = await DeviceModel.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    await device.deleteOne();
    console.log(`[deviceController] Device deleted successfully! ID: ${req.params.id}, Name: ${device.name}`);

    res.json({ message: 'Device removed', id: req.params.id });
  } catch (error: any) {
    console.error('Delete device error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Test connection to a device
// @route   POST /api/devices/:id/test
// @access  Private
export const testDeviceConnection = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] testDeviceConnection: Starting device connection test');
    
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for testDeviceConnection, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available 
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error('[deviceController] Error creating Device model with client connection:', err);
          console.warn('[deviceController] Falling back to default Device model');
          DeviceModel = Device;
        }
      } else {
        console.warn('[deviceController] No client database connection available');
        DeviceModel = Device;
      }
    } else {
      console.log('[deviceController] Using cached client device model');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }
    
    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Could not initialize database model'
      });
    }
    
    const device = await DeviceModel.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
 
    if (!device.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Device is disabled', 
      });
    }

    // Test Modbus connection
    const client = new ModbusRTU();
    try {
      // Get connection settings (support both new and legacy format)
      const connectionType = device.connectionSetting?.connectionType || device.connectionType || 'tcp';
      
      // Get TCP settings
      const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : (device.ip || '');
      const port = connectionType === 'tcp' ? device.connectionSetting?.tcp?.port : (device.port || 0);
      const tcpSlaveId = connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;
      
      // Get RTU settings  
      const serialPort = connectionType === 'rtu' ? device.connectionSetting?.rtu?.serialPort : (device.serialPort || '');
      const baudRate = connectionType === 'rtu' ? device.connectionSetting?.rtu?.baudRate : (device.baudRate || 0);
      const dataBits = connectionType === 'rtu' ? device.connectionSetting?.rtu?.dataBits : (device.dataBits || 0);
      const stopBits = connectionType === 'rtu' ? device.connectionSetting?.rtu?.stopBits : (device.stopBits || 0);
      const parity = connectionType === 'rtu' ? device.connectionSetting?.rtu?.parity : (device.parity || '');
      const rtuSlaveId = connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;
      
      // Combined slaveId (prefer the one from the matching connection type)
      const slaveId = connectionType === 'tcp' ? tcpSlaveId : (rtuSlaveId || device.slaveId || 1);

      // Connect based on connection type
      if (connectionType === 'tcp' && ip && port) {
        await client.connectTCP(ip, { port });
      } else if (connectionType === 'rtu' && serialPort) {
        const rtuOptions: any = {};
        if (baudRate) rtuOptions.baudRate = baudRate;
        if (dataBits) rtuOptions.dataBits = dataBits;
        if (stopBits) rtuOptions.stopBits = stopBits;
        if (parity) rtuOptions.parity = parity;
        
        await client.connectRTUBuffered(serialPort, rtuOptions);
      } else {
        throw new Error('Invalid connection configuration');
      }
      
      if (slaveId !== undefined) {
        client.setID(slaveId);
      } else {
        client.setID(1); // Default slave ID
      }

      // Try to read a register from first dataPoint or legacy register
      let address = 0;
      let functionCode = 3; // Default to readHoldingRegisters
      
      if (device.dataPoints && device.dataPoints.length > 0) {
        address = device.dataPoints[0].range.startAddress;
        functionCode = device.dataPoints[0].range.fc;
      } else if (device.registers && device.registers.length > 0) {
        address = device.registers[0].address;
      }

      // Read register based on function code
      switch (functionCode) {
        case 1:
          await client.readCoils(address, 1);
          break;
        case 2:
          await client.readDiscreteInputs(address, 1);
          break;
        case 3:
          await client.readHoldingRegisters(address, 1);
          break;
        case 4:
          await client.readInputRegisters(address, 1);
          break;
        default:
          await client.readHoldingRegisters(address, 1);
      }

      // Update device lastSeen timestamp
      device.lastSeen = new Date();
      await device.save();

      res.json({
        success: true,
        message: 'Successfully connected to device',
      });
    } catch (modbusError: any) {
      console.error('Modbus connection error:', modbusError);
      
      // Create a more detailed error message based on error type
      let errorMessage = 'Connection failed';
      let errorType = 'UNKNOWN_ERROR';
      let troubleshooting = 'Verify your device configuration and try again.';
      
      // Store the connection type in local variable
      const deviceConnectionType = device.connectionSetting?.connectionType || device.connectionType || 'tcp';
      
      // Store connection info locally for error messages to avoid scope issues
      const deviceIp = deviceConnectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : (device.ip || '');
      const devicePort = deviceConnectionType === 'tcp' ? device.connectionSetting?.tcp?.port : (device.port || 0);
      const deviceSerialPort = deviceConnectionType === 'rtu' ? device.connectionSetting?.rtu?.serialPort : (device.serialPort || '');
      
      if (modbusError.code === 'ECONNREFUSED') {
        errorType = 'CONNECTION_REFUSED';
        errorMessage = `Connection refused at ${deviceIp}:${devicePort}. The device may be offline or unreachable.`;
        troubleshooting = 'Please check:\n• Device is powered on and network is connected\n• IP address and port are correct\n• Any firewalls or network security is allowing the connection\n• The device is properly configured to accept Modbus TCP connections';
      } else if (modbusError.code === 'ETIMEDOUT') {
        errorType = 'CONNECTION_TIMEOUT';
        errorMessage = `Connection timed out when connecting to ${deviceIp}:${devicePort}. The device is not responding.`;
        troubleshooting = 'Please check:\n• Network connectivity to the device\n• Device is powered on and functioning\n• Device is not in a busy state or overloaded\n• Network latency is not too high';
      } else if (modbusError.message.includes('No such file or directory')) {
        errorType = 'PORT_NOT_FOUND';
        errorMessage = `Serial port ${deviceSerialPort} does not exist on this system.`;
        troubleshooting = 'Please check:\n• Serial port name is correct (COM ports on Windows, /dev/tty* on Linux/Mac)\n• Serial device is properly connected to the computer\n• Serial-to-USB adapter drivers are installed if applicable\n• The port is not being used by another application';
      } else if (modbusError.message.includes('Access denied')) {
        errorType = 'PERMISSION_DENIED';
        errorMessage = `Permission denied for serial port ${deviceSerialPort}.`;
        troubleshooting = 'Please check:\n• Your account has permissions to access serial ports\n• On Linux/Mac, you may need to add your user to the "dialout" group\n• Serial port is not locked by another process\n• Try running the application with administrator/root privileges';
      } else if (modbusError.message.includes('Port is opening')) {
        errorType = 'PORT_BUSY';
        errorMessage = 'The serial port is in use by another process.';
        troubleshooting = 'Please check:\n• Close any other applications that might be using the serial port\n• Restart the device to release any locked port connections\n• On Windows, check Device Manager to see if the port has any conflicts';
      } else if (modbusError.message.includes('Received no valid response')) {
        errorType = 'DEVICE_NO_RESPONSE';
        errorMessage = 'The device did not respond correctly to the Modbus request.';
        troubleshooting = 'Please check:\n• The slave/unit ID is correct\n• The Modbus device is configured to respond to the function code being used\n• The device supports the Modbus commands being sent\n• The register address is within the valid range for this device';
      } else if (modbusError.message.includes('Illegal function')) {
        errorType = 'ILLEGAL_FUNCTION';
        errorMessage = 'The device does not support the Modbus function being used.';
        troubleshooting = 'Please check:\n• The device documentation for supported Modbus function codes\n• Verify the correct function code is being used for this device\n• Some devices only support a subset of Modbus functions';
      } else if (modbusError.message.includes('Illegal data address')) {
        errorType = 'ILLEGAL_ADDRESS';
        errorMessage = 'The register address requested does not exist on this device.';
        troubleshooting = 'Please check:\n• The register address map documentation for your device\n• Address mapping (e.g., some devices start at 0, others at 1)\n• Address offsets and ranges for this specific device model';
      } else if (modbusError.message) {
        errorMessage = `${errorMessage}: ${modbusError.message}`;
        troubleshooting = 'Review device documentation and Modbus specifications for more specific guidance.';
      }
      
      res.status(400).json({
        success: false,
        message: errorMessage,
        error: modbusError.message,
        troubleshooting: troubleshooting,
        errorType: errorType,
        deviceInfo: {
          name: device.name,
          connectionType: deviceConnectionType,
          address: deviceConnectionType === 'tcp' ? `${deviceIp}:${devicePort}` : deviceSerialPort,
        }
      });
    } finally {
      // Close the connection if open
      try {
        if (client.isOpen) {
          await client.close();
        }
      } catch (closeError) {
        console.warn('Error closing Modbus connection:', closeError);
      }
    }
  } catch (error: any) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Read registers from a device
// @route   GET /api/devices/:id/read
// @access  Private
export const readDeviceRegisters = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] readDeviceRegisters: Starting device register read');
    
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for readDeviceRegisters, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available 
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error('[deviceController] Error creating Device model with client connection:', err);
          console.warn('[deviceController] Falling back to default Device model');
          DeviceModel = Device;
        }
      } else {
        console.warn('[deviceController] No client database connection available');
        DeviceModel = Device;
      }
    } else {
      console.log('[deviceController] Using cached client device model');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }
    
    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Could not initialize database model'
      });
    }
    
    const device = await DeviceModel.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (!device.enabled) {
      return res.status(400).json({ message: 'Device is disabled' });
    }

    // Check if device has any configuration for reading
    const hasNewConfig = device.dataPoints && device.dataPoints.length > 0;
    const hasLegacyConfig = device.registers && device.registers.length > 0;
    
    if (!hasNewConfig && !hasLegacyConfig) {
      return res
        .status(400)
        .json({ message: 'No data points or registers configured for this device' });
    }

    // Get connection settings (support both new and legacy format)
    const connectionType = device.connectionSetting?.connectionType || device.connectionType || 'tcp';
    
    // Get TCP settings
    const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : (device.ip || '');
    const port = connectionType === 'tcp' ? device.connectionSetting?.tcp?.port : (device.port || 0);
    const tcpSlaveId = connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;
    
    // Get RTU settings  
    const serialPort = connectionType === 'rtu' ? device.connectionSetting?.rtu?.serialPort : (device.serialPort || '');
    const baudRate = connectionType === 'rtu' ? device.connectionSetting?.rtu?.baudRate : (device.baudRate || 0);
    const dataBits = connectionType === 'rtu' ? device.connectionSetting?.rtu?.dataBits : (device.dataBits || 0);
    const stopBits = connectionType === 'rtu' ? device.connectionSetting?.rtu?.stopBits : (device.stopBits || 0);
    const parity = connectionType === 'rtu' ? device.connectionSetting?.rtu?.parity : (device.parity || '');
    const rtuSlaveId = connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;
    
    // Combined slaveId (prefer the one from the matching connection type)
    const slaveId = connectionType === 'tcp' ? tcpSlaveId : (rtuSlaveId || device.slaveId || 1);

    // Initialize Modbus client
    const client = new ModbusRTU();
    const readings: any[] = [];

    try {
      // Connect based on connection type
      if (connectionType === 'tcp' && ip && port) {
        await client.connectTCP(ip, { port });
      } else if (connectionType === 'rtu' && serialPort) {
        const rtuOptions: any = {};
        if (baudRate) rtuOptions.baudRate = baudRate;
        if (dataBits) rtuOptions.dataBits = dataBits;
        if (stopBits) rtuOptions.stopBits = stopBits;
        if (parity) rtuOptions.parity = parity;
        
        await client.connectRTUBuffered(serialPort, rtuOptions);
      } else {
        throw new Error('Invalid connection configuration');
      }
      
      if (slaveId !== undefined) {
        client.setID(slaveId);
      } else {
        client.setID(1); // Default slave ID
      }

      // NEW STRUCTURE: Read each data point
      if (hasNewConfig && device.dataPoints) {
        for (const dataPoint of device.dataPoints) {
          try {
            const range = dataPoint.range;
            const parser = dataPoint.parser;
            
            // Read registers based on function code
            let result;
            switch (range.fc) {
              case 1:
                result = await client.readCoils(range.startAddress, range.count);
                break;
              case 2:
                result = await client.readDiscreteInputs(range.startAddress, range.count);
                break;
              case 3:
                result = await client.readHoldingRegisters(range.startAddress, range.count);
                break;
              case 4:
                result = await client.readInputRegisters(range.startAddress, range.count);
                break;
              default:
                result = await client.readHoldingRegisters(range.startAddress, range.count);
            }

            // Process the result based on parser configuration
            if (parser && parser.parameters) {
              for (const param of parser.parameters) {
                try {
                  // Get the register index relative to the range start
                  const relativeIndex = param.registerIndex - range.startAddress;
                  
                  if (relativeIndex < 0 || relativeIndex >= range.count) {
                    continue; // Skip if out of range
                  }

                  let value = result.data[relativeIndex];

                  // Apply scaling factor if defined
                  if (param.scalingFactor && param.scalingFactor !== 1 && typeof value === 'number') {
                    value = value * param.scalingFactor;
                  }

                  // Apply scaling equation if defined
                  if (param.scalingEquation) {
                    try {
                      // Simple equation evaluation (x is the value)
                      const x = value;
                      // Use Function constructor to safely evaluate the equation
                      value = new Function('x', `return ${param.scalingEquation}`)(x);
                    } catch (equationError) {
                      console.error('Scaling equation error:', equationError);
                    }
                  }

                  // Format decimal places if defined
                  if (param.decimalPoint && param.decimalPoint > 0 && typeof value === 'number') {
                    value = parseFloat(value.toFixed(param.decimalPoint));
                  }

                  readings.push({
                    name: param.name,
                    registerIndex: param.registerIndex,
                    value: value,
                    unit: param.unit || '',
                    dataType: param.dataType,
                  });
                } catch (paramError: any) {
                  readings.push({
                    name: param.name,
                    registerIndex: param.registerIndex,
                    value: null,
                    unit: param.unit || '',
                    error: paramError.message,
                  });
                }
              }
            }
          } catch (rangeError: any) {
            console.error(`Error reading range (${dataPoint.range.startAddress}-${dataPoint.range.startAddress + dataPoint.range.count - 1}):`, rangeError);
            // Continue to next range even if this one fails
          }
        }
      } 
      // LEGACY STRUCTURE: Read each configured register
      else if (hasLegacyConfig && device.registers) {
        for (const register of device.registers) {
          try {
            const result = await client.readHoldingRegisters(
              register.address,
              register.length
            );

            // Process the result based on register configuration
            let value = result.data[0];

            // Apply scale factor if defined
            if (register.scaleFactor && register.scaleFactor !== 1) {
              value = value / register.scaleFactor;
            }

            // Format decimal places if defined
            if (register.decimalPoint && register.decimalPoint > 0) {
              value = parseFloat(value.toFixed(register.decimalPoint));
            }

            readings.push({
              name: register.name,
              address: register.address,
              value: value,
              unit: register.unit || '',
            });
          } catch (registerError: any) {
            readings.push({
              name: register.name,
              address: register.address,
              value: null,
              unit: register.unit || '',
              error: registerError.message,
            });
          }
        }
      }

      // Update device lastSeen timestamp
      device.lastSeen = new Date();
      await device.save();

      res.json({
        deviceId: device._id,
        deviceName: device.name,
        timestamp: new Date(),
        readings,
      });
    } catch (modbusError: any) {
      console.error('Modbus reading error:', modbusError);
      res.status(400).json({
        message: `Failed to read from device: ${modbusError.message}`,
      });
    } finally {
      // Close the connection
      client.close();
    }
  } catch (error: any) {
    console.error('Read registers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get devices by device driver ID
// @route   GET /api/devices/by-driver/:driverId
// @access  Private
export const getDevicesByDriverId = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] getDevicesByDriverId: Starting retrieval of devices by driver ID');
    
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for getDevicesByDriverId, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available 
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error('[deviceController] Error creating Device model with client connection:', err);
          console.warn('[deviceController] Falling back to default Device model');
          DeviceModel = Device;
        }
      } else {
        console.warn('[deviceController] No client database connection available');
        DeviceModel = Device;
      }
    } else {
      console.log('[deviceController] Using cached client device model');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }
    
    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Could not initialize database model'
      });
    }
    
    const driverId = req.params.driverId;
    
    if (!driverId) {
      return res.status(400).json({ message: 'Device driver ID is required' });
    }
    
    // Set up pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Use Mongoose query interface instead of direct collection access
    const filter = {
      deviceDriverId: driverId,
      isTemplate: { $ne: true } // Exclude templates
    };
    
    console.log(`[deviceController] Querying for devices with driver ID: ${driverId}`);
    
    // Execute query with pagination
    const devices = await DeviceModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalDevices = await DeviceModel.countDocuments(filter);
    
    console.log(`[deviceController] Found ${devices.length} devices with driver ID: ${driverId} (total: ${totalDevices})`);
    
    res.json({
      devices,
      deviceDriverId: driverId,
      pagination: {
        total: totalDevices,
        page,
        limit,
        pages: Math.ceil(totalDevices / limit)
      }
    });
  } catch (error: any) {
    console.error('Get devices by driver error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get devices by usage category
// @route   GET /api/devices/by-usage/:usage
// @access  Private
export const getDevicesByUsage = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] getDevicesByUsage: Starting retrieval of devices by usage category');
    
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = getClientDeviceModel();
    
    // If no cached model, try to get it from other sources
    if (!DeviceModel) {
      console.log('[deviceController] No cached device model for getDevicesByUsage, trying alternatives');
      
      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      
      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available 
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error('[deviceController] Error creating Device model with client connection:', err);
          console.warn('[deviceController] Falling back to default Device model');
          DeviceModel = Device;
        }
      } else {
        console.warn('[deviceController] No client database connection available');
        DeviceModel = Device;
      }
    } else {
      console.log('[deviceController] Using cached client device model');
    }
    
    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`);
      console.log('[deviceController] Forcing reconnection to client database');
      
      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
        } catch (reconnectError) {
          console.error('[deviceController] Could not reconnect to client database:', reconnectError);
        }
      }
    }
    
    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({ 
        message: 'Database connection error', 
        error: 'Could not initialize database model'
      });
    }
    
    const usage = req.params.usage;
    
    if (!usage) {
      return res.status(400).json({ message: 'Usage category is required' });
    }
    
    // Set up pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    
    // Use Mongoose query interface instead of direct collection access
    const filter = {
      usage: usage,
      isTemplate: { $ne: true } // Exclude templates
    };
    
    console.log(`[deviceController] Querying for devices with usage category: ${usage}`);
    
    // Execute query with pagination
    const devices = await DeviceModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalDevices = await DeviceModel.countDocuments(filter);
    
    console.log(`[deviceController] Found ${devices.length} devices with usage category: ${usage} (total: ${totalDevices})`);
    
    res.json({
      devices,
      usage,
      pagination: {
        total: totalDevices,
        page,
        limit,
        pages: Math.ceil(totalDevices / limit)
      }
    });
  } catch (error: any) {
    console.error('Get devices by usage error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};