import { createAsyncThunk } from '@reduxjs/toolkit';
import { Device, DeviceFilter } from '../../../types/device.types';
import { ThunkApiConfig } from '../../types';
import * as deviceService from '../../../services/devices';

/**
 * Async thunk for fetching all devices with optional filters
 */
export const fetchDevices = createAsyncThunk<
  any, // Use 'any' to handle different response formats
  DeviceFilter | undefined,
  ThunkApiConfig
>('devices/fetchDevices', async (filters, { rejectWithValue }) => {
  try {
    const response = await deviceService.getDevices();
    return response;
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Failed to fetch devices',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});

/**
 * Async thunk for fetching device by ID
 */
export const fetchDeviceById = createAsyncThunk<Device, string, ThunkApiConfig>(
  'devices/fetchDeviceById',
  async (deviceId, { rejectWithValue }) => {
    try {
      return await deviceService.getDevice(deviceId);
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch device',
        status: error.response?.status,
        data: error.response?.data,
        name: error.name || 'Error',
      });
    }
  }
);

/**
 * Async thunk for creating a new device
 */
export const createDevice = createAsyncThunk<Device, Partial<Device>, ThunkApiConfig>(
  'devices/createDevice',
  async (deviceData, { rejectWithValue }) => {
    try {
      return await deviceService.addDevice(deviceData as any);
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to create device',
        status: error.response?.status,
        data: error.response?.data,
        name: error.name || 'Error',
      });
    }
  }
);

/**
 * Async thunk for updating a device
 */
export const updateDevice = createAsyncThunk<
  Device,
  Partial<Device> & { _id: string },
  ThunkApiConfig
>('devices/updateDevice', async (deviceData, { rejectWithValue }) => {
  try {
    return await deviceService.updateDevice(deviceData);
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Failed to update device',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});

/**
 * Async thunk for deleting a device
 */
export const deleteDevice = createAsyncThunk<string, string, ThunkApiConfig>(
  'devices/deleteDevice',
  async (deviceId, { rejectWithValue }) => {
    try {
      await deviceService.deleteDevice(deviceId);
      return deviceId; // Return ID for state updates
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to delete device',
        status: error.response?.status,
        data: error.response?.data,
        name: error.name || 'Error',
      });
    }
  }
);

/**
 * Connection test response interface
 */
export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  error?: string;
  errorType?: string;
  troubleshooting?: string;
  deviceInfo?: any;
}

/**
 * Async thunk for testing device connection
 */
export const testDeviceConnection = createAsyncThunk<
  ConnectionTestResponse,
  string,
  ThunkApiConfig
>('devices/testConnection', async (deviceId, { rejectWithValue }) => {
  try {
    return await deviceService.testConnection(deviceId);
  } catch (error: any) {
    return rejectWithValue({
      message: error.response?.data?.message || 'Connection test failed',
      status: error.response?.status,
      data: error.response?.data,
      name: error.name || 'Error',
    });
  }
});
