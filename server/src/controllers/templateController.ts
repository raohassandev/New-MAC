import { Request, Response } from 'express';
import Template, { ITemplate } from '../models/Template';
import DeviceType from '../models/DeviceType';

// Get all templates
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await Template.find();
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error });
  }
};

// Get template by ID
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching template', error });
  }
};

// Create new template
export const createTemplate = async (req: Request, res: Response) => {
  try {
    // Check if device type exists
    const deviceType = await DeviceType.findOne({ name: req.body.deviceType });
    
    // If it doesn't exist and it's not "new", return error
    if (!deviceType && req.body.deviceType !== 'new') {
      return res.status(400).json({ message: 'Invalid device type' });
    }
    
    // If device type is "new", create a new device type
    if (req.body.deviceType === 'new' && req.body.newDeviceType) {
      const newDeviceType = new DeviceType({
        name: req.body.newDeviceType.name,
        description: req.body.newDeviceType.description,
        category: req.body.newDeviceType.category,
        specifications: req.body.newDeviceType.specifications,
        createdBy: req.body.createdBy
      });
      
      await newDeviceType.save();
      
      // Update the device type in the request body
      req.body.deviceType = newDeviceType.name;
    }
    
    // Check if template already exists for this device type
    const existingTemplate = await Template.findOne({
      name: req.body.name,
      deviceType: req.body.deviceType
    });
    
    if (existingTemplate) {
      return res.status(400).json({ 
        message: `A template with name "${req.body.name}" already exists for device type "${req.body.deviceType}"` 
      });
    }
    
    const template = new Template(req.body);
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error creating template', error });
  }
};

// Update template
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error updating template', error });
  }
};

// Delete template
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting template', error });
  }
};

// Get templates by device type
export const getTemplatesByDeviceType = async (req: Request, res: Response) => {
  try {
    const templates = await Template.find({ deviceType: req.params.deviceType });
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error });
  }
};