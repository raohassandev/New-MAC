import { Request, Response } from 'express';
import { DeviceType, IDeviceType } from '../models';

// Get all device types
export const getDeviceTypes = async (req: Request, res: Response) => {
  try {
    const deviceTypes = await DeviceType.find();
    res.status(200).json(deviceTypes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching device types', error });
  }
};

// Get device type by ID
export const getDeviceTypeById = async (req: Request, res: Response) => {
  try {
    const deviceType = await DeviceType.findById(req.params.id);
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    res.status(200).json(deviceType);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching device type', error });
  }
};

// Create new device type
export const createDeviceType = async (req: Request, res: Response) => {
  try {
    // Check if device type already exists
    const existingDeviceType = await DeviceType.findOne({ name: req.body.name });
    
    if (existingDeviceType) {
      return res.status(400).json({ message: 'Device type already exists' });
    }
    
    const deviceType = new DeviceType(req.body);
    await deviceType.save();
    res.status(201).json(deviceType);
  } catch (error) {
    res.status(500).json({ message: 'Error creating device type', error });
  }
};

// Update device type
export const updateDeviceType = async (req: Request, res: Response) => {
  try {
    const deviceType = await DeviceType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    res.status(200).json(deviceType);
  } catch (error) {
    res.status(500).json({ message: 'Error updating device type', error });
  }
};

// Delete device type
export const deleteDeviceType = async (req: Request, res: Response) => {
  try {
    const deviceType = await DeviceType.findByIdAndDelete(req.params.id);
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    res.status(200).json({ message: 'Device type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting device type', error });
  }
};