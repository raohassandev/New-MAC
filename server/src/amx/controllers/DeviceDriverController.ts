import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Define a type for the user in Request
interface RequestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  _id?: string; // Include _id as optional for compatibility
  organization?: string;
}

// Extend Express Request to use our specific user type
export interface RequestWithUser extends Request {
  user: RequestUser;
}

/**
 * Direct database access function for the AMX database
 */
const getAmxDatabase = async () => {
  try {
    // Get the connection URI from environment variables
    const LIBRARY_DB_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    
    // Create a direct connection to the AMX database
    console.log(`Connecting directly to AMX database for device drivers: ${LIBRARY_DB_URI}`);
    const client = await mongoose.connect(LIBRARY_DB_URI);
    
    console.log(`Connected to database: ${client.connection.db.databaseName}`);
    if (client.connection.db.databaseName !== 'amx') {
      console.error(`WARNING: Connected to wrong database: ${client.connection.db.databaseName}, expected 'amx'`);
    }
    
    return client.connection.db;
  } catch (error) {
    console.error('Error connecting to AMX database:', error);
    throw error;
  }
};

/**
 * Get all device drivers directly from the AMX database
 */
export const getAllDeviceDrivers = async (req: Request, res: Response) => {
  try {
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Get device drivers directly from the collection
    const deviceDrivers = await db.collection('templates').find({}).toArray();
    
    console.log(`Retrieved ${deviceDrivers.length} device drivers from AMX database`);
    res.status(200).json(deviceDrivers);
  } catch (error: any) {
    console.error('Error fetching device drivers:', error);
    res.status(500).json({ message: 'Failed to fetch device drivers' });
  }
};

/**
 * Get device driver by ID directly from the AMX database
 */
export const getDeviceDriverById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device driver ID format' });
    }
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Get device driver directly from the collection
    const deviceDriver = await db.collection('templates').findOne({ _id: new mongoose.Types.ObjectId(id) });
    
    if (!deviceDriver) {
      return res.status(404).json({ message: 'Device driver not found' });
    }
    
    res.status(200).json(deviceDriver);
  } catch (error: any) {
    console.error('Error fetching device driver:', error);
    res.status(500).json({ message: 'Failed to fetch device driver' });
  }
};

/**
 * Create device driver directly in the AMX database
 */
export const createDeviceDriver = async (req: Request, res: Response) => {
  try {
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Log request
    console.log('Creating device driver directly in AMX database with data:', req.body);
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Check if there's a device driver with this name already
    const existingDeviceDriver = await db.collection('templates').findOne({ 
      name: req.body.name,
      deviceType: req.body.deviceType
    });
    
    if (existingDeviceDriver) {
      return res.status(409).json({ 
        message: 'A device driver with this name already exists for this device type' 
      });
    }
    
    // Prepare device driver data
    const deviceDriverData = {
      ...req.body,
      isDeviceDriver: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add user info if available
    if (userReq.user) {
      deviceDriverData.createdBy = {
        userId: userReq.user.id || userReq.user._id || 'unknown',
        username: userReq.user.name || 'Unknown User',
        email: userReq.user.email || 'unknown@example.com',
        organization: userReq.user.organization || '',
      };
    }
    
    // Insert device driver directly into collection
    const result = await db.collection('templates').insertOne(deviceDriverData);
    
    // Get the inserted device driver
    const newDeviceDriver = await db.collection('templates').findOne({ _id: result.insertedId });
    
    console.log('Successfully created device driver in AMX database:', newDeviceDriver);
    res.status(201).json(newDeviceDriver);
  } catch (error: any) {
    console.error('Error creating device driver:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'A device driver with this name already exists for this device type' 
      });
    }
    
    res.status(500).json({ message: 'Failed to create device driver: ' + (error.message || 'Unknown error') });
  }
};

/**
 * Update device driver directly in the AMX database
 */
export const updateDeviceDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device driver ID format' });
    }
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Update device driver directly in collection
    const result = await db.collection('templates').updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { 
        $set: { 
          ...req.body,
          updatedAt: new Date() 
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Device driver not found' });
    }
    
    // Get the updated device driver
    const updatedDeviceDriver = await db.collection('templates').findOne({ _id: new mongoose.Types.ObjectId(id) });
    
    res.status(200).json(updatedDeviceDriver);
  } catch (error: any) {
    console.error('Error updating device driver:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'A device driver with this name already exists for this device type' 
      });
    }
    
    res.status(500).json({ message: 'Failed to update device driver' });
  }
};

/**
 * Delete device driver directly from the AMX database
 */
export const deleteDeviceDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device driver ID format' });
    }
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Delete device driver directly from collection
    const result = await db.collection('templates').deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Device driver not found' });
    }
    
    res.status(200).json({ message: 'Device driver deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting device driver:', error);
    res.status(500).json({ message: 'Failed to delete device driver' });
  }
};