import mongoose from 'mongoose';
import { createTemplateModel } from './Template';
import { createDeviceTypeModel } from './DeviceType';

// Models with the library database connection
let Template: mongoose.Model<any>;
let DeviceType: mongoose.Model<any>;

// Initialize the library models with the separate connection
export const initLibraryModels = (connection: mongoose.Connection) => {
  // Create models with the library connection
  Template = createTemplateModel(connection);
  DeviceType = createDeviceTypeModel(connection);
  
  // Return the models for immediate use
  return {
    Template,
    DeviceType
  };
};

// Getter functions to ensure the models are initialized
export const getTemplateModel = () => {
  if (!Template) {
    throw new Error('Template model not initialized. Call initLibraryModels first.');
  }
  return Template;
};

export const getDeviceTypeModel = () => {
  if (!DeviceType) {
    throw new Error('DeviceType model not initialized. Call initLibraryModels first.');
  }
  return DeviceType;
};

// Helper to access the library DB connection from request
export const getLibraryConnection = (req: any) => {
  if (!req.app || !req.app.locals || !req.app.locals.libraryDB) {
    throw new Error('Library database connection not available in request');
  }
  return req.app.locals.libraryDB;
};

export default {
  initLibraryModels,
  getTemplateModel,
  getDeviceTypeModel,
  getLibraryConnection
};