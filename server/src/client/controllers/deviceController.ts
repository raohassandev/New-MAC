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

import { Device, createDeviceModel, IDevice, clientModels } from '../models';
import { getClientDbConnection } from '../models/index';
import ModbusRTU from 'modbus-serial';
import chalk from 'chalk';
import { createModbusRTUClient, safeCloseModbusClient } from './modbusHelper';

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

// export const getDevices = async (req: AuthRequest, res: Response) => {
//   try {
//     console.log('[deviceController] getDevices: Starting retrieval of devices');

//     // Try to get the cached client device model first
//     // Try a different approach since getClientDeviceModel() is causing issues
//     let DeviceModel: mongoose.Model<IDevice> = Device;

//     // Always try to get it from other sources
//       console.log('[deviceController] No cached device model, trying alternatives');

//       // Get the client database connection and models
//       const clientModels = req.app.locals.clientModels;
//       const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();

//       // Check if we have client models
//       if (clientModels && clientModels.Device) {
//         DeviceModel = clientModels.Device;
//         console.log('[deviceController] Using client-specific Device model from app.locals');
//       } else if (mainDBConnection && mainDBConnection.readyState === 1) {
//         // Check if mainDBConnection (client connection) is available even if clientModels isn't set up
//         console.log('[deviceController] Creating Device model with client connection');
//         try {
//           DeviceModel = createDeviceModel(mainDBConnection);
//         } catch (err) {
//           console.error('[deviceController] Error creating Device model with client connection:', err);
//           console.warn('[deviceController] Falling back to default Device model');
//         }
//       } else {
//         console.warn('[deviceController] No client database connection available');
//       }
//     } else {
//       console.log('[deviceController] Using cached client device model');
//     }

//     // Safety check to ensure we only use client database models
//     if (DeviceModel && DeviceModel.db?.name !== 'client') {
//       console.error(`[deviceController] ERROR: Model connected to wrong database: ${DeviceModel.db?.name || 'unknown'}`);
//       console.log('[deviceController] Forcing reconnection to client database');

//       // Try to force create a new model with the client DB
//       const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
//       if (mainDBConnection && mainDBConnection.readyState === 1 && mainDBConnection.name === 'client') {
//         try {
//           DeviceModel = createDeviceModel(mainDBConnection);
//           console.log(`[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`);
//         } catch (reconnectError) {
//           console.error('[deviceController] Could not reconnect to client database:', reconnectError);
//         }
//       }
//     }

//     // Make sure we have a valid model
//     if (!DeviceModel) {
//       console.error('[deviceController] Failed to get a valid Device model');
//       return res.status(500).json({
//         message: 'Database connection error',
//         error: 'Could not initialize database model'
//       });
//     }

//     // Enhanced diagnostic logging
//     // console.log(`[deviceController] Database connection details:
//     //   - Connection state: ${DeviceModel.db?.readyState || 'unknown'}
//     //   - Database name: ${DeviceModel.db?.name || 'unknown'}
//     //   - Collection name: ${DeviceModel.collection.name || 'unknown'}
//     //   - Using client connection: ${DeviceModel.db?.name === 'client'}
//     // `);

//     // Set up pagination properly
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 50;
//     const skip = (page - 1) * limit;

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

//     // Set up sorting
//     let sortOptions: Record<string, 1 | -1> = { updatedAt: -1 }; // Default sort by last updated

//     if (req.query.sort) {
//       const sortField = String(req.query.sort);
//       const sortOrder = req.query.order === 'asc' ? 1 : -1;
//       sortOptions = { [sortField]: sortOrder };
//     }

//     console.log(`[deviceController] Executing find with filter: ${JSON.stringify(filter)}`);
//     console.log(`[deviceController] Pagination: page=${page}, limit=${limit}, skip=${skip}`);

//     // Execute query with pagination and use lean() for better performance
//     const devices = await DeviceModel.find(filter)
//       .sort(sortOptions)
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Get total count for pagination metadata
//     const totalDevices = await DeviceModel.countDocuments(filter);

//     console.log(`[deviceController] Retrieved ${devices.length} devices from ${DeviceModel.db?.name || 'unknown'} database (total: ${totalDevices})`);

//     return res.json({
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

// @desc    Get a single device
// @route   GET /api/devices/:id
// @access  Private

export const getDevices = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] getDevices: Starting retrieval of devices');

    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> = Device;

    // Check if we need to get the model from other sources
    const cachedModel = req.app.locals.cachedDeviceModel;
    if (!cachedModel) {
      console.log('[deviceController] No cached device model, trying alternatives');

      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();

      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available even if clientModels isn't set up
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error(
            '[deviceController] Error creating Device model with client connection:',
            err,
          );
          console.warn('[deviceController] Falling back to default Device model');
        }
      } else {
        console.warn('[deviceController] No client database connection available');
      }
    } else {
      console.log('[deviceController] Using cached client device model');
      DeviceModel = cachedModel;
    }

    // Safety check to ensure we only use client database models
    if (DeviceModel && DeviceModel.db?.name !== 'client') {
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Could not initialize database model',
      });
    }

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
        { 'connectionSetting.tcp.ip': { $regex: searchString, $options: 'i' } },
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
    const devices = await DeviceModel.find(filter).sort(sortOptions).skip(skip).limit(limit).lean();

    // Get total count for pagination metadata
    const totalDevices = await DeviceModel.countDocuments(filter);

    console.log(
      `[deviceController] Retrieved ${devices.length} devices from ${DeviceModel.db?.name || 'unknown'} database (total: ${totalDevices})`,
    );

    return res.json({
      devices,
      pagination: {
        total: totalDevices,
        page,
        limit,
        pages: Math.ceil(totalDevices / limit),
      },
    });
  } catch (error: any) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getDeviceById = async (req: AuthRequest, res: Response) => {
  try {
    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        '[deviceController] No cached device model for getDeviceById, trying alternatives',
      );

      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();

      // Check if we have client models
      if (clientModels && clientModels.Device) {
        // Use the client-specific model from app.locals if available
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from app.locals');
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // If we have a valid client connection but no model, create one
        console.log('[deviceController] Creating Device model with client connection');
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (modelError) {
          console.error(
            '[deviceController] Error creating Device model with client connection:',
            modelError,
          );
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
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database for getDeviceById');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
        }
      }
    }

    // Check if DeviceModel is null and handle it
    if (!DeviceModel) {
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Device model is null',
      });
    }

    // Check which database we're actually connected to
    const dbName = DeviceModel.db?.name || 'unknown';
    const connectionState = DeviceModel.db?.readyState || 0;
    console.log(
      `[deviceController] Device model connected to: ${dbName} (state: ${connectionState})`,
    );
    console.log(`[deviceController] Looking for device with ID: ${req.params.id}`);

    // Check if we should populate the device driver data
    const populateDriver = req.query.includeDriver === 'true';

    // Use separate approach for population to avoid TypeScript errors
    if (populateDriver && mongoose.models.DeviceDriver) {
      // First get the device
      const device = await DeviceModel.findById(req.params.id);

      if (!device) {
        console.warn(
          `[deviceController] Device with ID ${req.params.id} not found in database ${dbName}`,
        );
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
              console.warn(
                '[deviceController] AMX-specific DeviceDriver model not found, using default',
              );
            } catch (modelError) {
              console.error('[deviceController] Error: DeviceDriver model not found:', modelError);
              return res
                .status(500)
                .json({ message: 'Server error', error: 'DeviceDriver model not available' });
            }
          }

          const deviceDriver = await DeviceDriver.findById(device.deviceDriverId);
          console.log(
            `[deviceController] Populated device driver: ${deviceDriver?.name || 'Not found'}`,
          );

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
      // DeviceModel was already checked for null above
      const device = await DeviceModel.findById(req.params.id);

      if (!device) {
        console.warn(
          `[deviceController] Device with ID ${req.params.id} not found in database ${dbName}`,
        );
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
        email: req.user.email,
      };
      console.log(
        `[deviceController] Device being created by user: ${req.body.createdBy.username}`,
      );
    }

    // Log basic device information (without sensitive info)
    console.log(
      `[deviceController] Attempting to create device: "${req.body.name}" (Type: ${req.body.make || 'unknown'}, Model: ${req.body.model || 'unknown'})`,
    );

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
          slaveId: 1,
        };
      }

      // For RTU connection, make sure TCP fields are set with defaults
      if (connectionSetting.connectionType === 'rtu') {
        connectionSetting.tcp = {
          ip: 'N/A',
          port: 502,
          slaveId: 1,
        };
      }
    }

    // Try to get the device model
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        '[deviceController] No cached device model for createDevice, trying alternatives',
      );

      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();

      // First check if we have client models properly set up
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log('[deviceController] Using client-specific Device model from clientModels');
      }
      // If client models aren't available but mainDBConnection is, create model with client connection
      else if (mainDBConnection && mainDBConnection.readyState === 1) {
        console.log(
          '[deviceController] mainDBConnection found but clientModels not available - creating Device model with client connection',
        );
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            '[deviceController] Successfully created Device model with client connection',
          );
        } catch (modelError: any) {
          console.error(
            `[deviceController] ERROR: Failed to create Device model with client connection: ${modelError.message}`,
          );
          return res.status(500).json({
            message: 'Database connection error',
            error: 'Could not create device model with client connection',
          });
        }
      }
      // No client DB available - this is an error condition
      else {
        console.error(
          '[deviceController] ERROR: No client database connection available for device creation',
        );
        return res.status(500).json({
          message: 'Database connection error',
          error: 'Client database not available',
        });
      }
    } else {
      console.log('[deviceController] Using cached client device model for createDevice');
    }

    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database for createDevice');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
          return res.status(500).json({
            message: 'Database connection error',
            error: 'Could not reconnect to client database',
          });
        }
      } else {
        return res.status(500).json({
          message: 'Database connection error',
          error: 'Wrong database connection and could not reconnect',
        });
      }
    }

    // Enhanced diagnostic logging about database connection
    console.log(`[deviceController] Database connection diagnostics:
      - Connection state: ${DeviceModel?.db?.readyState || 'unknown'} (1=connected, 0=disconnected)
      - Database name: ${DeviceModel?.db?.name || 'unknown'}
      - Collection name: ${DeviceModel?.collection?.name || 'unknown'}
      - Connection ID: ${DeviceModel?.db?.id || 'unknown'}
      - Using client DB: ${Boolean(req.app.locals.mainDB || (req.app.locals.clientModels && req.app.locals.clientModels.Device))}
    `);

    // Create the device with all provided data
    // At this point we've done all the validation, and DeviceModel should be non-null
    // But add a final check to satisfy TypeScript
    if (!DeviceModel) {
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Device model is null',
      });
    }

    console.log(
      `[deviceController] Creating device in database: ${DeviceModel.db?.name || 'unknown'}`,
    );
    const device = await DeviceModel.create(req.body);

    console.log(
      `[deviceController] Device created successfully! ID: ${device._id}, Name: ${device.name}`,
    );

    // Return the created device
    res.status(201).json(device);
  } catch (error: any) {
    console.error('[deviceController] Create device error:', error);

    // Handle duplicate name error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res.status(400).json({
        message: 'A device with this name already exists',
        error: 'Duplicate device name',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors,
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
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        '[deviceController] No cached device model for updateDevice, trying alternatives',
      );

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
          console.error(
            '[deviceController] Error creating Device model with client connection:',
            err,
          );
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
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Could not initialize database model',
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
          slaveId: 1,
        };
      }

      // For RTU connection, make sure TCP fields are set with defaults
      if (connectionSetting.connectionType === 'rtu') {
        connectionSetting.tcp = {
          ip: 'N/A',
          port: 502,
          slaveId: 1,
        };
      }
    }

    // Update the updatedAt timestamp
    req.body.updatedAt = new Date();

    // Update device with new data
    const updatedDevice = await DeviceModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    console.log(
      `[deviceController] Device updated successfully! ID: ${device._id}, Name: ${device.name}`,
    );
    res.json(updatedDevice);
  } catch (error: any) {
    console.error('Update device error:', error);

    // Handle duplicate name error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res.status(400).json({
        message: 'A device with this name already exists',
        error: 'Duplicate device name',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors,
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
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        '[deviceController] No cached device model for deleteDevice, trying alternatives',
      );

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
          console.error(
            '[deviceController] Error creating Device model with client connection:',
            err,
          );
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
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Could not initialize database model',
      });
    }

    const device = await DeviceModel.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    await device.deleteOne();
    console.log(
      `[deviceController] Device deleted successfully! ID: ${req.params.id}, Name: ${device.name}`,
    );

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
    console.log(
      chalk.bgYellow.white(
        '[deviceController] testDeviceConnection: Starting device connection test',
      ),
    );

    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        chalk.bgRed.white(
          '[deviceController] No cached device model for testDeviceConnection, trying alternatives',
        ),
      );

      // Get the client database connection and models
      const clientModels = req.app.locals.clientModels;
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();

      // Check if we have client models
      if (clientModels && clientModels.Device) {
        DeviceModel = clientModels.Device;
        console.log(
          chalk.bgYellow.white(
            '[deviceController] Using client-specific Device model from app.locals',
          ),
        );
      } else if (mainDBConnection && mainDBConnection.readyState === 1) {
        // Check if mainDBConnection (client connection) is available
        console.log(
          chalk.bgGreen.white('[deviceController] Creating Device model with client connection'),
        );
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
        } catch (err) {
          console.error(
            chalk.bgRed.white(
              '[deviceController] Error creating Device model with client connection:',
            ),
            err,
          );
          console.warn(
            chalk.bgYellow.white('[deviceController] Falling back to default Device model'),
          );
          DeviceModel = Device;
        }
      } else {
        console.warn(
          chalk.bgYellow.white('[deviceController] No client database connection available'),
        );
        DeviceModel = Device;
      }
    } else {
      console.log(chalk.bgYellow.white('[deviceController] Using cached client device model'));
    }

    // Safety check to ensure we only use client database models
    if (!DeviceModel || DeviceModel.db?.name !== 'client') {
      console.error(
        chalk.bgRed.white(
          `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
        ),
      );
      console.log(chalk.bgBlue.white('[deviceController] Forcing reconnection to client database'));

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            chalk.green.white(
              `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
            ),
          );
        } catch (reconnectError) {
          console.error(
            chalk.bgRed.white('[deviceController] Could not reconnect to client database:'),
            reconnectError,
          );
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error(chalk.bgRed.white('[deviceController] Failed to get a valid Device model'));
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Could not initialize database model',
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
    let client: ModbusRTU | null = null;
    try {
      // Get connection settings (support both new and legacy format)
      const connectionType =
        device.connectionSetting?.connectionType || device.connectionType || 'tcp';

      // Get TCP settings
      const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : device.ip || '';
      const port =
        connectionType === 'tcp' ? device.connectionSetting?.tcp?.port : device.port || 0;
      const tcpSlaveId =
        connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;

      // Get RTU settings
      const serialPort =
        connectionType === 'rtu'
          ? device.connectionSetting?.rtu?.serialPort
          : device.serialPort || '';
      const baudRate =
        connectionType === 'rtu' ? device.connectionSetting?.rtu?.baudRate : device.baudRate || 0;
      const dataBits =
        connectionType === 'rtu' ? device.connectionSetting?.rtu?.dataBits : device.dataBits || 0;
      const stopBits =
        connectionType === 'rtu' ? device.connectionSetting?.rtu?.stopBits : device.stopBits || 0;
      const parity =
        connectionType === 'rtu' ? device.connectionSetting?.rtu?.parity : device.parity || '';
      const rtuSlaveId =
        connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;

      // Combined slaveId (prefer the one from the matching connection type)
      const slaveId = connectionType === 'tcp' ? tcpSlaveId : rtuSlaveId || device.slaveId || 1;

      // Log connection details for debugging
      console.log(
        chalk.cyan(
          `[deviceController] Testing connection to ${connectionType.toUpperCase()} device:`,
        ),
      );
      if (connectionType === 'tcp') {
        console.log(chalk.cyan(`[deviceController] IP: ${ip}, Port: ${port}, SlaveID: ${slaveId}`));
      } else {
        console.log(
          chalk.cyan(
            `[deviceController] Serial Port: ${serialPort}, Baud Rate: ${baudRate}, SlaveID: ${slaveId}`,
          ),
        );
      }

      // Set connection timeout to handle non-responsive devices
      const connectionTimeout = 10000; // 10 seconds

      // Create a standard client to use existing code
      client = new ModbusRTU();

      try {
        // Connect based on connection type
        if (connectionType === 'tcp' && ip && port) {
          // Set a timeout for TCP connection
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error(`Connection timeout after ${connectionTimeout}ms`)),
              connectionTimeout,
            );
          });

          // Race the connection and timeout
          await Promise.race([client.connectTCP(ip, { port }), timeoutPromise]);

          console.log(
            chalk.green(`[deviceController] Successfully connected to TCP device at ${ip}:${port}`),
          );
        } else if (connectionType === 'rtu' && serialPort) {
          const rtuOptions: any = {};
          if (baudRate) rtuOptions.baudRate = baudRate;
          if (dataBits) rtuOptions.dataBits = dataBits;
          if (stopBits) rtuOptions.stopBits = stopBits;
          if (parity) rtuOptions.parity = parity;

          // Use our helper function for RTU connections to avoid port contention
          await safeCloseModbusClient(client); // Close the standard client first
          client = await createModbusRTUClient(serialPort, {
            baudRate: baudRate || 9600,
            dataBits: (dataBits as 5 | 6 | 7 | 8) || 8,
            stopBits: (stopBits as 1 | 2) || 1,
            parity: (parity as 'none' | 'even' | 'odd') || 'none',
            timeout: connectionTimeout,
            unitId: slaveId,
          });

          console.log(
            chalk.green(`[deviceController] Successfully connected to RTU device at ${serialPort}`),
          );
        } else {
          throw new Error('Invalid connection configuration');
        }
      } catch (connectionError: any) {
        // Add more detailed error reporting
        console.error(chalk.red(`[deviceController] Connection error:`), connectionError);

        if (connectionError.code === 'ECONNREFUSED') {
          throw new Error(
            `Connection refused at ${ip}:${port}. The device may be offline or unreachable.`,
          );
        } else if (
          connectionError.code === 'ETIMEDOUT' ||
          connectionError.message.includes('timeout')
        ) {
          throw new Error(`Connection timed out. Device at ${ip}:${port} is not responding.`);
        } else if (connectionError.message.includes('Port is opening')) {
          throw new Error(`Serial port ${serialPort} is already in use by another process.`);
        } else {
          // Re-throw with original error for other cases
          throw connectionError;
        }
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

      console.log(
        chalk.yellow(
          `[deviceController] Testing read operation with address ${address} using function code ${functionCode}`,
        ),
      );

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

      console.log(chalk.bgGreen.black(`[deviceController] Read operation successful!`));

      // Update device lastSeen timestamp
      device.lastSeen = new Date();
      await device.save();
      console.log(
        chalk.green(`[deviceController] Updated device lastSeen timestamp to ${device.lastSeen}`),
      );

      // Send a clear success response with additional details for the frontend
      const successResponse = {
        success: true,
        message: 'Successfully connected to device',
        deviceInfo: {
          name: device.name,
          id: device._id,
          connectionType:
            device.connectionSetting?.connectionType || device.connectionType || 'tcp',
          address:
            device.connectionSetting?.connectionType === 'tcp' && device.connectionSetting?.tcp
              ? `${device.connectionSetting.tcp.ip || ''}:${device.connectionSetting.tcp.port || ''}`
              : device.connectionSetting?.rtu?.serialPort || '',
          lastSeen: device.lastSeen,
        },
        timestamp: new Date().toISOString(),
        status: 'CONNECTED',
      };

      console.log(
        chalk.green(
          `[deviceController] Sending success response to client: ${JSON.stringify(successResponse)}`,
        ),
      );
      res.json(successResponse);
    } catch (modbusError: any) {
      console.error(chalk.bgRed.white('Modbus connection error:'), modbusError);

      // Create a more detailed error message based on error type
      let errorMessage = 'Connection failed';
      let errorType = 'UNKNOWN_ERROR';
      let troubleshooting = 'Verify your device configuration and try again.';

      // Store the connection type in local variable
      const deviceConnectionType =
        device.connectionSetting?.connectionType || device.connectionType || 'tcp';

      // Store connection info locally for error messages to avoid scope issues
      const deviceIp =
        deviceConnectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : device.ip || '';
      const devicePort =
        deviceConnectionType === 'tcp' ? device.connectionSetting?.tcp?.port : device.port || 0;
      const deviceSerialPort =
        deviceConnectionType === 'rtu'
          ? device.connectionSetting?.rtu?.serialPort
          : device.serialPort || '';

      if (modbusError.code === 'ECONNREFUSED') {
        errorType = 'CONNECTION_REFUSED';
        errorMessage = `Connection refused at ${deviceIp}:${devicePort}. The device may be offline or unreachable.`;
        troubleshooting =
          'Please check:\n• Device is powered on and network is connected\n• IP address and port are correct\n• Any firewalls or network security is allowing the connection\n• The device is properly configured to accept Modbus TCP connections';
        console.log(
          chalk.red(`[deviceController] Connection refused at ${deviceIp}:${devicePort}`),
        );
      } else if (modbusError.code === 'ETIMEDOUT') {
        errorType = 'CONNECTION_TIMEOUT';
        errorMessage = `Connection timed out when connecting to ${deviceIp}:${devicePort}. The device is not responding.`;
        troubleshooting =
          'Please check:\n• Network connectivity to the device\n• Device is powered on and functioning\n• Device is not in a busy state or overloaded\n• Network latency is not too high';
        console.log(
          chalk.red(
            `[deviceController] Connection timed out for device at ${deviceIp}:${devicePort}`,
          ),
        );
      } else if (modbusError.message.includes('No such file or directory')) {
        errorType = 'PORT_NOT_FOUND';
        errorMessage = `Serial port ${deviceSerialPort} does not exist on this system.`;
        troubleshooting =
          'Please check:\n• Serial port name is correct (COM ports on Windows, /dev/tty* on Linux/Mac)\n• Serial device is properly connected to the computer\n• Serial-to-USB adapter drivers are installed if applicable\n• The port is not being used by another application';
        console.log(chalk.red(`[deviceController] Serial port not found: ${deviceSerialPort}`));
      } else if (modbusError.message.includes('Access denied')) {
        errorType = 'PERMISSION_DENIED';
        errorMessage = `Permission denied for serial port ${deviceSerialPort}.`;
        troubleshooting =
          'Please check:\n• Your account has permissions to access serial ports\n• On Linux/Mac, you may need to add your user to the "dialout" group\n• Serial port is not locked by another process\n• Try running the application with administrator/root privileges';
        console.log(
          chalk.red(`[deviceController] Permission denied for serial port: ${deviceSerialPort}`),
        );
      } else if (modbusError.message.includes('Port is opening')) {
        errorType = 'PORT_BUSY';
        errorMessage = 'The serial port is in use by another process.';
        troubleshooting =
          'Please check:\n• Close any other applications that might be using the serial port\n• Restart the device to release any locked port connections\n• On Windows, check Device Manager to see if the port has any conflicts';
        console.log(chalk.red(`[deviceController] Serial port busy: ${deviceSerialPort}`));
      } else if (modbusError.message.includes('Received no valid response')) {
        errorType = 'DEVICE_NO_RESPONSE';
        errorMessage = 'The device did not respond correctly to the Modbus request.';
        troubleshooting =
          'Please check:\n• The slave/unit ID is correct\n• The Modbus device is configured to respond to the function code being used\n• The device supports the Modbus commands being sent\n• The register address is within the valid range for this device';
        console.log(
          chalk.red(
            `[deviceController] No valid response from device, slave ID: ${device.slaveId}`,
          ),
        );
      } else if (modbusError.message.includes('Illegal function')) {
        errorType = 'ILLEGAL_FUNCTION';
        errorMessage = 'The device does not support the Modbus function being used.';
        troubleshooting =
          'Please check:\n• The device documentation for supported Modbus function codes\n• Verify the correct function code is being used for this device\n• Some devices only support a subset of Modbus functions';
        console.log(chalk.red(`[deviceController] Illegal function code`));
      } else if (modbusError.message.includes('Illegal data address')) {
        errorType = 'ILLEGAL_ADDRESS';
        errorMessage = 'The register address requested does not exist on this device.';
        troubleshooting =
          'Please check:\n• The register address map documentation for your device\n• Address mapping (e.g., some devices start at 0, others at 1)\n• Address offsets and ranges for this specific device model';
        console.log(chalk.red(`[deviceController] Illegal data address error`));
      } else if (modbusError.message.includes('Port Not Open')) {
        errorType = 'PORT_NOT_OPEN';
        errorMessage = 'The connection was lost during communication.';
        troubleshooting =
          'Please check:\n• Device power and network stability\n• Connection issues or interference\n• Try restarting both the device and the application';
        console.log(chalk.red(`[deviceController] Port Not Open error - connection lost`));
      } else if (modbusError.message) {
        errorMessage = `${errorMessage}: ${modbusError.message}`;
        troubleshooting =
          'Review device documentation and Modbus specifications for more specific guidance.';
        console.log(chalk.red(`[deviceController] Error: ${modbusError.message}`));
      }

      console.log(
        chalk.yellow(`[deviceController] Sending error response with type: ${errorType}`),
      );

      // Structure the error response to be more easily interpretable by the frontend
      const errorResponse = {
        success: false,
        message: errorMessage,
        error: modbusError.message,
        troubleshooting: troubleshooting,
        errorType: errorType,
        deviceInfo: {
          name: device.name,
          id: device._id,
          connectionType: deviceConnectionType,
          // Safely build the address string with null checks and defaults
          address:
            deviceConnectionType === 'tcp'
              ? `${deviceIp || 'unknown'}:${devicePort || 'unknown'}`
              : deviceSerialPort || 'unknown',
        },
        timestamp: new Date().toISOString(),
        status: 'ERROR',
      };

      console.log(
        chalk.yellow(`[deviceController] Error response: ${JSON.stringify(errorResponse)}`),
      );

      // Use 200 status with success: false instead of 400 to ensure the frontend always receives and can display the response
      res.status(200).json(errorResponse);
    } finally {
      // Use our safer helper function to close the connection
      await safeCloseModbusClient(client);
      console.log(chalk.blue(`[deviceController] Closed Modbus connection`));
    }
  } catch (error: any) {
    console.error(chalk.bgRed.white('Test connection error:'), error);

    // Structure server errors consistently with other responses
    const serverErrorResponse = {
      success: false,
      message: 'Server error processing the connection test',
      error: error.message,
      errorType: 'SERVER_ERROR',
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      deviceInfo: {
        id: req.params.id,
        // We don't have the device info here since the error happened before we could retrieve it
      },
    };

    console.log(
      chalk.bgRed.white(
        `[deviceController] Server error response: ${JSON.stringify(serverErrorResponse)}`,
      ),
    );

    // Use 200 status with success: false for consistency with other error responses
    res.status(200).json(serverErrorResponse);
  }
};

// @desc    Read registers from a device
// @route   GET /api/devices/:id/read
// @access  Private
export const readDeviceRegisters = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceController] readDeviceRegisters: Starting device register read');

    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        '[deviceController] No cached device model for readDeviceRegisters, trying alternatives',
      );

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
          console.error(
            '[deviceController] Error creating Device model with client connection:',
            err,
          );
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
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Could not initialize database model',
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
    const connectionType =
      device.connectionSetting?.connectionType || device.connectionType || 'tcp';

    // Get TCP settings
    const ip = connectionType === 'tcp' ? device.connectionSetting?.tcp?.ip : device.ip || '';
    const port = connectionType === 'tcp' ? device.connectionSetting?.tcp?.port : device.port || 0;
    const tcpSlaveId =
      connectionType === 'tcp' ? device.connectionSetting?.tcp?.slaveId : undefined;

    // Get RTU settings
    const serialPort =
      connectionType === 'rtu'
        ? device.connectionSetting?.rtu?.serialPort
        : device.serialPort || '';
    const baudRate =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.baudRate : device.baudRate || 0;
    const dataBits =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.dataBits : device.dataBits || 0;
    const stopBits =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.stopBits : device.stopBits || 0;
    const parity =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.parity : device.parity || '';
    const rtuSlaveId =
      connectionType === 'rtu' ? device.connectionSetting?.rtu?.slaveId : undefined;

    // Combined slaveId (prefer the one from the matching connection type)
    const slaveId = connectionType === 'tcp' ? tcpSlaveId : rtuSlaveId || device.slaveId || 1;

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

        // await client.connectRTUBuffered(serialPort.replace(/\s+/g, ''), rtuOptions);
        await client.connectRTUBuffered('/dev/tty.usbserial-A50285BI', rtuOptions);
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
        console.log(
          `[deviceController] Reading from device data points: ${device.dataPoints.length} points`,
        );

        for (const dataPoint of device.dataPoints) {
          try {
            const range = dataPoint.range;
            const parser = dataPoint.parser;

            // Log the dataPoint structure for debugging
            // console.log(`[deviceController] DataPoint structure:`, JSON.stringify({
            //   range: range,
            //   parser: {
            //     parameterCount: parser?.parameters?.length || 0,
            //     parameters: parser?.parameters || []
            //   }
            // }, null, 2));

            // Read registers based on function code
            let result;

            // Apply device-specific register address adjustments
            let startAddress = range.startAddress;

            // Handle different register addressing conventions based on device make
            if (
              device.make?.toLowerCase().includes('china') ||
              device.make?.toLowerCase().includes('energy analyzer')
            ) {
              // Some Chinese Energy Analyzers use 1-based addressing while Modbus is 0-based
              // No adjustment needed - already uses absolute addressing
              console.log(
                `[deviceController] Using standard register addressing for Chinese Energy Analyzer`,
              );
            } else if (device.advancedSettings?.connectionOptions?.retries === 0) {
              // This is a trick - we're using the retries=0 as a flag for devices that need -1 adjustment
              // This could be replaced with a more explicit flag in the future
              startAddress = startAddress - 1;
              console.log(
                `[deviceController] Using 0-based register addressing (adjusted from ${range.startAddress} to ${startAddress})`,
              );
            }

            // Determine optimal register count to read
            let adjustedCount: number;

            // For Chinese Energy Analyzers, we might need to read more registers
            if (
              device.make?.toLowerCase().includes('china') ||
              device.make?.toLowerCase().includes('energy analyzer')
            ) {
              // Some Energy Analyzers require reading the full range to work properly
              adjustedCount = range.count;
              console.log(
                `[deviceController] Using full register count ${adjustedCount} for Chinese Energy Analyzer`,
              );
            } else {
              // For other devices, limit to 2 registers for better compatibility
              adjustedCount = range.count > 2 ? 2 : range.count;
              if (range.count > 2) {
                console.log(
                  `[deviceController] Reducing read count from ${range.count} to ${adjustedCount} for better compatibility`,
                );
              }
            }

            console.log(
              `[deviceController] Reading registers using FC${range.fc} from address ${startAddress}, count ${adjustedCount}`,
            );

            switch (range.fc) {
              case 1:
                result = await client.readCoils(startAddress, adjustedCount);
                break;
              case 2:
                result = await client.readDiscreteInputs(startAddress, adjustedCount);
                break;
              case 3:
                result = await client.readHoldingRegisters(startAddress, adjustedCount);
                break;
              case 4:
                result = await client.readInputRegisters(startAddress, adjustedCount);
                break;
              default:
                result = await client.readHoldingRegisters(startAddress, adjustedCount);
                console.log('readHoldingRegisters ', chalk.bgWhite(result));
            }

            console.log(
              `[deviceController] Successfully read ${adjustedCount} registers from address ${startAddress} using FC${range.fc}`,
            );
            console.log(`[deviceController] Read Result:`, result);

            // Process the result based on parser configuration
            if (parser && parser.parameters) {
              console.log(
                `[deviceController] Processing parser with ${parser.parameters.length} parameters`,
              );

              for (const param of parser.parameters) {
                try {
                  console.log(
                    `[deviceController] Processing parameter: ${param.name}, registerIndex: ${param.registerIndex}, dataType: ${param.dataType}`,
                  );

                  // Determine relative index based on the register addressing mode
                  let relativeIndex: number;

                  // Check if the parameter's registerIndex is within the range's bounds
                  const isWithinRange =
                    param.registerIndex >= range.startAddress &&
                    param.registerIndex < range.startAddress + range.count;

                  // If registerIndex is within the range's bounds, it's likely an absolute address
                  if (isWithinRange) {
                    relativeIndex = param.registerIndex - range.startAddress;
                    console.log(
                      `[deviceController] Using absolute addressing mode: ${param.registerIndex} - ${range.startAddress} = ${relativeIndex}`,
                    );
                  }
                  // If registerIndex is very small, it's likely a direct offset (relative)
                  else if (param.registerIndex < range.count) {
                    relativeIndex = param.registerIndex;
                    console.log(
                      `[deviceController] Using relative addressing mode with direct offset: ${param.registerIndex}`,
                    );
                  }
                  // If none of the above, guess based on whether it's closer to a direct offset or an absolute address
                  else {
                    // Calculate both possibilities
                    const asRelative = param.registerIndex;
                    const asAbsolute = param.registerIndex - range.startAddress;

                    // Choose the one that makes more sense (is in range)
                    if (asAbsolute >= 0 && asAbsolute < range.count) {
                      relativeIndex = asAbsolute;
                      console.log(
                        `[deviceController] Inferred absolute addressing mode: ${param.registerIndex} - ${range.startAddress} = ${relativeIndex}`,
                      );
                    } else {
                      // Fallback to treating it as a direct offset but warn about potential issues
                      relativeIndex = asRelative;
                      console.log(
                        `[deviceController] WARNING: Register index ${param.registerIndex} doesn't align with range ${range.startAddress}-${range.startAddress + range.count - 1}. Using as direct offset.`,
                      );
                    }
                  }

                  console.log(
                    `[deviceController] Final calculated relative index: ${relativeIndex}`,
                  );

                  if (relativeIndex < 0 || relativeIndex >= adjustedCount) {
                    console.log(
                      `[deviceController] Parameter ${param.name} index out of range: ${relativeIndex} not in [0-${adjustedCount - 1}]`,
                    );
                    continue; // Skip if out of range
                  }

                  let value: any;

                  try {
                    // Handle data types that span multiple registers
                    if (param.dataType === 'FLOAT32' && param.wordCount === 2) {
                      // For FLOAT32, we need to read two consecutive registers
                      if (relativeIndex + 1 < adjustedCount) {
                        // Check if data exists
                        if (
                          !result.data ||
                          !Array.isArray(result.data) ||
                          result.data.length <= relativeIndex
                        ) {
                          console.log(
                            `[deviceController] Cannot read FLOAT32 - result data is invalid. Actual data:`,
                            result.data,
                          );
                          value = null;
                        } else {
                          // Apply device-specific defaults for byte order based on device make/model
                          let byteOrder = param.byteOrder;

                          // If no byte order is specified, apply defaults based on device make
                          if (!byteOrder) {
                            // Handle specific manufacturers' defaults
                            if (
                              device.make?.toLowerCase().includes('china') ||
                              device.make?.toLowerCase().includes('energy analyzer')
                            ) {
                              // China Energy Analyzer typically uses CDAB format
                              byteOrder = 'CDAB';
                              console.log(
                                `[deviceController] Applying China Energy Analyzer default byte order: CDAB`,
                              );
                            } else if (device.make?.toLowerCase().includes('schneider')) {
                              // Schneider Electric typically uses ABCD format
                              byteOrder = 'ABCD';
                              console.log(
                                `[deviceController] Applying Schneider Electric default byte order: ABCD`,
                              );
                            } else if (device.make?.toLowerCase().includes('siemens')) {
                              // Siemens typically uses BADC format
                              byteOrder = 'BADC';
                              console.log(
                                `[deviceController] Applying Siemens default byte order: BADC`,
                              );
                            } else {
                              // Default to ABCD if no specific match
                              byteOrder = 'ABCD';
                              console.log(
                                `[deviceController] No device-specific byte order found, using default: ABCD`,
                              );
                            }
                          }

                          console.log(
                            `[deviceController] Processing FLOAT32 with byteOrder: ${byteOrder}`,
                          );

                          const reg1 = result.data[relativeIndex];
                          const reg2 = result.data[relativeIndex + 1];

                          console.log(
                            `[deviceController] Raw registers: reg1=${reg1}, reg2=${reg2}`,
                          );

                          // Validate registers are numbers
                          if (typeof reg1 !== 'number' || typeof reg2 !== 'number') {
                            console.log(
                              `[deviceController] Invalid register values: reg1=${reg1}, reg2=${reg2}. Both must be numbers.`,
                            );
                            // Make sure reg1 and reg2 are valid numbers before processing
                            const validReg1 = typeof reg1 === 'number' ? reg1 : 0;
                            const validReg2 = typeof reg2 === 'number' ? reg2 : 0;

                            console.log(
                              `[deviceController] Using fallback values: reg1=${validReg1}, reg2=${validReg2}`,
                            );

                            // Use a more robust approach with a try-catch
                            try {
                              // Create buffer to store the values
                              const buffer = Buffer.alloc(4);

                              // Map byteOrder string to ByteOrder enum
                              let mappedByteOrder: string;
                              switch (byteOrder) {
                                case 'ABCD':
                                  mappedByteOrder = 'ABCD';
                                  break;
                                case 'CDAB':
                                  mappedByteOrder = 'CDAB';
                                  break;
                                case 'BADC':
                                  mappedByteOrder = 'BADC';
                                  break;
                                case 'DCBA':
                                  mappedByteOrder = 'DCBA';
                                  break;
                                default:
                                  console.log(
                                    `[deviceController] Unknown byte order: ${byteOrder}, defaulting to ABCD`,
                                  );
                                  mappedByteOrder = 'ABCD';
                              }

                              // Write the registers to the buffer according to byte order
                              if (mappedByteOrder === 'ABCD') {
                                buffer.writeUInt16BE(validReg1, 0);
                                buffer.writeUInt16BE(validReg2, 2);
                              } else if (mappedByteOrder === 'CDAB') {
                                buffer.writeUInt16BE(validReg2, 0);
                                buffer.writeUInt16BE(validReg1, 2);
                              } else if (mappedByteOrder === 'BADC') {
                                // Swap bytes within each word
                                buffer.writeUInt16LE(validReg1, 0);
                                buffer.writeUInt16LE(validReg2, 2);
                              } else if (mappedByteOrder === 'DCBA') {
                                // Complete reverse
                                buffer.writeUInt16LE(validReg2, 0);
                                buffer.writeUInt16LE(validReg1, 2);
                              }

                              // Convert buffer to float - don't need the signed check as floating point is always signed
                              value = buffer.readFloatBE(0);

                              console.log(`[deviceController] Converted FLOAT32 value: ${value}`);

                              // Check for NaN or Infinity
                              if (!isFinite(value)) {
                                console.log(
                                  `[deviceController] Warning: FLOAT32 conversion resulted in ${value}, using null instead.`,
                                );
                                value = null;
                              }
                            } catch (bufferError) {
                              console.error(
                                `[deviceController] Buffer operation error:`,
                                bufferError,
                              );
                              value = null;
                            }
                          } else {
                            // Both registers are valid numbers, proceed normally
                            try {
                              // Create buffer to store the values
                              const buffer = Buffer.alloc(4);

                              // Map byteOrder string to ByteOrder enum
                              let mappedByteOrder: string;
                              switch (byteOrder) {
                                case 'ABCD':
                                  mappedByteOrder = 'ABCD';
                                  break;
                                case 'CDAB':
                                  mappedByteOrder = 'CDAB';
                                  break;
                                case 'BADC':
                                  mappedByteOrder = 'BADC';
                                  break;
                                case 'DCBA':
                                  mappedByteOrder = 'DCBA';
                                  break;
                                default:
                                  console.log(
                                    `[deviceController] Unknown byte order: ${byteOrder}, defaulting to ABCD`,
                                  );
                                  mappedByteOrder = 'ABCD';
                              }

                              // Write the registers to the buffer according to byte order
                              if (mappedByteOrder === 'ABCD') {
                                buffer.writeUInt16BE(reg1, 0);
                                buffer.writeUInt16BE(reg2, 2);
                              } else if (mappedByteOrder === 'CDAB') {
                                buffer.writeUInt16BE(reg2, 0);
                                buffer.writeUInt16BE(reg1, 2);
                              } else if (mappedByteOrder === 'BADC') {
                                // Swap bytes within each word
                                buffer.writeUInt16LE(reg1, 0);
                                buffer.writeUInt16LE(reg2, 2);
                              } else if (mappedByteOrder === 'DCBA') {
                                // Complete reverse
                                buffer.writeUInt16LE(reg2, 0);
                                buffer.writeUInt16LE(reg1, 2);
                              }

                              // Convert buffer to float
                              value = buffer.readFloatBE(0);

                              console.log(`[deviceController] Converted FLOAT32 value: ${value}`);

                              // Check for NaN or Infinity
                              if (!isFinite(value)) {
                                console.log(
                                  `[deviceController] Warning: FLOAT32 conversion resulted in ${value}, using null instead.`,
                                );
                                value = null;
                              }
                            } catch (bufferError) {
                              console.error(
                                `[deviceController] Buffer operation error:`,
                                bufferError,
                              );
                              value = null;
                            }
                          }
                        }
                      } else {
                        console.log(
                          `[deviceController] Cannot read FLOAT32 - not enough registers available.`,
                        );
                        value = null;
                      }
                    } else {
                      // Standard single register processing
                      if (
                        !result.data ||
                        !Array.isArray(result.data) ||
                        result.data.length <= relativeIndex
                      ) {
                        console.log(
                          `[deviceController] Cannot read register at index ${relativeIndex} - result data is invalid.`,
                        );
                        value = null;
                      } else {
                        value = result.data[relativeIndex];
                        console.log(`[deviceController] Read single register value: ${value}`);
                      }
                    }
                  } catch (dataTypeError) {
                    console.error(
                      `[deviceController] Error processing data type ${param.dataType}:`,
                      dataTypeError,
                    );
                    value = null;
                  }

                  console.log(`[deviceController] Raw value at index ${relativeIndex}: ${value}`);

                  try {
                    // Skip further processing if value is null
                    if (value === null || value === undefined) {
                      console.log(
                        `[deviceController] Skipping scaling/formatting for ${param.name} because value is ${value}`,
                      );
                    } else {
                      // Make sure value is a number before applying scaling
                      if (typeof value !== 'number') {
                        console.log(
                          `[deviceController] Warning: Value for ${param.name} is not a number (${typeof value}: ${value}), attempting to convert`,
                        );
                        const numericValue = Number(value);
                        if (!isNaN(numericValue)) {
                          value = numericValue;
                          console.log(
                            `[deviceController] Successfully converted value to number: ${value}`,
                          );
                        } else {
                          console.log(
                            `[deviceController] Could not convert value to number, setting to null`,
                          );
                          value = null;
                        }
                      }

                      // Apply scaling factor if defined and value is a number
                      if (
                        param.scalingFactor &&
                        param.scalingFactor !== 1 &&
                        typeof value === 'number'
                      ) {
                        try {
                          const originalValue = value;
                          value = value * param.scalingFactor;
                          console.log(
                            `[deviceController] Applied scaling factor: ${originalValue} * ${param.scalingFactor} = ${value}`,
                          );

                          // Check for invalid results
                          if (!isFinite(value)) {
                            console.log(
                              `[deviceController] Warning: Scaling resulted in ${value}, reverting to original value`,
                            );
                            value = originalValue;
                          }
                        } catch (scalingError) {
                          console.error(
                            `[deviceController] Error applying scaling factor to ${param.name}:`,
                            scalingError,
                          );
                        }
                      }

                      // Apply scaling equation if defined and value is a number
                      if (param.scalingEquation && typeof value === 'number') {
                        try {
                          // Simple equation evaluation (x is the value)
                          const x = value;
                          const originalValue = value;

                          // Use Function constructor to safely evaluate the equation
                          value = new Function('x', `return ${param.scalingEquation}`)(x);
                          console.log(
                            `[deviceController] Applied scaling equation: ${param.scalingEquation} with x=${originalValue}, result=${value}`,
                          );

                          // Check for invalid results
                          if (!isFinite(value)) {
                            console.log(
                              `[deviceController] Warning: Equation resulted in ${value}, reverting to original value`,
                            );
                            value = originalValue;
                          }
                        } catch (equationError: any) {
                          console.error(
                            `[deviceController] Scaling equation error for parameter ${param.name}:`,
                            equationError,
                          );
                          // Keep the original value if the equation fails
                          console.log(
                            `[deviceController] Keeping original value due to equation error`,
                          );
                        }
                      }

                      // Format decimal places if defined and value is a number
                      if (
                        param.decimalPoint !== undefined &&
                        param.decimalPoint >= 0 &&
                        typeof value === 'number'
                      ) {
                        try {
                          const originalValue = value;
                          value = parseFloat(value.toFixed(param.decimalPoint));
                          console.log(
                            `[deviceController] Formatted decimal places: ${originalValue} to ${param.decimalPoint} places = ${value}`,
                          );
                        } catch (formatError) {
                          console.error(
                            `[deviceController] Error formatting decimal places for ${param.name}:`,
                            formatError,
                          );
                        }
                      }

                      // Apply min/max constraints if defined and value is a number
                      if (typeof value === 'number') {
                        if (param.maxValue !== undefined && value > param.maxValue) {
                          console.log(
                            `[deviceController] Value ${value} exceeds maxValue ${param.maxValue}, clamping`,
                          );
                          value = param.maxValue;
                        }
                        if (param.minValue !== undefined && value < param.minValue) {
                          console.log(
                            `[deviceController] Value ${value} below minValue ${param.minValue}, clamping`,
                          );
                          value = param.minValue;
                        }
                      }
                    }
                  } catch (processingError) {
                    console.error(
                      `[deviceController] Error during value processing for ${param.name}:`,
                      processingError,
                    );
                    // Leave value as is, don't change it due to error in processing
                  }

                  // Log the final processed value
                  console.log(
                    `[deviceController] Final processed value for parameter "${param.name}": ${value}${param.unit ? ' ' + param.unit : ''}`,
                  );

                  readings.push({
                    name: param.name,
                    registerIndex: param.registerIndex,
                    value: value,
                    unit: param.unit || '',
                    dataType: param.dataType,
                    // Include additional metadata that might be useful for debugging
                    description: param.description || '',
                  });
                } catch (paramError: any) {
                  console.error(
                    `[deviceController] Error processing parameter ${param.name}:`,
                    paramError,
                  );
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
            console.error(
              `Error reading range (${dataPoint.range.startAddress}-${dataPoint.range.startAddress + dataPoint.range.count - 1}):`,
              rangeError,
            );
            // Continue to next range even if this one fails
          }
        }
      }
      // LEGACY STRUCTURE: Read each configured register
      else if (hasLegacyConfig && device.registers) {
        for (const register of device.registers) {
          try {
            const result = await client.readHoldingRegisters(register.address, register.length);

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

      // Log the final readings array
      console.log(
        `[deviceController] Final readings results (${readings.length} values):`,
        JSON.stringify(readings, null, 1),
      );

      res.json({
        deviceId: device._id,
        deviceName: device.name,
        timestamp: new Date(),
        readings,
      });
    } catch (modbusError: any) {
      console.error('Modbus reading error => :', modbusError);
      res.status(400).json({
        message: `Failed to read from device: ${modbusError.message}`,
      });
    } finally {
      // Use our helper function to safely close the connection
      await safeCloseModbusClient(client);
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
    console.log(
      '[deviceController] getDevicesByDriverId: Starting retrieval of devices by driver ID',
    );

    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        '[deviceController] No cached device model for getDevicesByDriverId, trying alternatives',
      );

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
          console.error(
            '[deviceController] Error creating Device model with client connection:',
            err,
          );
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
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Could not initialize database model',
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
      isTemplate: { $ne: true }, // Exclude templates
    };

    console.log(`[deviceController] Querying for devices with driver ID: ${driverId}`);

    // Execute query with pagination
    const devices = await DeviceModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit);

    // Get total count for pagination
    const totalDevices = await DeviceModel.countDocuments(filter);

    console.log(
      `[deviceController] Found ${devices.length} devices with driver ID: ${driverId} (total: ${totalDevices})`,
    );

    res.json({
      devices,
      deviceDriverId: driverId,
      pagination: {
        total: totalDevices,
        page,
        limit,
        pages: Math.ceil(totalDevices / limit),
      },
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
    console.log(
      '[deviceController] getDevicesByUsage: Starting retrieval of devices by usage category',
    );

    // Try to get the cached client device model first
    let DeviceModel: mongoose.Model<IDevice> | null = null;

    // Always try to get it from other sources
    if (!DeviceModel) {
      console.log(
        '[deviceController] No cached device model for getDevicesByUsage, trying alternatives',
      );

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
          console.error(
            '[deviceController] Error creating Device model with client connection:',
            err,
          );
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
      console.error(
        `[deviceController] ERROR: Model connected to wrong database: ${DeviceModel?.db?.name || 'unknown'}`,
      );
      console.log('[deviceController] Forcing reconnection to client database');

      // Try to force create a new model with the client DB
      const mainDBConnection = req.app.locals.mainDB || getClientDbConnection();
      if (
        mainDBConnection &&
        mainDBConnection.readyState === 1 &&
        mainDBConnection.name === 'client'
      ) {
        try {
          DeviceModel = createDeviceModel(mainDBConnection);
          console.log(
            `[deviceController] Successfully reconnected to client database: ${DeviceModel.db?.name}`,
          );
        } catch (reconnectError) {
          console.error(
            '[deviceController] Could not reconnect to client database:',
            reconnectError,
          );
        }
      }
    }

    // Make sure we have a valid model
    if (!DeviceModel) {
      console.error('[deviceController] Failed to get a valid Device model');
      return res.status(500).json({
        message: 'Database connection error',
        error: 'Could not initialize database model',
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
      isTemplate: { $ne: true }, // Exclude templates
    };

    console.log(`[deviceController] Querying for devices with usage category: ${usage}`);

    // Execute query with pagination
    const devices = await DeviceModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit);

    // Get total count for pagination
    const totalDevices = await DeviceModel.countDocuments(filter);

    console.log(
      `[deviceController] Found ${devices.length} devices with usage category: ${usage} (total: ${totalDevices})`,
    );

    res.json({
      devices,
      usage,
      pagination: {
        total: totalDevices,
        page,
        limit,
        pages: Math.ceil(totalDevices / limit),
      },
    });
  } catch (error: any) {
    console.error('Get devices by usage error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
