import { Request, Response } from 'express';
import { getDeviceDriverModel, getDeviceTypeModel } from '../models';
import mongoose from 'mongoose';

// DeviceDriver Controllers
export const getAllDeviceDrivers = async (req: Request, res: Response) => {
  try {
    const DeviceDriver = getDeviceDriverModel();
    const templates = await DeviceDriver.find({});
    res.status(200).json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

export const getDeviceDriverById = async (req: Request, res: Response) => {
  try {
    const DeviceDriver = getDeviceDriverModel();
    const template = await DeviceDriver.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'DeviceDriver not found' });
    }
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
};

export const getDeviceDriversByDeviceType = async (req: Request, res: Response) => {
  try {
    const { deviceType } = req.params;
    const DeviceDriver = getDeviceDriverModel();
    const templates = await DeviceDriver.find({ deviceType });
    res.status(200).json(templates);
  } catch (error: any) {
    console.error('Error fetching templates by device type:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

export const createDeviceDriver = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (!['admin', 'template_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to create templates' });
    }
    
    const DeviceDriver = getDeviceDriverModel();
    
    // Add user information to the template
    const templateData = {
      ...req.body,
      createdBy: {
        userId: req.user.id,
        username: req.user.name,
        email: req.user.email,
        organization: req.user.organization || '',
      },
      isDeviceDriver: true,
    };
    
    const newDeviceDriver = await DeviceDriver.create(templateData);
    res.status(201).json(newDeviceDriver);
  } catch (error: any) {
    console.error('Error creating template:', error);
    
    // Handle duplicate key error (template with same name and device type)
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    if (error.code === 11000) { // MongoDB duplicate key error code
      return res.status(409).json({ 
        message: 'A template with this name already exists for this device type' 
      });
    }
    
    res.status(500).json({ message: 'Failed to create template' });
  }
};

export const updateDeviceDriver = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (!['admin', 'template_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to update templates' });
    }
    
    const DeviceDriver = getDeviceDriverModel();
    const template = await DeviceDriver.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'DeviceDriver not found' });
    }
    
    // Only allow the creator or an admin to update
    if (template.createdBy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to update this template' });
    }
    
    const updatedDeviceDriver = await DeviceDriver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedDeviceDriver);
  } catch (error: any) {
    console.error('Error updating template:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'A template with this name already exists for this device type' 
      });
    }
    
    res.status(500).json({ message: 'Failed to update template' });
  }
};

export const deleteDeviceDriver = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete templates' });
    }
    
    const DeviceDriver = getDeviceDriverModel();
    const template = await DeviceDriver.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'DeviceDriver not found' });
    }
    
    // Only allow the creator or an admin to delete
    if (template.createdBy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete this template' });
    }
    
    await DeviceDriver.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'DeviceDriver deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Failed to delete template' });
  }
};


export default {
  // DeviceDriver controllers
  getAllDeviceDrivers,
  getDeviceDriverById,
  getDeviceDriversByDeviceType,
  createDeviceDriver,
  updateDeviceDriver,
  deleteDeviceDriver,
};