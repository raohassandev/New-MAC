import axios from 'axios';

// Use environment variable for the API URL instead of hardcoding
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

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
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getMe = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
};

// Device API calls
export const getDevices = async () => {
  try {
    // For development/demo purposes, if we're getting a 404 from the real API,
    // fall back to the mock endpoint
    try {
      const response = await api.get('/devices');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Fall back to mock endpoint
        const mockResponse = await api.get('/getDevices');
        return mockResponse.data;
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
    const response = await api.get(`/devices/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device:', error);
    throw error;
  }
};

export const createDevice = async (deviceData: any) => {
  try {
    // Try to use the real API endpoint
    try {
      const response = await api.post('/devices', deviceData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If the real endpoint doesn't exist yet (during development),
        // simulate a successful response for demo purposes
        console.warn('Using mock device creation response');

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
      throw error;
    }
  } catch (error) {
    console.error('Error creating device:', error);
    throw error;
  }
};

export const updateDevice = async (id: string, deviceData: any) => {
  try {
    const response = await api.put(`/devices/${id}`, deviceData);
    return response.data;
  } catch (error) {
    console.error('Error updating device:', error);
    throw error;
  }
};

export const deleteDevice = async (id: string) => {
  try {
    const response = await api.delete(`/devices/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting device:', error);
    throw error;
  }
};

export const testDevice = async (id: string) => {
  try {
    const response = await api.post(`/devices/${id}/test`);
    return response.data;
  } catch (error) {
    console.error('Error testing device:', error);
    throw error;
  }
};

export const readDeviceRegisters = async (id: string) => {
  try {
    const response = await api.get(`/devices/${id}/read`);
    return response.data;
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
