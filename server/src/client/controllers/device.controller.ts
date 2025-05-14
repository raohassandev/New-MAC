import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ModbusRTU from 'modbus-serial';
import chalk from 'chalk';

import * as deviceService from '../services/device.service';
import { Device, createDeviceModel, IDevice, clientModels } from '../models/index.model';
import { getClientDbConnection } from '../models/index.model';

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

function compareStrings(a: string, b: string) {
  if (a === b) {
    console.log('✅ Strings are identical.');
    return;
  }

  console.log('❌ Strings differ. Detailed diff:');
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    const charA = a[i] ?? '␀';
    const charB = b[i] ?? '␀';
    const marker = charA === charB ? ' ' : '^';
    console.log(`Pos ${i}: '${charA}' vs '${charB}' ${marker}`);
  }
}

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
    console.log(chalk.bgYellow.white('[deviceController] Starting device connection test'));
    
    const deviceId = req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    try {
      // Add more detailed logging for debugging
      console.log(chalk.cyan(`[deviceController] Testing connection for device ID: ${deviceId}`));
      
      // Use the device service to test the connection
      // This will handle database connection, device finding, and testing Modbus connection
      const result = await deviceService.testConnection(deviceId, req);
      
      // Log the result
      if (result.success) {
        console.log(chalk.green(`[deviceController] Successfully connected to device ${deviceId}`));
      } else {
        console.log(chalk.yellow(`[deviceController] Connection failed for device ${deviceId}: ${result.message}`));
        
        // More detailed error logging for debugging
        if (result.errorType) {
          console.log(chalk.yellow(`[deviceController] Error type: ${result.errorType}`));
        }
        if (result.error) {
          console.log(chalk.yellow(`[deviceController] Error details: ${result.error}`));
        }
      }
      
      // Return the response in the same format as before
      return res.status(200).json(result);
    } catch (error: any) {
      // This shouldn't happen often since the service handles its own errors
      console.error(chalk.bgRed.white('[deviceController] Unhandled error in test connection:'), error);
      
      // Enhanced error logging for debugging
      if (error.stack) {
        console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
      }
      
      // Structure server errors consistently with other responses
      const serverErrorResponse = {
        success: false,
        message: 'Server error processing the connection test',
        error: error.message,
        errorType: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
        status: 'ERROR',
        deviceInfo: {
          id: deviceId,
        },
      };
      
      // Use 200 status with success: false for consistency with other error responses
      return res.status(200).json(serverErrorResponse);
    }
  } catch (error: any) {
    // This is a catch-all for errors that escape the inner try/catch
    console.error(chalk.bgRed.white('[deviceController] Critical error in test connection:'), error);
    
    // Enhanced error logging
    if (error.stack) {
      console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
    }
    
    const serverErrorResponse = {
      success: false,
      message: 'Server error processing the connection test',
      error: error.message,
      errorType: 'SERVER_ERROR',
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      deviceInfo: {
        id: req.params.id,
      },
    };
    
    return res.status(200).json(serverErrorResponse);
  }
};

// @desc    Read registers from a device
// @route   GET /api/devices/:id/read
// @access  Private

export const readDeviceRegisters = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgBlue.white('[deviceController] Starting device register read using service'));
    
    const deviceId = req.params.id;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    try {
      // Add more detailed logging for debugging
      console.log(chalk.cyan(`[deviceController] Reading registers for device ID: ${deviceId}`));
      
      // Use the device service to read registers
      // This will handle database connection, device finding, and reading registers
      const result = await deviceService.readDeviceRegisters(deviceId, req);
      
      if (result && result.readings && result.readings.length > 0) {
        // Log the successful read with register count
        console.log(chalk.green(`[deviceController] Successfully read ${result.readings.length} registers for device ${deviceId}`));
        
        // Optionally log the first few readings for debugging
        const sampleReadings = result.readings.slice(0, 3).map(r => 
          `${r.name}: ${r.value}${r.unit ? ' ' + r.unit : ''}`
        ).join(', ');
        
        console.log(chalk.cyan(`[deviceController] Sample readings: ${sampleReadings}${result.readings.length > 3 ? ', ...' : ''}`));
      } else {
        console.log(chalk.yellow(`[deviceController] No readings returned for device ${deviceId}`));
      }
      
      // Return the response in the same format as before
      return res.json({
        success: true,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        timestamp: result.timestamp,
        readings: result.readings
      });
    } catch (error: any) {
      // Handle specific errors
      if (error.message === 'Device not found') {
        console.log(chalk.yellow(`[deviceController] Device ${deviceId} not found`));
        return res.status(404).json({ message: 'Device not found' });
      } else if (error.message === 'Device is disabled') {
        console.log(chalk.yellow(`[deviceController] Device ${deviceId} is disabled`));
        return res.status(400).json({ message: 'Device is disabled' });
      } else if (error.message.includes('connection')) {
        console.log(chalk.yellow(`[deviceController] Connection error for device ${deviceId}: ${error.message}`));
        return res.status(400).json({ message: error.message });
      } else if (error.message.includes('No data points')) {
        console.log(chalk.yellow(`[deviceController] No data points configured for device ${deviceId}`));
        return res.status(400).json({ 
          message: 'No data points or registers configured for this device' 
        });
      } else {
        // Log the full error for debugging
        console.error(chalk.red(`[deviceController] Error reading device ${deviceId} registers:`), error);
        
        // Log the stack trace for more detailed debugging
        if (error.stack) {
          console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
        }
        
        return res.status(500).json({ 
          message: 'Failed to read device registers', 
          error: error.message 
        });
      }
    }
  } catch (error: any) {
    console.error(chalk.bgRed.white('[deviceController] Critical error in readDeviceRegisters:'), error);
    
    // Enhanced error logging
    if (error.stack) {
      console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
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

// @desc    Set a specific parameter value for a device
// @route   PUT /api/devices/:id/setpoint/:parameter
// @access  Private (Admin/Engineer/Operator)
export const setDeviceParameter = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[deviceController] Starting device parameter set operation'));
    
    const deviceId = req.params.id;
    const parameterName = req.params.parameter;
    
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    if (!parameterName) {
      return res.status(400).json({ message: 'Parameter name is required' });
    }
    
    // Check if deviceId is in the correct format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      console.error(`[deviceController] Invalid device ID format: ${deviceId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid device ID format'
      });
    }
    
    // Get parameter value from request body
    const { value, dataType, registerIndex, byteOrder } = req.body;
    
    if (value === undefined || value === null) {
      console.error('[deviceController] No value provided');
      return res.status(400).json({
        success: false,
        message: 'No value provided for parameter'
      });
    }
    
    if (!dataType) {
      console.error('[deviceController] No dataType specified for parameter');
      return res.status(400).json({
        success: false,
        message: 'No dataType specified for parameter'
      });
    }
    
    if (registerIndex === undefined) {
      console.error('[deviceController] No registerIndex specified for parameter');
      return res.status(400).json({
        success: false,
        message: 'No registerIndex specified for parameter'
      });
    }
    
    // Create a control parameter
    const parameter = {
      name: parameterName,
      value,
      registerIndex,
      dataType,
      byteOrder
    };
    
    console.log(chalk.cyan(`[deviceController] Setting parameter "${parameterName}" to ${value} for device ${deviceId}`));
    
    // Process user permissions (can be expanded based on your auth system)
    if (req.user) {
      // Add audit info
      console.log(chalk.blue(`[deviceController] Parameter set request by user: ${req.user.username || req.user.email || req.user.id}`));
    }
    
    try {
      // Call the service to perform the control operation
      // We reuse the existing controlDevice function but with a single parameter
      const result = await deviceService.controlDevice(deviceId, [parameter], req);
      
      // Get the specific result for our parameter
      const paramResult = result.results[0];
      
      if (paramResult.success) {
        console.log(chalk.green(`[deviceController] Successfully set parameter "${parameterName}" to ${value}`));
        
        return res.status(200).json({
          success: true,
          deviceId: result.deviceId,
          deviceName: result.deviceName,
          parameter: parameterName,
          value: value,
          message: paramResult.message || `Successfully set parameter "${parameterName}"`
        });
      } else {
        console.error(chalk.red(`[deviceController] Failed to set parameter "${parameterName}": ${paramResult.error}`));
        
        return res.status(400).json({
          success: false,
          deviceId: result.deviceId,
          deviceName: result.deviceName,
          parameter: parameterName,
          value: value,
          error: paramResult.error || 'Failed to set parameter',
          message: paramResult.message
        });
      }
    } catch (operationError: any) {
      // This handles any errors from the service layer
      console.error(chalk.red('[deviceController] Parameter set operation error:'), operationError);
      
      // Determine the appropriate status code
      let statusCode = 500;
      if (operationError.message.includes('not found')) {
        statusCode = 404;
      } else if (operationError.message.includes('disabled')) {
        statusCode = 400;
      }
      
      // Return structured error response
      return res.status(statusCode).json({
        success: false,
        message: operationError.message,
        error: operationError.message,
        errorType: 'PARAMETER_SET_ERROR',
        deviceId,
        parameter: parameterName
      });
    }
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[deviceController] Critical error in setDeviceParameter:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the parameter set request',
      error: error.message
    });
  }
};

// @desc    Control multiple devices with a single request
// @route   POST /api/devices/batch-control
// @access  Private (Admin/Engineer/Operator)
export const batchControlDevices = async (req: AuthRequest, res: Response) => {
  try {
    console.log(chalk.bgYellow.black('[deviceController] Starting batch device control operation'));
    
    // Get batch control commands from request body
    const { commands } = req.body;
    
    if (!commands || !Array.isArray(commands) || commands.length === 0) {
      console.error('[deviceController] No control commands provided');
      return res.status(400).json({
        success: false,
        message: 'No control commands provided'
      });
    }
    
    // Validate each command has a deviceId and parameters
    for (const command of commands) {
      if (!command.deviceId || !mongoose.Types.ObjectId.isValid(command.deviceId)) {
        console.error('[deviceController] Invalid device ID:', command.deviceId);
        return res.status(400).json({
          success: false,
          message: `Invalid device ID: ${command.deviceId}`
        });
      }
      
      if (!command.parameters || !Array.isArray(command.parameters) || command.parameters.length === 0) {
        console.error('[deviceController] No parameters provided for device:', command.deviceId);
        return res.status(400).json({
          success: false,
          message: `No parameters provided for device: ${command.deviceId}`
        });
      }
      
      // Validate each parameter
      for (const param of command.parameters) {
        if (!param.name || param.value === undefined || param.value === null || param.registerIndex === undefined) {
          console.error('[deviceController] Invalid parameter structure for device:', command.deviceId);
          return res.status(400).json({
            success: false,
            message: `Invalid parameter structure for device: ${command.deviceId}. Each parameter must have name, value, and registerIndex.`
          });
        }
        
        if (!param.dataType) {
          console.error(`[deviceController] No dataType specified for parameter ${param.name} of device ${command.deviceId}`);
          return res.status(400).json({
            success: false,
            message: `No dataType specified for parameter: ${param.name} of device ${command.deviceId}`
          });
        }
      }
    }
    
    // Log the control request
    console.log(chalk.cyan(`[deviceController] Batch control request for ${commands.length} devices`));
    
    // Process user permissions (can be expanded based on your auth system)
    if (req.user) {
      // Add audit info
      console.log(chalk.blue(`[deviceController] Batch control request by user: ${req.user.username || req.user.email || req.user.id}`));
    }
    
    // Process each command
    const results = [];
    
    for (const command of commands) {
      try {
        // Call the service to perform the control operation for each device
        const result = await deviceService.controlDevice(command.deviceId, command.parameters, req);
        
        // Add to results array
        results.push({
          deviceId: command.deviceId,
          deviceName: result.deviceName,
          success: result.success,
          results: result.results
        });
        
        console.log(chalk.green(`[deviceController] Successfully processed control command for device ${command.deviceId}`));
      } catch (deviceError: any) {
        console.error(chalk.red(`[deviceController] Error processing device ${command.deviceId}:`), deviceError);
        
        // Add error result
        results.push({
          deviceId: command.deviceId,
          deviceName: 'Unknown',
          success: false,
          error: deviceError.message,
          message: `Failed to process control command for device ${command.deviceId}: ${deviceError.message}`
        });
      }
    }
    
    // Calculate overall success
    const allSuccess = results.every(r => r.success);
    const anySuccess = results.some(r => r.success);
    
    // Create summary statistics
    const summary = {
      totalDevices: commands.length,
      successfulDevices: results.filter(r => r.success).length,
      failedDevices: results.filter(r => !r.success).length
    };
    
    // Return the results
    return res.status(200).json({
      success: anySuccess,
      allSuccess: allSuccess,
      summary,
      timestamp: new Date(),
      results
    });
  } catch (error: any) {
    // This is a catch-all for unexpected errors
    console.error(chalk.bgRed.white('[deviceController] Critical error in batch control:'), error);
    
    // Log the stack trace
    if (error.stack) {
      console.error(chalk.red(`[deviceController] Error stack: ${error.stack}`));
    }
    
    // Return a generic error response
    return res.status(500).json({
      success: false,
      message: 'Server error processing the batch control request',
      error: error.message
    });
  }
};
    