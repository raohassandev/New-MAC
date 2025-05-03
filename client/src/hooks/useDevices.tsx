import { useCallback, useEffect, useState } from 'react';
import { Device } from '../types/device.types';
import {
  getDevices,
  getDevice as getDeviceService,
  addDevice as addDeviceService,
  updateDevice as updateDeviceApi,
  deleteDevice as deleteDeviceApi,
  testConnection as testConnectionService,
} from '../services/devices';
// Import read registers function
import { readDeviceRegisters } from '../services/api';

interface UseDevicesReturn {
  devices: Device[];
  loading: boolean;
  error: Error | null;
  refreshDevices: () => Promise<void>;
  getDevice: (id: string) => Promise<Device>;
  addDevice: (device: Omit<Device, '_id'>) => Promise<Device>;
  updateDevice: (device: Device) => Promise<Device>;
  deleteDevice: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<{ success: boolean; message: string }>;
  readRegisters: (id: string) => Promise<any>;
  loadingDevice: boolean;
  deviceError: Error | null;
}

export const useDevices = (): UseDevicesReturn => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [deviceError, setDeviceError] = useState<Error | null>(null);

  // Fetch all devices
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getDevices();

      // Ensure each device has required fields
      const formattedDevices = response.map((device: Device) => ({
        ...device,
        tags: device.tags || [],
        registers: device.registers || [],
        lastSeen: device.lastSeen || undefined,
      }));

      setDevices(formattedDevices);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch devices'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch of devices
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Get a single device by ID
  const getDevice = async (id: string): Promise<Device> => {
    setLoadingDevice(true);
    setDeviceError(null);

    try {
      // First check if we already have the device in our state
      const cachedDevice = devices.find(d => d._id === id);

      if (cachedDevice) {
        setLoadingDevice(false);
        return cachedDevice;
      }

      // If not in state, use our development service
      const device = await getDeviceService(id);

      // Add the newly fetched device to our state
      setDevices(prevDevices => [...prevDevices, device]);

      return device;
    } catch (err) {
      console.error('Error fetching device:', err);
      setDeviceError(err instanceof Error ? err : new Error('Failed to fetch device'));
      throw err;
    } finally {
      setLoadingDevice(false);
    }
  };

  // Add a new device
  const addDevice = async (device: Omit<Device, '_id'>): Promise<Device> => {
    try {
      // Ensure required fields
      const deviceToAdd = {
        ...device,
        tags: device.tags || [],
        registers: device.registers || [],
      };

      // Use our updated addDeviceService that handles auth issues
      const newDevice = await addDeviceService(deviceToAdd);

      // Update local state
      setDevices(prev => [...prev, newDevice]);

      return newDevice;
    } catch (err) {
      console.error('Error adding device:', err);
      throw err instanceof Error ? err : new Error('Failed to add device');
    }
  };

  // Update an existing device
  const updateDevice = async (device: Device): Promise<Device> => {
    try {
      // Ensure required fields
      const deviceToUpdate = {
        ...device,
        tags: device.tags || [],
        registers: device.registers || [],
      };

      const updatedDevice = await updateDeviceApi(device._id, deviceToUpdate);

      // Update local state
      setDevices(prev => prev.map(d => (d._id === device._id ? updatedDevice : d)));

      return updatedDevice;
    } catch (err) {
      console.error('Error updating device:', err);
      throw err instanceof Error ? err : new Error('Failed to update device');
    }
  };

  // Delete a device
  const deleteDevice = async (id: string): Promise<void> => {
    try {
      await deleteDeviceApi(id);

      // Update local state
      setDevices(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      console.error('Error deleting device:', err);
      throw err instanceof Error ? err : new Error('Failed to delete device');
    }
  };

  // Test connection to a device
  const testConnection = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Use our updated testConnectionService that handles auth issues
      const result = await testConnectionService(id);

      // If successful, update the device's lastSeen timestamp in local state
      if (result.success) {
        setDevices(prev =>
          prev.map(d => {
            if (d._id === id) {
              return {
                ...d,
                lastSeen: new Date(),
              };
            }
            return d;
          })
        );
      }

      return result;
    } catch (err) {
      console.error('Error testing device connection:', err);
      throw err instanceof Error ? err : new Error('Failed to test device connection');
    }
  };

  // Read registers from a device
  const readRegisters = async (id: string): Promise<any> => {
    try {
      const result = await readDeviceRegisters(id);

      // Update the device's lastSeen timestamp in local state
      setDevices(prev =>
        prev.map(d => {
          if (d._id === id) {
            return {
              ...d,
              lastSeen: new Date(),
            };
          }
          return d;
        })
      );

      return result;
    } catch (err) {
      console.error('Error reading device registers:', err);
      throw err instanceof Error ? err : new Error('Failed to read device registers');
    }
  };

  return {
    devices,
    loading,
    error,
    refreshDevices: fetchDevices,
    getDevice,
    addDevice,
    updateDevice,
    deleteDevice,
    testConnection,
    readRegisters,
    loadingDevice,
    deviceError,
  };
};
