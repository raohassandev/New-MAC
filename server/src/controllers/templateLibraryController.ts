import { Request, Response } from 'express';
import { getTemplateModel, getDeviceTypeModel } from '../models/library';

// Get all templates
export const getTemplates = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all templates from library database');
    const Template = getTemplateModel();
    const templates = await Template.find();
    console.log(`Found ${templates.length} templates`);
    res.status(200).json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

// Get template by ID
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    console.log(`Fetching template with ID ${req.params.id} from library database`);
    const Template = getTemplateModel();
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Error fetching template', error: error.message });
  }
};

// Create new template
export const createTemplate = async (req: Request, res: Response) => {
  try {
    console.log('Creating new template in library database:', req.body);
    
    // Get models from library database
    const Template = getTemplateModel();
    const DeviceType = getDeviceTypeModel();
    
    // Check if template has deviceType
    if (!req.body.deviceType) {
      req.body.deviceType = 'generic'; // Default device type
    }
    
    // Make sure it's marked as a template
    req.body.isTemplate = true;
    
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
    
    // Add user information if available
    if (req.user && !req.body.createdBy) {
      req.body.createdBy = {
        userId: req.user.id || 'unknown',
        username: req.user.name || 'Unknown User',
        email: req.user.email || 'unknown@example.com',
        organization: req.user.organization || ''
      };
    }
    
    // Create and save the template
    const template = await Template.create(req.body);
    console.log('Created template:', template);
    
    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Error creating template', error: error.message });
  }
};

// Update template
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    console.log(`Updating template with ID ${req.params.id} in library database`);
    const Template = getTemplateModel();
    
    // Make sure it stays marked as a template
    req.body.isTemplate = true;
    
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Error updating template', error: error.message });
  }
};

// Delete template
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    console.log(`Deleting template with ID ${req.params.id} from library database`);
    const Template = getTemplateModel();
    
    const template = await Template.findByIdAndDelete(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Error deleting template', error: error.message });
  }
};

// Get templates by device type
export const getTemplatesByDeviceType = async (req: Request, res: Response) => {
  try {
    console.log(`Fetching templates for device type ${req.params.deviceType} from library database`);
    const Template = getTemplateModel();
    
    const templates = await Template.find({ deviceType: req.params.deviceType });
    console.log(`Found ${templates.length} templates for device type ${req.params.deviceType}`);
    
    res.status(200).json(templates);
  } catch (error: any) {
    console.error('Error fetching templates by device type:', error);
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

export default {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplatesByDeviceType
};