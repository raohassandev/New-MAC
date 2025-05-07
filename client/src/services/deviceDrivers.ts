import axios from 'axios';
import {
  DeviceType,
  DeviceDriver,
  DeviceDriverFormData,
  NewDeviceType,
} from '../types/deviceDriver.types';
import { endpoints } from '../../../CONSTANTS';

// Create api instance
const API_URL = import.meta.env.VITE_API_URL || endpoints.baseUrl;
const AMX_API_PATH = endpoints.frontend.amxPrefix;
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
const DEVICE_DRIVER = endpoints.frontend.deviceDriver.baseUrl;

// Device Driver API functions
export const getDeviceDrivers = async (): Promise<DeviceDriver[]> => {
  try {
    console.log('[deviceDrivers.ts] Starting device driver fetch attempt');
    console.log('[deviceDrivers.ts] Primary API URL:', `${API_URL}${DEVICE_DRIVER}/`);
    console.log('[deviceDrivers.ts] Fallback API URL:', `${API_URL}${endpoints.frontend.deviceDriver.get}`);
    
    // First try to get device drivers from library API path
    try {
      console.log('[deviceDrivers.ts] Attempting to fetch from library API path:', `${DEVICE_DRIVER}/`);
      const response = await api.get(`${DEVICE_DRIVER}/`);
      console.log('[deviceDrivers.ts] Library API response received:', response);
      
      if (response.data && response.data.length > 0) {
        console.log('[deviceDrivers.ts] Found device drivers in library API:', response.data.length);
        return response.data;
      } else {
        console.warn('[deviceDrivers.ts] Library API returned empty result. Response:', response.data);
      }
    } catch (libraryError) {
      console.warn('[deviceDrivers.ts] Error fetching from library API, details:', libraryError);
      if (libraryError.response) {
        console.warn('[deviceDrivers.ts] Library API error details:',
          'Status:', libraryError.response.status,
          'Data:', libraryError.response.data);
      }
      console.log('[deviceDrivers.ts] Falling back to devices API...');
    }

    // Fallback: fetch devices marked as device drivers
    try {
      console.log('[deviceDrivers.ts] Attempting to fetch from devices API:', endpoints.frontend.deviceDriver.get);
      const devicesResponse = await api.get(endpoints.frontend.deviceDriver.get);
      console.log('[deviceDrivers.ts] Devices API response received:', devicesResponse);
      
      if (!devicesResponse.data) {
        console.warn('[deviceDrivers.ts] Devices API returned no data');
        return [];
      }
      
      console.log('[deviceDrivers.ts] Filtering for device drivers from response...');
      const deviceDrivers = Array.isArray(devicesResponse.data) 
        ? devicesResponse.data.filter((device: any) => device.isDeviceDriver === true)
        : devicesResponse.data.devices 
          ? devicesResponse.data.devices.filter((device: any) => device.isDeviceDriver === true)
          : [];

      // Log the results of our filtering
      console.log('[deviceDrivers.ts] Found device drivers after filtering:', deviceDrivers.length);

      // If we have device drivers, return them
      if (deviceDrivers && deviceDrivers.length > 0) {
        return deviceDrivers;
      } else {
        console.warn('[deviceDrivers.ts] No device drivers found after filtering devices response');
      }
    } catch (deviceError) {
      console.warn('[deviceDrivers.ts] Error fetching from devices API:', deviceError);
      if (deviceError.response) {
        console.warn('[deviceDrivers.ts] Devices API error details:',
          'Status:', deviceError.response.status,
          'Data:', deviceError.response.data);
      } else if (deviceError.request) {
        console.warn('[deviceDrivers.ts] No response received from devices API. Request:', deviceError.request);
      } else {
        console.warn('[deviceDrivers.ts] Error message:', deviceError.message);
      }
    }

    // Return an empty array instead of dummy data
    console.warn('[deviceDrivers.ts] No device drivers found in database - returning empty array');
    return [];
  } catch (error) {
    console.error('[deviceDrivers.ts] Fatal error fetching device drivers:', error);
    throw error;
  }
};

export const getDeviceDriverById = async (id: string): Promise<DeviceDriver> => {
  try {
    const fullUrl = `${DEVICE_DRIVER}/${id}`;
    console.log(`Fetching device driver with ID ${id} from ${API_URL}${fullUrl}`);

    // Add detailed request logging
    console.log('Request details:', {
      method: 'GET',
      url: fullUrl,
      baseURL: API_URL,
      fullRequestUrl: `${API_URL}${fullUrl}`,
    });

    const response = await api.get(fullUrl);
    console.log('Device driver data received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching device driver:', error);

    // Provide more detailed error information
    if (axios.isAxiosError(error)) {
      console.error('API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        },
      });

      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error(`Device driver with ID ${id} not found`);
      }
      if (error.response?.status === 401) {
        throw new Error('Authentication required to access device driver data');
      }
    }

    throw error;
  }
};

export const getDeviceDriversByDeviceType = async (deviceType: string): Promise<DeviceDriver[]> => {
  try {
    const response = await api.get(`${DEVICE_DRIVER}/by-device-type/${deviceType}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device drivers by device type:', error);
    throw error;
  }
};

export const createDeviceDriver = async (
  deviceDriver: DeviceDriverFormData
): Promise<DeviceDriver> => {
  try {
    // Ensure device driver has isDeviceDriver flag
    const deviceDriverData = {
      ...deviceDriver,
      isDeviceDriver: true,
    };

    try {
      // First try library API
      const response = await api.post(`${DEVICE_DRIVER}`, deviceDriverData);
      return response.data;
    } catch (libraryError) {
      console.warn(
        'Error creating device driver in library API, falling back to devices API:',
        libraryError
      );
      // Fallback to devices API
      const deviceResponse = await api.post('/devices', deviceDriverData);
      return deviceResponse.data;
    }
  } catch (error) {
    console.error('Error creating device driver:', error);
    throw error;
  }
};

export const updateDeviceDriver = async (
  id: string,
  deviceDriver: Partial<DeviceDriver>
): Promise<DeviceDriver> => {
  try {
    const fullUrl = `${DEVICE_DRIVER}/${id}`;
    console.log(`Updating device driver with ID ${id} at ${API_URL}${fullUrl}`);

    // Add detailed request logging
    console.log('Update request details:', {
      method: 'PUT',
      url: fullUrl,
      baseURL: API_URL,
      fullRequestUrl: `${API_URL}${fullUrl}`,
      data: deviceDriver,
    });

    const response = await api.put(fullUrl, deviceDriver);
    console.log('Device driver update successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating device driver:', error);

    // Provide more detailed error information
    if (axios.isAxiosError(error)) {
      console.error('API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        },
      });

      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error(`Device driver with ID ${id} not found for update`);
      }
      if (error.response?.status === 401) {
        throw new Error('Authentication required to update device driver');
      }
    }

    throw error;
  }
};

export const deleteDeviceDriver = async (id: string): Promise<void> => {
  try {
    await api.delete(`${DEVICE_DRIVER}/${id}`);
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

export const updateDeviceType = async (
  id: string,
  deviceType: Partial<DeviceType>
): Promise<DeviceType> => {
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
