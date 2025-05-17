import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { Device } from '../../../types/device.types';

/**
 * Base selector for devices state
 */
const selectDevicesState = (state: RootState) => state.devices;

/**
 * Select devices loading state
 */
export const selectDevicesLoading = createSelector(selectDevicesState, devices => devices.loading);

/**
 * Select devices error
 */
export const selectDevicesError = createSelector(selectDevicesState, devices => devices.error);

/**
 * Select all devices as an array
 */
export const selectAllDevices = createSelector(selectDevicesState, devices =>
  devices.allIds.map((id: any) => devices.byId[id])
);

/**
 * Select devices by IDs
 */
export const selectDevicesByIds = (deviceIds: string[]) =>
  createSelector(selectDevicesState, devices =>
    deviceIds.map(id => devices.byId[id]).filter(Boolean)
  );

/**
 * Select a device by ID
 */
export const selectDeviceById = (deviceId: string) =>
  createSelector(selectDevicesState, devices => devices.byId[deviceId]);

/**
 * Select the currently selected device
 */
export const selectSelectedDevice = createSelector(selectDevicesState, devices =>
  devices.selectedDeviceId ? devices.byId[devices.selectedDeviceId] : null
);

/**
 * Select device filters
 */
export const selectDeviceFilters = createSelector(selectDevicesState, devices => devices.filters);

/**
 * Select filtered devices
 */
export const selectFilteredDevices = createSelector(
  [selectAllDevices, selectDeviceFilters],
  (devices, filters) => {
    return devices.filter((device: Device) => {
      // Filter by search term
      if (filters.search && !device.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Filter by status
      if (filters.status === 'online' && !device.enabled) {
        return false;
      }
      if (filters.status === 'offline' && device.enabled) {
        return false;
      }

      // Filter by type
      if (filters.type && device.deviceType !== filters.type) {
        return false;
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        if (!device.tags || !filters.tags.some((tag: string) => device.tags?.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }
);

/**
 * Select devices by type
 */
export const selectDevicesByType = (deviceType: string) =>
  createSelector(selectAllDevices, devices =>
    devices.filter((device: any) => device.deviceType === deviceType)
  );

/**
 * Select devices by tag
 */
export const selectDevicesByTag = (tag: string) =>
  createSelector(selectAllDevices, devices => devices.filter((device: any) => device.tags?.includes(tag)));

/**
 * Select enabled devices
 */
export const selectEnabledDevices = createSelector(selectAllDevices, devices =>
  devices.filter((device: any) => device.enabled)
);

/**
 * Select disabled devices
 */
export const selectDisabledDevices = createSelector(selectAllDevices, devices =>
  devices.filter((device: any) => !device.enabled)
);

/**
 * Select connection test status
 */
export const selectConnectionTestStatus = createSelector(
  selectDevicesState,
  devices => devices.connectionTestStatus
);

/**
 * Select connection test status for a specific device
 */
export const selectConnectionTestStatusForDevice = (deviceId: string) =>
  createSelector(selectConnectionTestStatus, status =>
    status.deviceId === deviceId ? status : null
  );
