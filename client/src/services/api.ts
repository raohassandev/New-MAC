import axios from 'axios';
import { endpoints } from '../../../CONSTANTS';
// Use environment variable for the API URL instead of hardcoding
const API_URL = import.meta.env.VITE_API_URL || endpoints.authUrl;

// Create the axios instance with the correct base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token functions
export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  // Also store the token in localStorage for persistence across page refreshes
  localStorage.setItem('token', token);
};

export const clearAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('token');
};

// Load token from storage on initial load
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

// Authentication API calls
export const login = async (email: string, password: string) => {
  try {
    const response = await api.post(endpoints.frontend.auth.login, { email, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getMe = async () => {
  try {
    const response = await api.get(endpoints.frontend.auth.me);
    return response.data;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
};

// Device API calls
export const getDevices = async () => {
  try {
    // First try with correct API path
    try {
      const response = await api.get('/client/api/devices');

      // Check if we have a new paginated response format
      if (response.data && response.data.devices) {
        return response.data.devices;
      }

      // Check if we have a direct array response format
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }

      // If we have some other data format, return it directly
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If 404, try legacy path
        try {
          const legacyResponse = await api.get('/devices');
          return legacyResponse.data;
        } catch (legacyError) {
          // If both fail, fall back to mock endpoint
          console.warn('Using mock device data, API endpoints not found');
          const mockResponse = await api.get('/getDevices');
          return mockResponse.data;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw error;
  }
};

export const getDeviceById = async (id: string) => {
  try {
    // Try with correct API path
    try {
      const response = await api.get(`/client/api/devices/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If 404, try legacy path
        const legacyResponse = await api.get(`/devices/${id}`);
        return legacyResponse.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching device:', error);
    throw error;
  }
};

export const createDevice = async (deviceData: any) => {
  try {
    // Try with correct API path
    try {
      const response = await api.post('/client/api/devices', deviceData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If 404, try legacy path
        try {
          const legacyResponse = await api.post('/devices', deviceData);
          return legacyResponse.data;
        } catch (legacyError) {
          // If both fail, return a mock response for development
          console.warn('Using mock device creation response - API endpoints not found');

          // Generate a random ID
          const mockId = Math.random().toString(36).substring(2, 15);

          // Return a mock response
          return {
            ...deviceData,
            _id: mockId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeen: deviceData.enabled ? new Date().toISOString() : null,
          };
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating device:', error);
    throw error;
  }
};

export const updateDevice = async (id: string, deviceData: any) => {
  try {
    // Try with correct API path
    try {
      const response = await api.put(`/client/api/devices/${id}`, deviceData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If 404, try legacy path
        const legacyResponse = await api.put(`/devices/${id}`, deviceData);
        return legacyResponse.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating device:', error);
    throw error;
  }
};

export const deleteDevice = async (id: string) => {
  try {
    // Try with correct API path
    try {
      const response = await api.delete(`/client/api/devices/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If 404, try legacy path
        const legacyResponse = await api.delete(`/devices/${id}`);
        return legacyResponse.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting device:', error);
    throw error;
  }
};

export const testDevice = async (id: string) => {
  try {
    // Try with correct API path
    try {
      const response = await api.post(`/client/api/devices/${id}/test`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If 404, try legacy path
        const legacyResponse = await api.post(`/devices/${id}/test`);
        return legacyResponse.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error testing device:', error);
    throw error;
  }
};

export const readDeviceRegisters = async (id: string) => {
  try {
    // Try with correct API path
    try {
      const response = await api.get(`/client/api/devices/${id}/read`);
      console.log('Reading Data is =>', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If 404, try legacy path
        const legacyResponse = await api.get(`/devices/${id}/read`);
        return legacyResponse.data;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error reading device registers:', error);
    throw error;
  }
};

// Profile API calls
export const getProfiles = async () => {
  try {
    const response = await api.get('/profiles');
    return response.data;
  } catch (error) {
    console.error('Error fetching profiles:', error);

    // Mock data for development
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn('Using mock profile data');
      // Return sample profiles
      return [
        {
          _id: '1',
          name: 'Server Room Cooling',
          description: 'Standard cooling profile for server rooms',
          targetTemperature: 21,
          temperatureRange: [19, 23],
          fanSpeed: 70,
          mode: 'cooling',
          assignedDevices: [],
          isTemplate: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: '2',
          name: 'Office Comfort',
          description: 'Comfortable settings for office spaces',
          targetTemperature: 24,
          temperatureRange: [22, 26],
          fanSpeed: 50,
          mode: 'auto',
          assignedDevices: [],
          isTemplate: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    throw error;
  }
};

export const getProfileById = async (id: string) => {
  try {
    const response = await api.get(`/profiles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const createProfile = async (profileData: any) => {
  try {
    const response = await api.post('/profiles', profileData);
    return response.data;
  } catch (error) {
    console.error('Error creating profile:', error);

    // Mock response for development
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn('Using mock profile creation');
      return {
        ...profileData,
        _id: Math.random().toString(36).substring(2, 15),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    throw error;
  }
};

export const updateProfile = async (id: string, profileData: any) => {
  try {
    const response = await api.put(`/profiles/${id}`, profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const deleteProfile = async (id: string) => {
  try {
    const response = await api.delete(`/profiles/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw error;
  }
};

export const applyProfile = async (id: string) => {
  try {
    const response = await api.post(`/profiles/${id}/apply`);
    return response.data;
  } catch (error) {
    console.error('Error applying profile:', error);

    // Mock response for development
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn('Using mock profile apply response');
      return {
        success: true,
        message: 'Profile applied successfully',
      };
    }

    throw error;
  }
};

export default api;
