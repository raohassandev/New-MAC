import axios from 'axios';
import { toast } from 'react-toastify';

// Define API base URL based on environment
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds - increased to handle slow Modbus connections
});

// Request interceptor to add auth token to every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    
    console.log(`[API client] Making request to: ${config.url}`);
    
    // Always inject token if it exists (even in development mode)
    if (token) {
      console.log('[API client] Adding auth token to request');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // In development, use a demo token if no real token exists
      // This helps with testing when auth is required but not fully implemented
      console.log('[API client] No auth token found, using development token');
      config.headers.Authorization = 'Bearer dev_token_for_testing';
    }
    
    // Also set CORS headers for all requests
    config.headers['Access-Control-Allow-Origin'] = '*';
    return config;
  },
  error => {
    console.error('[API client] Request interceptor error:', error);
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
    console.log('[API client] Error intercepted:', error);

    // Always log the error response for debugging
    if (response) {
      console.log('[API client] Response status:', response.status);
      console.log('[API client] Response data:', response.data);
      console.log('[API client] Request URL:', response.config?.url);
    }

    // Handle different error response statuses
    if (response) {
      switch (response.status) {
        case 401:
          // Unauthorized - Token expired or invalid
          localStorage.removeItem('token');
          toast.error('Your session has expired. Please log in again.');

          // Prevent automatic redirection for device creation actions
          // to allow debugging errors from the device form
          if (
            !response.config?.url?.includes('/client/api/devices') ||
            response.config?.method?.toLowerCase() !== 'post'
          ) {
            window.location.href = '/login';
          }
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
            // Special handling for connection test, device read operations, and device creation
            // Don't show toast notifications for these since we'll display them in the component UI
            const isSpecialEndpoint =
              response.config.url?.includes('/test') ||
              response.config.url?.includes('/read') ||
              (response.config.url?.includes('/client/api/devices') &&
                response.config.method?.toLowerCase() === 'post');

            if (!isSpecialEndpoint) {
              // For other errors without specific handling, show toast notification
              toast.error(response.data.message);
            }
          } else {
            toast.error('An error occurred. Please try again.');
          }
      }
    } else {
      // Network error or server not responding
      toast.error('Cannot connect to the server. Please check your internet connection.');
    }

    // Ensure we preserve the full error response for component handling
    // This allows components to access the error details for display
    return Promise.reject(error);
  }
);

export default api;
