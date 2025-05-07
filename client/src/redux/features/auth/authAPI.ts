import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService, LoginCredentials, RegisterCredentials, User } from '../../../services/auth';
import { ThunkApiConfig } from '../../types';

/**
 * Async thunk for user login
 */
export const login = createAsyncThunk<User, LoginCredentials, ThunkApiConfig>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials);
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Login failed',
        status: error.response?.status,
        data: error.response?.data,
        name: error.name || 'Error',
      });
    }
  }
);

/**
 * Async thunk for user registration
 */
export const register = createAsyncThunk<User, RegisterCredentials, ThunkApiConfig>(
  'auth/register',
  async (credentials, { rejectWithValue }) => {
    try {
      return await authService.register(credentials);
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Registration failed',
        status: error.response?.status,
        data: error.response?.data,
        name: error.name || 'Error',
      });
    }
  }
);

/**
 * Async thunk for retrieving current user
 */
export const getCurrentUser = createAsyncThunk<User, void, ThunkApiConfig>(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getCurrentUser();
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to get current user',
        status: error.response?.status,
        data: error.response?.data,
        name: error.name || 'Error',
      });
    }
  }
);

/**
 * Async thunk for user logout
 */
export const logout = createAsyncThunk<boolean, void, ThunkApiConfig>('auth/logout', async () => {
  authService.logout();
  return true;
});
