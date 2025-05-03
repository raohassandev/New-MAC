import axios from 'axios';
import { toast } from 'react-toastify';

// Define API base URL based on environment
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request interceptor to add auth token to every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    const { response } = error;

    // Handle different error response statuses
    if (response) {
      switch (response.status) {
        case 401:
          // Unauthorized - Token expired or invalid
          localStorage.removeItem('token');
          toast.error('Your session has expired. Please log in again.');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden - User doesn't have permission
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          // Not Found
          toast.error('The requested resource was not found');
          break;
        case 500:
          // Server Error
          toast.error('Server error occurred. Please try again later.');
          break;
        default:
          // Other errors
          if (response.data?.message) {
            toast.error(response.data.message);
          } else {
            toast.error('An error occurred. Please try again.');
          }
      }
    } else {
      // Network error or server not responding
      toast.error('Cannot connect to the server. Please check your internet connection.');
    }

    return Promise.reject(error);
  }
);

export default api;
