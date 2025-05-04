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
 * This ensures we're always using the correct database connection
 */
const getAmxDatabase = async () => {
  try {
    // Get the connection URI from environment variables
    const LIBRARY_DB_URI = process.env.LIBRARY_DB_URI || 'mongodb://localhost:27017/amx';
    
    // Create a direct connection to the AMX database
    console.log(`Connecting directly to AMX database: ${LIBRARY_DB_URI}`);
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
 * Get all device types directly from the AMX database
 */
export const getAllDeviceTypes = async (req: Request, res: Response) => {
  try {
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Get device types directly from the collection
    const deviceTypes = await db.collection('devicetypes').find({}).toArray();
    
    console.log(`Retrieved ${deviceTypes.length} device types from AMX database`);
    res.status(200).json(deviceTypes);
  } catch (error: any) {
    console.error('Error fetching device types:', error);
    res.status(500).json({ message: 'Failed to fetch device types' });
  }
};

/**
 * Get device type by ID directly from the AMX database
 */
export const getDeviceTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device type ID format' });
    }
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Get device type directly from the collection
    const deviceType = await db.collection('devicetypes').findOne({ _id: new mongoose.Types.ObjectId(id) });
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    res.status(200).json(deviceType);
  } catch (error: any) {
    console.error('Error fetching device type:', error);
    res.status(500).json({ message: 'Failed to fetch device type' });
  }
};

/**
 * Create device type directly in the AMX database
 */
export const createDeviceType = async (req: Request, res: Response) => {
  try {
    // Cast req to RequestWithUser to access user property
    const userReq = req as RequestWithUser;
    
    // Log request
    console.log('Creating device type directly in AMX database with data:', req.body);
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Check if there's a device type with this name already
    const existingDeviceType = await db.collection('devicetypes').findOne({ name: req.body.name });
    if (existingDeviceType) {
      return res.status(409).json({ message: 'A device type with this name already exists' });
    }
    
    // Prepare device type data
    const deviceTypeData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Add user info if available
    if (userReq.user) {
      deviceTypeData.createdBy = {
        userId: userReq.user.id || userReq.user._id || 'unknown',
        username: userReq.user.name || 'Unknown User',
        email: userReq.user.email || 'unknown@example.com',
        organization: userReq.user.organization || '',
      };
    }
    
    // Insert device type directly into collection
    const result = await db.collection('devicetypes').insertOne(deviceTypeData);
    
    // Get the inserted device type
    const newDeviceType = await db.collection('devicetypes').findOne({ _id: result.insertedId });
    
    console.log('Successfully created device type in AMX database:', newDeviceType);
    res.status(201).json(newDeviceType);
  } catch (error: any) {
    console.error('Error creating device type:', error);
    
    // Handle validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A device type with this name already exists' });
    }
    
    res.status(500).json({ message: 'Failed to create device type: ' + (error.message || 'Unknown error') });
  }
};

/**
 * Update device type directly in the AMX database
 */
export const updateDeviceType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device type ID format' });
    }
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Update device type directly in collection
    const result = await db.collection('devicetypes').updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { 
        $set: { 
          ...req.body,
          updatedAt: new Date() 
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    // Get the updated device type
    const updatedDeviceType = await db.collection('devicetypes').findOne({ _id: new mongoose.Types.ObjectId(id) });
    
    res.status(200).json(updatedDeviceType);
  } catch (error: any) {
    console.error('Error updating device type:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A device type with this name already exists' });
    }
    
    res.status(500).json({ message: 'Failed to update device type' });
  }
};

/**
 * Delete device type directly from the AMX database
 */
export const deleteDeviceType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid device type ID format' });
    }
    
    // Get AMX database connection
    const db = await getAmxDatabase();
    
    // Check if there are any device drivers using this device type
    const deviceDriversUsingType = await db.collection('templates').countDocuments({ deviceType: id });
    
    if (deviceDriversUsingType > 0) {
      return res.status(400).json({ 
        message: `Cannot delete this device type because it is used by ${deviceDriversUsingType} device drivers`
      });
    }
    
    // Delete device type directly from collection
    const result = await db.collection('devicetypes').deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    res.status(200).json({ message: 'Device type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting device type:', error);
    res.status(500).json({ message: 'Failed to delete device type' });
  }
};