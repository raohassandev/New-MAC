import axios from 'axios';
import { DeviceType, Template, TemplateFormData, NewDeviceType } from '../types/template.types';

// Create api instance 
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Load token from storage on initial load
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Re-export types for convenience
export type { DeviceType, Template, TemplateFormData, NewDeviceType };

// Library API paths (separate database)
const LIBRARY_API_PATH = '/library';

// Template API functions
export const getTemplates = async (): Promise<Template[]> => {
  try {
    // First try to get templates from library API path
    try {
      const response = await api.get(`${LIBRARY_API_PATH}/templates`);
      return response.data;
    } catch (libraryError) {
      console.warn('Error fetching from library API, falling back to devices API:', libraryError);
      // Fallback: also fetch devices marked as templates
      const devicesResponse = await api.get('/devices');
      return devicesResponse.data.filter((device: any) => device.isTemplate === true);
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

export const getTemplateById = async (id: string): Promise<Template> => {
  try {
    const response = await api.get(`${LIBRARY_API_PATH}/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
};

export const getTemplatesByDeviceType = async (deviceType: string): Promise<Template[]> => {
  try {
    const response = await api.get(`${LIBRARY_API_PATH}/templates/by-device-type/${deviceType}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching templates by device type:', error);
    throw error;
  }
};

export const createTemplate = async (template: TemplateFormData): Promise<Template> => {
  try {
    // Ensure template has isTemplate flag
    const templateData = {
      ...template,
      isTemplate: true
    };
    
    try {
      // First try library API
      const response = await api.post(`${LIBRARY_API_PATH}/templates`, templateData);
      return response.data;
    } catch (libraryError) {
      console.warn('Error creating template in library API, falling back to devices API:', libraryError);
      // Fallback to devices API
      const deviceResponse = await api.post('/devices', templateData);
      return deviceResponse.data;
    }
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

export const updateTemplate = async (id: string, template: Partial<Template>): Promise<Template> => {
  try {
    const response = await api.put(`${LIBRARY_API_PATH}/templates/${id}`, template);
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    await api.delete(`${LIBRARY_API_PATH}/templates/${id}`);
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

// Device Type API functions
export const getDeviceTypes = async (): Promise<DeviceType[]> => {
  try {
    const response = await api.get(`${LIBRARY_API_PATH}/device-types`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device types:', error);
    throw error;
  }
};

export const getDeviceTypeById = async (id: string): Promise<DeviceType> => {
  try {
    const response = await api.get(`${LIBRARY_API_PATH}/device-types/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device type:', error);
    throw error;
  }
};

export const createDeviceType = async (deviceType: NewDeviceType): Promise<DeviceType> => {
  try {
    const response = await api.post(`${LIBRARY_API_PATH}/device-types`, deviceType);
    return response.data;
  } catch (error) {
    console.error('Error creating device type:', error);
    throw error;
  }
};

export const updateDeviceType = async (id: string, deviceType: Partial<DeviceType>): Promise<DeviceType> => {
  try {
    const response = await api.put(`${LIBRARY_API_PATH}/device-types/${id}`, deviceType);
    return response.data;
  } catch (error) {
    console.error('Error updating device type:', error);
    throw error;
  }
};

export const deleteDeviceType = async (id: string): Promise<void> => {
  try {
    await api.delete(`${LIBRARY_API_PATH}/device-types/${id}`);
  } catch (error) {
    console.error('Error deleting device type:', error);
    throw error;
  }
};