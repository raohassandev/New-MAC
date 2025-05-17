import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Device, DeviceFilter } from '../../../types/device.types';
import { EntityState } from '../../types';
import {
  fetchDevices,
  fetchDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  testDeviceConnection,
} from './devicesAPI';

/**
 * Devices state interface
 */
export interface DevicesState extends EntityState<Device> {
  selectedDeviceId: string | null;
  filters: DeviceFilter;
  connectionTestStatus: {
    deviceId: string | null;
    loading: boolean;
    success: boolean;
    error: string | null;
    message: string | null;
  };
}

/**
 * Initial devices state
 */
const initialState: DevicesState = {
  byId: {},
  allIds: [],
  selectedDeviceId: null,
  loading: false,
  error: null,
  lastUpdated: null,
  filters: {},
  connectionTestStatus: {
    deviceId: null,
    loading: false,
    success: false,
    error: null,
    message: null,
  },
};

/**
 * Devices slice with reducers and handlers for async thunks
 */
const devicesSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    selectDevice: (state, action: PayloadAction<string>) => {
      state.selectedDeviceId = action.payload;
    },
    clearSelectedDevice: state => {
      state.selectedDeviceId = null;
    },
    setFilters: (state, action: PayloadAction<DeviceFilter>) => {
      state.filters = action.payload;
    },
    clearFilters: state => {
      state.filters = {};
    },
  },
  extraReducers: builder => {
    // Fetch devices list reducers
    builder.addCase(fetchDevices.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDevices.fulfilled, (state, action) => {
      state.loading = false;

      // Handle different API response formats
      const devices = Array.isArray(action.payload) ? action.payload : action.payload.devices || [];

      // Normalize devices data
      const byId: Record<string, Device> = {};
      const allIds: string[] = [];

      devices.forEach((device: any) => {
        byId[device._id] = device;
        allIds.push(device._id);
      });

      state.byId = byId;
      state.allIds = allIds;
      state.lastUpdated = Date.now();
    });
    builder.addCase(fetchDevices.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch devices';
    });

    // Fetch device by ID reducers
    builder.addCase(fetchDeviceById.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDeviceById.fulfilled, (state, action) => {
      state.loading = false;

      const device = action.payload;
      state.byId[device._id] = device;

      if (!state.allIds.includes(device._id)) {
        state.allIds.push(device._id);
      }

      state.selectedDeviceId = device._id;
      state.lastUpdated = Date.now();
    });
    builder.addCase(fetchDeviceById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch device';
    });

    // Create device reducers
    builder.addCase(createDevice.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createDevice.fulfilled, (state, action) => {
      state.loading = false;

      const device = action.payload;
      state.byId[device._id] = device;
      state.allIds.push(device._id);
      state.lastUpdated = Date.now();
    });
    builder.addCase(createDevice.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create device';
    });

    // Update device reducers
    builder.addCase(updateDevice.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateDevice.fulfilled, (state, action) => {
      state.loading = false;

      const device = action.payload;
      state.byId[device._id] = device;
      state.lastUpdated = Date.now();
    });
    builder.addCase(updateDevice.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update device';
    });

    // Delete device reducers
    builder.addCase(deleteDevice.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteDevice.fulfilled, (state, action) => {
      state.loading = false;

      const deviceId = action.payload;
      delete state.byId[deviceId];
      state.allIds = state.allIds.filter(id => id !== deviceId);

      if (state.selectedDeviceId === deviceId) {
        state.selectedDeviceId = null;
      }

      state.lastUpdated = Date.now();
    });
    builder.addCase(deleteDevice.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete device';
    });

    // Test device connection reducers
    builder.addCase(testDeviceConnection.pending, (state, action) => {
      state.connectionTestStatus = {
        deviceId: action.meta.arg,
        loading: true,
        success: false,
        error: null,
        message: null,
      };
    });
    builder.addCase(testDeviceConnection.fulfilled, (state, action) => {
      state.connectionTestStatus = {
        deviceId: action.meta.arg,
        loading: false,
        success: action.payload.success,
        error: action.payload.error || null,
        message: action.payload.message || null,
      };
    });
    builder.addCase(testDeviceConnection.rejected, (state, action) => {
      state.connectionTestStatus = {
        deviceId: action.meta.arg,
        loading: false,
        success: false,
        error: action.error.message || 'Connection test failed',
        message: 'Unable to perform connection test',
      };
    });
  },
});

// Export actions and reducer
export const { selectDevice, clearSelectedDevice, setFilters, clearFilters } = devicesSlice.actions;

export default devicesSlice.reducer;
