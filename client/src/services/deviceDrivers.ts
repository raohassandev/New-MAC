import axios from 'axios';
import { DeviceType, DeviceDriver, DeviceDriverFormData, NewDeviceType } from '../types/deviceDriver.types';

// Create api instance 
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/amx/api';
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
export type { DeviceType, DeviceDriver, DeviceDriverFormData, NewDeviceType };

// Library API paths (separate database)
const DEVICE_DRIVER = '/devicedriver';

// Device Driver API functions
export const getDeviceDrivers = async (): Promise<DeviceDriver[]> => {
  try {
    // First try to get device drivers from library API path
    try {
      const response = await api.get(`${DEVICE_DRIVER}/device-drivers`);
      if (response.data && response.data.length > 0) {
        return response.data;
      }
    } catch (libraryError) {
      console.warn('Error fetching from library API, falling back to devices API:', libraryError);
    }
    
    // Fallback: fetch devices marked as device drivers
    try {
      const devicesResponse = await api.get('/devices');
      const deviceDrivers = devicesResponse.data.filter((device: any) => device.isDeviceDriver === true);
      
      // If we have device drivers, return them
      if (deviceDrivers && deviceDrivers.length > 0) {
        return deviceDrivers;
      }
    } catch (deviceError) {
      console.warn('Error fetching from devices API:', deviceError);
    }
    
    // If no device drivers are found, provide sample device drivers
    console.warn('No device drivers found, providing sample device drivers');
    return [
      {
        _id: 'deviceDriver_1',
        name: 'CVM C4 Power Analyzer',
        description: 'Standard power analyzer device driver for CVM C4 devices',
        deviceType: 'Power Analyzer',
        isDeviceDriver: true,
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
        _id: 'deviceDriver_2',
        name: 'Huawei Solar Inverter',
        description: 'Device driver for Huawei solar inverters',
        deviceType: 'Solar Inverter',
        isDeviceDriver: true,
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
    console.error('Error fetching device drivers:', error);
    throw error;
  }
};

export const getDeviceDriverById = async (id: string): Promise<DeviceDriver> => {
  try {
    const response = await api.get(`${DEVICE_DRIVER}/device-drivers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device driver:', error);
    throw error;
  }
};

export const getDeviceDriversByDeviceType = async (deviceType: string): Promise<DeviceDriver[]> => {
  try {
    const response = await api.get(`${DEVICE_DRIVER}/device-drivers/by-device-type/${deviceType}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device drivers by device type:', error);
    throw error;
  }
};

export const createDeviceDriver = async (deviceDriver: DeviceDriverFormData): Promise<DeviceDriver> => {
  try {
    // Ensure device driver has isDeviceDriver flag
    const deviceDriverData = {
      ...deviceDriver,
      isDeviceDriver: true
    };
    
    try {
      // First try library API
      const response = await api.post(`${DEVICE_DRIVER}/device-drivers`, deviceDriverData);
      return response.data;
    } catch (libraryError) {
      console.warn('Error creating device driver in library API, falling back to devices API:', libraryError);
      // Fallback to devices API
      const deviceResponse = await api.post('/devices', deviceDriverData);
      return deviceResponse.data;
    }
  } catch (error) {
    console.error('Error creating device driver:', error);
    throw error;
  }
};

export const updateDeviceDriver = async (id: string, deviceDriver: Partial<DeviceDriver>): Promise<DeviceDriver> => {
  try {
    const response = await api.put(`${DEVICE_DRIVER}/device-drivers/${id}`, deviceDriver);
    return response.data;
  } catch (error) {
    console.error('Error updating device driver:', error);
    throw error;
  }
};

export const deleteDeviceDriver = async (id: string): Promise<void> => {
  try {
    await api.delete(`${DEVICE_DRIVER}/device-drivers/${id}`);
  } catch (error) {
    console.error('Error deleting device driver:', error);
    throw error;
  }
};

// Device Type API functions
export const getDeviceTypes = async (): Promise<DeviceType[]> => {
  try {
    const response = await api.get(`${DEVICE_DRIVER}/device-types`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device types:', error);
    throw error;
  }
};

export const getDeviceTypeById = async (id: string): Promise<DeviceType> => {
  try {
    const response = await api.get(`${DEVICE_DRIVER}/device-types/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device type:', error);
    throw error;
  }
};

export const createDeviceType = async (deviceType: NewDeviceType): Promise<DeviceType> => {
  try {
    const response = await api.post(`${DEVICE_DRIVER}/device-types`, deviceType);
    return response.data;
  } catch (error) {
    console.error('Error creating device type:', error);
    throw error;
  }
};

export const updateDeviceType = async (id: string, deviceType: Partial<DeviceType>): Promise<DeviceType> => {
  try {
    const response = await api.put(`${DEVICE_DRIVER}/device-types/${id}`, deviceType);
    return response.data;
  } catch (error) {
    console.error('Error updating device type:', error);
    throw error;
  }
};

export const deleteDeviceType = async (id: string): Promise<void> => {
  try {
    await api.delete(`${DEVICE_DRIVER}/device-types/${id}`);
  } catch (error) {
    console.error('Error deleting device type:', error);
    throw error;
  }
};