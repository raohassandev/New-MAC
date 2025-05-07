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
      if (response.data && response.data.length > 0) {
        return response.data;
      }
    } catch (libraryError) {
      console.warn('Error fetching from library API, falling back to devices API:', libraryError);
    }
    
    // Fallback: fetch devices marked as templates
    try {
      const devicesResponse = await api.get('/devices');
      const templateDevices = devicesResponse.data.filter((device: any) => device.isTemplate === true);
      
      // If we have template devices, return them
      if (templateDevices && templateDevices.length > 0) {
        return templateDevices;
      }
    } catch (deviceError) {
      console.warn('Error fetching from devices API:', deviceError);
    }
    
    // If no templates are found, provide sample templates
    console.warn('No templates found, providing sample templates');
    return [
      {
        _id: 'template_1',
        name: 'CVM C4 Power Analyzer',
        description: 'Standard power analyzer template for CVM C4 devices',
        deviceType: 'Power Analyzer',
        isTemplate: true,
        enabled: true,
        make: 'CVM',
        model: 'C4 TPM30',
        tags: ['power', 'energy'],
        connectionSetting: {
          connectionType: 'tcp',
          tcp: {
            ip: '192.168.1.100',
            port: 502,
            slaveId: 1
          }
        },
        dataPoints: [
          {
            range: {
              startAddress: 0,
              count: 2,
              fc: 3,
            },
            parser: {
              parameters: [
                {
                  name: 'Voltage',
                  dataType: 'FLOAT',
                  scalingFactor: 1,
                  decimalPoint: 1,
                  byteOrder: 'ABCD',
                  signed: true,
                  registerRange: 'Electrical',
                  registerIndex: 0,
                  wordCount: 2
                }
              ]
            }
          }
        ],
        createdBy: {
          userId: 'demo_user_id',
          username: 'Demo User',
          email: 'demo@example.com'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'template_2',
        name: 'Huawei Solar Inverter',
        description: 'Template for Huawei solar inverters',
        deviceType: 'Solar Inverter',
        isTemplate: true,
        enabled: true,
        make: 'Huawei',
        model: '110 KTL M2',
        tags: ['solar', 'energy'],
        connectionSetting: {
          connectionType: 'rtu',
          rtu: {
            serialPort: 'COM2',
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            slaveId: 1
          }
        },
        dataPoints: [
          {
            range: {
              startAddress: 0,
              count: 2,
              fc: 3,
            },
            parser: {
              parameters: [
                {
                  name: 'DC Voltage',
                  dataType: 'FLOAT',
                  scalingFactor: 1,
                  decimalPoint: 1,
                  byteOrder: 'ABCD',
                  signed: true,
                  registerRange: 'Main',
                  registerIndex: 0,
                  wordCount: 2
                }
              ]
            }
          }
        ],
        createdBy: {
          userId: 'demo_user_id',
          username: 'Demo User',
          email: 'demo@example.com'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
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