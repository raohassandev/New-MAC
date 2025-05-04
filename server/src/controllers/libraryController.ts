import { Request, Response } from 'express';
import { getTemplateModel, getDeviceTypeModel } from '../models/library';
import mongoose from 'mongoose';

// Template Controllers
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const Template = getTemplateModel();
    const templates = await Template.find({});
    res.status(200).json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const Template = getTemplateModel();
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
};

export const getTemplatesByDeviceType = async (req: Request, res: Response) => {
  try {
    const { deviceType } = req.params;
    const Template = getTemplateModel();
    const templates = await Template.find({ deviceType });
    res.status(200).json(templates);
  } catch (error: any) {
    console.error('Error fetching templates by device type:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (!['admin', 'template_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to create templates' });
    }
    
    const Template = getTemplateModel();
    
    // Add user information to the template
    const templateData = {
      ...req.body,
      createdBy: {
        userId: req.user.id,
        username: req.user.name,
        email: req.user.email,
        organization: req.user.organization || '',
      },
      isTemplate: true,
    };
    
    const newTemplate = await Template.create(templateData);
    res.status(201).json(newTemplate);
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

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (!['admin', 'template_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to update templates' });
    }
    
    const Template = getTemplateModel();
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Only allow the creator or an admin to update
    if (template.createdBy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to update this template' });
    }
    
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedTemplate);
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

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete templates' });
    }
    
    const Template = getTemplateModel();
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Only allow the creator or an admin to delete
    if (template.createdBy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to delete this template' });
    }
    
    await Template.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Failed to delete template' });
  }
};

// Device Type Controllers
export const getAllDeviceTypes = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all device types');
    const DeviceType = getDeviceTypeModel();
    
    // Get all device types
    const deviceTypes = await DeviceType.find({}).sort({ name: 1 });
    console.log(`Found ${deviceTypes.length} device types`);
    
    // Add some defaults if none exist yet
    if (deviceTypes.length === 0) {
      console.log('No device types found, creating defaults');
      const defaultTypes = [
        { 
          name: 'Energy Analyzer',
          description: 'Devices that monitor electrical parameters',
          category: 'Power Monitoring',
          createdBy: {
            userId: 'system',
            username: 'System',
            email: 'system@example.com',
            organization: 'Default',
          }
        },
        { 
          name: 'Temperature Sensor',
          description: 'Devices that measure temperature',
          category: 'Sensors',
          createdBy: {
            userId: 'system',
            username: 'System',
            email: 'system@example.com',
            organization: 'Default',
          }
        },
        { 
          name: 'PLC',
          description: 'Programmable Logic Controllers',
          category: 'Control Systems',
          createdBy: {
            userId: 'system',
            username: 'System',
            email: 'system@example.com',
            organization: 'Default',
          }
        }
      ];
      
      try {
        await Promise.all(defaultTypes.map(type => DeviceType.create(type)));
        const newTypes = await DeviceType.find({}).sort({ name: 1 });
        console.log(`Created ${newTypes.length} default device types`);
        res.status(200).json(newTypes);
      } catch (err) {
        console.warn('Error creating default device types:', err);
        // Still return the empty array if we couldn't create defaults
        res.status(200).json([]);
      }
    } else {
      res.status(200).json(deviceTypes);
    }
  } catch (error: any) {
    console.error('Error fetching device types:', error);
    res.status(500).json({ message: 'Failed to fetch device types', error: error.message });
  }
};

export const getDeviceTypeById = async (req: Request, res: Response) => {
  try {
    const DeviceType = getDeviceTypeModel();
    const deviceType = await DeviceType.findById(req.params.id);
    
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
    console.log('Creating device type with data:', req.body);
    
    // Check if user exists in the request
    const user = req.user || {
      id: 'demo_user',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'admin',
      organization: 'Demo Org'
    };
    
    // For development purposes, allow device type creation without strict auth
    // In production, uncomment this check
    /*
    if (!['admin', 'engineer'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to create device types' 
      });
    }
    */
    
    const DeviceType = getDeviceTypeModel();
    
    // Add user information to the device type
    const deviceTypeData = {
      ...req.body,
      createdBy: {
        userId: user.id || 'unknown',
        username: user.name || 'Unknown User',
        email: user.email || 'unknown@example.com',
        organization: user.organization || '',
      },
    };
    
    console.log('Creating device type with processed data:', deviceTypeData);
    
    const newDeviceType = await DeviceType.create(deviceTypeData);
    console.log('Created device type:', newDeviceType);
    
    res.status(201).json(newDeviceType);
  } catch (error: any) {
    console.error('Error creating device type:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A device type with this name already exists' });
    }
    
    res.status(500).json({ message: 'Failed to create device type', error: error.message });
  }
};

export const updateDeviceType = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (!['admin', 'engineer'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to update device types' 
      });
    }
    
    const DeviceType = getDeviceTypeModel();
    const deviceType = await DeviceType.findById(req.params.id);
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    // Only allow the creator or an admin to update
    if (deviceType.createdBy.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'You do not have permission to update this device type' 
      });
    }
    
    const updatedDeviceType = await DeviceType.findByIdAndUpdate(
      req.params.id,
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
      return res.status(409).json({ message: 'A device type with this name already exists' });
    }
    
    res.status(500).json({ message: 'Failed to update device type' });
  }
};

export const deleteDeviceType = async (req: Request, res: Response) => {
  try {
    // Check if user has the required role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'You do not have permission to delete device types' 
      });
    }
    
    const DeviceType = getDeviceTypeModel();
    const Template = getTemplateModel();
    
    const deviceType = await DeviceType.findById(req.params.id);
    
    if (!deviceType) {
      return res.status(404).json({ message: 'Device type not found' });
    }
    
    // Check if there are any templates using this device type
    const templatesCount = await Template.countDocuments({ deviceType: deviceType.name });
    
    if (templatesCount > 0) {
      return res.status(409).json({ 
        message: `Cannot delete device type. It is used by ${templatesCount} templates.` 
      });
    }
    
    await DeviceType.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Device type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting device type:', error);
    res.status(500).json({ message: 'Failed to delete device type' });
  }
};

export default {
  // Template controllers
  getAllTemplates,
  getTemplateById,
  getTemplatesByDeviceType,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  
  // Device type controllers
  getAllDeviceTypes,
  getDeviceTypeById,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType
};