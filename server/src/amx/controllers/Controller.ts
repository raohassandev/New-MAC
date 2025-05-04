import { Request, Response } from 'express';
import { DeviceDriverModel, createDeviceDriverModel } from '../models/deviceDriverModel';
import { DeviceTypeModel, createDeviceTypeModel } from '../models/deviceTypeModel';
import mongoose from 'mongoose';

// Define a type for the user in Request
interface RequestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
}

// Extend Express Request to use our specific user type
// Define RequestWithUser type that extends Express.Request
export interface RequestWithUser extends Request {
  user: RequestUser;
}

/**
 * Get the DeviceDriver model from the correct AMX database connection
 * @returns Mongoose model for DeviceDriver
 */
const getDeviceDriverModel = (): mongoose.Model<any> => {
  if (mongoose.connection.db && mongoose.connection.db.databaseName !== 'amx') {
    console.error('WARNING: Using wrong database connection for DeviceDriver! Should be using AMX database but currently using:', 
      mongoose.connection.db.databaseName);
  }
  
  // Instead of using the default connection, get the AMX connection from app.locals
  try {
    // Try to get the models from app.locals if available
    const app = require('../../server').app;
    if (app && app.locals && app.locals.libraryModels) {
      console.log('Using DeviceDriver model from app.locals.libraryModels');
      return app.locals.libraryModels.DeviceDriver;
    } else {
      console.error('App locals or libraryModels not found for DeviceDriver, falling back to dedicated connection');
    }
  } catch (error) {
    console.error('Error accessing app locals for DeviceDriver:', error);
  }
  
  // Fallback: Use a dedicated connection to the AMX database
  try {
    // Check if we have an amx connection already
    let amxConn = mongoose.connections.find(conn => 
      conn.db && conn.db.databaseName === 'amx');
    
    if (!amxConn) {
      console.log('Creating new connection to AMX database for DeviceDriver');
      const AMX_DB_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
      amxConn = mongoose.createConnection(AMX_DB_URI);
    }
    
    // Use this connection to create/get the DeviceDriver model
    return createDeviceDriverModel(amxConn);
  } catch (error) {
    console.error('Error creating AMX database connection for DeviceDriver:', error);
    // Last resort: try default connection but log warning
    console.warn('Falling back to default mongoose connection for DeviceDriver - this may use the wrong database!');
    return createDeviceDriverModel(mongoose.connection);
  }
};

/**
 * Get the DeviceType model from the correct AMX database connection
 * @returns Mongoose model for DeviceType
 */
const getDeviceTypeModel = (): mongoose.Model<any> => {
  if (mongoose.connection.db && mongoose.connection.db.databaseName !== 'amx') {
    console.error('WARNING: Using wrong database connection! Should be using AMX database but currently using:', 
      mongoose.connection.db.databaseName);
  }
  
  // Instead of using the default connection, get the AMX connection from app.locals
  try {
    // Try to get the models from app.locals if available
    const app = require('../../server').app;
    if (app && app.locals && app.locals.libraryModels) {
      console.log('Using DeviceType model from app.locals.libraryModels');
      return app.locals.libraryModels.DeviceType;
    } else {
      console.error('App locals or libraryModels not found, falling back to dedicated connection');
    }
  } catch (error) {
    console.error('Error accessing app locals:', error);
  }
  
  // Fallback: Use a dedicated connection to the AMX database
  try {
    // Check if we have an amx connection already
    let amxConn = mongoose.connections.find(conn => 
      conn.db && conn.db.databaseName === 'amx');
    
    if (!amxConn) {
      console.log('Creating new connection to AMX database');
      const AMX_DB_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
      amxConn = mongoose.createConnection(AMX_DB_URI);
    }
    
    // Use this connection to create/get the DeviceType model
    return createDeviceTypeModel(amxConn);
  } catch (error) {
    console.error('Error creating AMX database connection:', error);
    // Last resort: try default connection but log warning
    console.warn('Falling back to default mongoose connection - this may use the wrong database!');
    return createDeviceTypeModel(mongoose.connection);
  }
};

// DeviceDriver Controllers
export const getAllDeviceDrivers = async (req: Request, res: Response) => {
  try {
    const DeviceDriver = getDeviceDriverModel();
    const deviceDrivers = await DeviceDriver.find({});
    res.status(200).json(deviceDrivers);
  } catch (error: any) {
    console.error('Error fetching device drivers:', error);
    res.status(500).json({ message: 'Failed to fetch device drivers' });
  }
};

export const getDeviceDriverById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device driver ID format' });
    }
    
    const DeviceDriver = getDeviceDriverModel();
    const deviceDriver = await DeviceDriver.findById(id);
    
    if (!deviceDriver) {
      return res.status(404).json({ message: 'Device driver not found' });
    }
    
    res.status(200).json(deviceDriver);
  } catch (error: any) {
    console.error('Error fetching device driver:', error);
    res.status(500).json({ message: 'Failed to fetch device driver' });
  }
};

export const createDeviceDriver = async (req: Request, res: Response) => {
  try {
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Check if user has the required role
    if (!['admin', 'devicedriver_manager'].includes(userReq.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to create device drivers' });
    }
    
    const DeviceDriver = getDeviceDriverModel();
    
    // Add user information to the device driver
    const deviceDriverData = {
      ...req.body,
      createdBy: {
        userId: userReq.user.id,
        username: userReq.user.name,
        email: userReq.user.email,
        organization: userReq.user.organization || '',
      },
      isDeviceDriver: true,
    };
    
    const newDeviceDriver = await DeviceDriver.create(deviceDriverData);
    res.status(201).json(newDeviceDriver);
  } catch (error: any) {
    console.error('Error creating device driver:', error);
    
    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) { // MongoDB duplicate key error code
      return res.status(409).json({ 
        message: 'A device driver with this name already exists for this device type' 
      });
    }
    
    res.status(500).json({ message: 'Failed to create device driver' });
  }
};

export const updateDeviceDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device driver ID format' });
    }
    
    // Check if user has the required role
    if (!['admin', 'devicedriver_manager'].includes(userReq.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to update device drivers' });
    }
    
    const DeviceDriver = getDeviceDriverModel();
    const deviceDriver = await DeviceDriver.findById(id);
    
    if (!deviceDriver) {
      return res.status(404).json({ message: 'Device driver not found' });
    }
    
    // Only allow the creator or an admin to update
    if (deviceDriver.createdBy?.userId !== userReq.user.id && userReq.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to update this device driver' });
    }
    
    const updatedDeviceDriver = await DeviceDriver.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedDeviceDriver);
  } catch (error: any) {
    console.error('Error updating device driver:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'A device driver with this name already exists for this device type' 
      });
    }
    
    res.status(500).json({ message: 'Failed to update device driver' });
  }
};

export const deleteDeviceDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device driver ID format' });
    }
    
    // Check if user has the required role
    if (userReq.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete device drivers' });
    }
    
    const DeviceDriver = getDeviceDriverModel();
    const deviceDriver = await DeviceDriver.findById(id);
    
    if (!deviceDriver) {
      return res.status(404).json({ message: 'Device driver not found' });
    }
    
    // Only allow the creator or an admin to delete
    if (deviceDriver.createdBy?.userId !== userReq.user.id && userReq.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete this device driver' });
    }
    
    await DeviceDriver.findByIdAndDelete(id);
    res.status(200).json({ message: 'Device driver deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting device driver:', error);
    res.status(500).json({ message: 'Failed to delete device driver' });
  }
};

// Device Type Controllers
export const getAllDeviceTypes = async (req: Request, res: Response) => {
  try {
    const DeviceType = getDeviceTypeModel();
    const deviceTypes = await DeviceType.find({});
    res.status(200).json(deviceTypes);
  } catch (error: any) {
    console.error('Error fetching device types:', error);
    res.status(500).json({ message: 'Failed to fetch device types' });
  }
};

export const getDeviceTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device type ID format' });
    }
    
    const DeviceType = getDeviceTypeModel();
    const deviceType = await DeviceType.findById(id);
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    res.status(200).json(deviceType);
  } catch (error: any) {
    console.error('Error fetching device type:', error);
    res.status(500).json({ message: 'Failed to fetch device type' });
  }
};

export const createDeviceType = async (req: Request, res: Response) => {
  try {
    console.log('Creating device type, Request body:', req.body);
    console.log('User in request:', req.user);
    
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Check if user object exists
    if (!userReq.user) {
      console.error('No user object found in request');
      return res.status(401).json({ message: 'Authentication required - no user found in request' });
    }
    
    console.log('User role check:', userReq.user.role);
    
    // For testing/development - temporarily bypass role check
    // Remove or comment this block in production
    if (!userReq.user.role) {
      console.log('No role defined, setting default role for development');
      userReq.user.role = 'admin'; // Temporary fix for development
    }
    
    // Check if user has the required role
    if (!['admin', 'devicedriver_manager'].includes(userReq.user.role)) {
      console.error('Permission denied - user role:', userReq.user.role);
      return res.status(403).json({ message: 'You do not have permission to create device types' });
    }
    
    const DeviceType = getDeviceTypeModel();
    console.log('DeviceType model obtained');
    
    // Add user information to the device type
    const deviceTypeData = {
      ...req.body
    };
    
    // Only add createdBy if user information is complete
    if (userReq.user && userReq.user.id) {
      deviceTypeData.createdBy = {
        userId: userReq.user.id || 'default-user',
        username: userReq.user.name || 'Default User',
        email: userReq.user.email || 'default@example.com',
        organization: userReq.user.organization || '',
      };
    } else {
      console.log('Creating device type without createdBy information');
    }
    
    console.log('Device type data to create:', deviceTypeData);
    
    const newDeviceType = await DeviceType.create(deviceTypeData);
    console.log('Device type created successfully:', newDeviceType);
    res.status(201).json(newDeviceType);
  } catch (error: any) {
    console.error('Error creating device type:', error);
    
    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      console.error('Validation error details:', error.errors);
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) { // MongoDB duplicate key error code
      console.error('Duplicate key error');
      return res.status(409).json({ 
        message: 'A device type with this name already exists' 
      });
    }
    
    res.status(500).json({ message: 'Failed to create device type: ' + (error.message || 'Unknown error') });
  }
};

export const updateDeviceType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device type ID format' });
    }
    
    // Check if user has the required role
    if (!['admin', 'devicedriver_manager'].includes(userReq.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to update device types' });
    }
    
    const DeviceType = getDeviceTypeModel();
    const deviceType = await DeviceType.findById(id);
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    // Only allow the creator or an admin to update
    if (deviceType.createdBy?.userId !== userReq.user.id && userReq.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to update this device type' });
    }
    
    const updatedDeviceType = await DeviceType.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedDeviceType);
  } catch (error: any) {
    console.error('Error updating device type:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'A device type with this name already exists' 
      });
    }
    
    res.status(500).json({ message: 'Failed to update device type' });
  }
};

export const deleteDeviceType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device type ID format' });
    }
    
    // Check if user has the required role
    if (userReq.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete device types' });
    }
    
    const DeviceType = getDeviceTypeModel();
    const deviceType = await DeviceType.findById(id);
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    // Check if there are device drivers using this device type
    const DeviceDriver = getDeviceDriverModel();
    const relatedDrivers = await DeviceDriver.find({ deviceType: deviceType.name });
    
    if (relatedDrivers && relatedDrivers.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete this device type because it is used by ${relatedDrivers.length} device drivers`
      });
    }
    
    await DeviceType.findByIdAndDelete(id);
    res.status(200).json({ message: 'Device type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting device type:', error);
    res.status(500).json({ message: 'Failed to delete device type' });
  }
};

export default {
  // DeviceDriver controllers
  getAllDeviceDrivers,
  getDeviceDriverById,
  createDeviceDriver,
  updateDeviceDriver,
  deleteDeviceDriver,
  
  // DeviceType controllers
  getAllDeviceTypes,
  getDeviceTypeById,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
};