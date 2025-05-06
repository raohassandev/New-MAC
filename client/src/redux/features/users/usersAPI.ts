import { createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../../api/client';
import { User } from '../../../types/user.types';
import { ThunkApiConfig } from '../../types';

// Base API endpoint for users
const USERS_API_ENDPOINT = '/api/users';

/**
 * Async thunk for fetching all users
 */
export const fetchUsers = createAsyncThunk<
  User[],
  void,
  ThunkApiConfig
>('users/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await API.get(USERS_API_ENDPOINT);
    return response.data;
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Failed to fetch users',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});

/**
 * Async thunk for fetching user by ID
 */
export const fetchUserById = createAsyncThunk<
  User,
  string,
  ThunkApiConfig
>('users/fetchUserById', async (userId, { rejectWithValue }) => {
  try {
    const response = await API.get(`${USERS_API_ENDPOINT}/${userId}`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Failed to fetch user',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});

/**
 * User creation payload interface
 */
export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  password: string;
  permissions?: string[];
}

/**
 * Async thunk for creating a new user
 */
export const createUser = createAsyncThunk<
  User,
  CreateUserPayload,
  ThunkApiConfig
>('users/createUser', async (userData, { rejectWithValue }) => {
  try {
    const response = await API.post(USERS_API_ENDPOINT, userData);
    return response.data;
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Failed to create user',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});

/**
 * User update payload interface
 */
export interface UpdateUserPayload {
  id: string;
  data: Partial<User>;
}

/**
 * Async thunk for updating a user
 */
export const updateUser = createAsyncThunk<
  User,
  UpdateUserPayload,
  ThunkApiConfig
>('users/updateUser', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await API.put(`${USERS_API_ENDPOINT}/${id}`, data);
    return response.data;
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Failed to update user',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});

/**
 * Async thunk for deleting a user
 */
export const deleteUser = createAsyncThunk<
  string,
  string,
  ThunkApiConfig
>('users/deleteUser', async (userId, { rejectWithValue }) => {
  try {
    await API.delete(`${USERS_API_ENDPOINT}/${userId}`);
    return userId; // Return ID for state updates
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Failed to delete user',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});