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

// Removed getAmxDatabase function - now using app.locals.libraryDB instead

/**
 * Get all device drivers directly from the AMX database
 */
export const getAllDeviceDrivers = async (req: Request, res: Response) => {
  try {
    // Use the existing AMX database connection from app.locals
    const db = req.app.locals.libraryDB;
    
    if (!db) {
      console.error('AMX database not available in app.locals');
      return res.status(500).json({ message: 'Database connection not available' });
    }

    // Get device drivers directly from the templates collection
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

    // Use the existing AMX database connection from app.locals
    const db = req.app.locals.libraryDB;
    
    if (!db) {
      console.error('AMX database not available in app.locals');
      return res.status(500).json({ message: 'Database connection not available' });
    }

    // Get device driver directly from the collection
    const deviceDriver = await db
      .collection('templates')
      .findOne({ _id: new mongoose.Types.ObjectId(id) });

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

    // Use the existing AMX database connection from app.locals
    const db = req.app.locals.libraryDB;
    
    if (!db) {
      console.error('AMX database not available in app.locals');
      return res.status(500).json({ message: 'Database connection not available' });
    }

    // Check if there's a device driver with this name already
    const existingDeviceDriver = await db.collection('templates').findOne({
      name: req.body.name,
      deviceType: req.body.deviceType,
    });

    if (existingDeviceDriver) {
      return res.status(409).json({
        message: 'A device driver with this name already exists for this device type',
      });
    }

    // Prepare device driver data
    const deviceDriverData = {
      ...req.body,
      isDeviceDriver: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Remove connectionSetting if present
    delete deviceDriverData.connectionSetting;

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
        message: 'A device driver with this name already exists for this device type',
      });
    }

    res
      .status(500)
      .json({ message: 'Failed to create device driver: ' + (error.message || 'Unknown error') });
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

    // Use the existing AMX database connection from app.locals
    const db = req.app.locals.libraryDB;
    
    if (!db) {
      console.error('AMX database not available in app.locals');
      return res.status(500).json({ message: 'Database connection not available' });
    }

    // Remove connectionSetting from update data
    const updateData = { ...req.body };
    delete updateData.connectionSetting;
    
    // Update device driver directly in collection
    const result = await db.collection('templates').updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Device driver not found' });
    }

    // Get the updated device driver from the templates collection
    const updatedDeviceDriver = await db
      .collection('templates')
      .findOne({ _id: new mongoose.Types.ObjectId(id) });

    res.status(200).json(updatedDeviceDriver);
  } catch (error: any) {
    console.error('Error updating device driver:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A device driver with this name already exists for this device type',
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

    // Use the existing AMX database connection from app.locals
    const db = req.app.locals.libraryDB;
    
    if (!db) {
      console.error('AMX database not available in app.locals');
      return res.status(500).json({ message: 'Database connection not available' });
    }

    // Delete device driver directly from collection
    const result = await db
      .collection('templates')
      .deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Device driver not found' });
    }

    res.status(200).json({ message: 'Device driver deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting device driver:', error);
    res.status(500).json({ message: 'Failed to delete device driver' });
  }
};
