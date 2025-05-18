import { useState, useEffect, useCallback } from 'react';
import {
  getDeviceDrivers,
  getDeviceDriverById,
  createDeviceDriver,
  updateDeviceDriver,
  deleteDeviceDriver,
  getDeviceTypes,
  createDeviceType,
} from '../services/deviceDrivers';
import {
  DeviceDriver,
  DeviceType,
  DeviceDriverFormData,
} from '../types/deviceDriver.types';

export const useDeviceDrivers = () => {
  const [deviceDrivers, setDeviceDrivers] = useState<DeviceDriver[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load device drivers
  const loadDeviceDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDeviceDrivers();
      setDeviceDrivers(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load device types
  const loadDeviceTypes = useCallback(async () => {
    try {
      const data = await getDeviceTypes();
      setDeviceTypes(data);
    } catch (err) {
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadDeviceDrivers();
    loadDeviceTypes();
  }, [loadDeviceDrivers, loadDeviceTypes]);

  // Add a device driver
  const addDeviceDriver = useCallback(async (deviceDriverData: DeviceDriverFormData) => {
    try {
      setLoading(true);
      setError(null);

      // If it's a new device type, handle that
      if (deviceDriverData.deviceType === 'new' && deviceDriverData.newDeviceType) {
        const newDeviceType = await createDeviceType({
          name: deviceDriverData.newDeviceType.name,
          description: deviceDriverData.newDeviceType.description,
          category: deviceDriverData.newDeviceType.category,
        });

        // Update the device driver with the new device type
        deviceDriverData.deviceType = newDeviceType.name;

        // Update the device types list
        setDeviceTypes(prev => [...prev, newDeviceType]);
      }

      // Ensure device driver has isDeviceDriver flag
      const deviceDriverToCreate: DeviceDriverFormData = {
        ...deviceDriverData,
        isDeviceDriver: true,
      };

      const newDeviceDriver = await createDeviceDriver(deviceDriverToCreate);
      setDeviceDrivers(prev => [...prev, newDeviceDriver]);
      return newDeviceDriver;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a device driver by ID
  const getDeviceDriver = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const deviceDriver = await getDeviceDriverById(id);
      return deviceDriver;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a device driver
  const updateDeviceDriverById = useCallback(
    async (id: string, deviceDriverData: Partial<DeviceDriver>) => {
      try {
        setLoading(true);
        setError(null);
        const updatedDeviceDriver = await updateDeviceDriver(id, deviceDriverData);
        setDeviceDrivers(prev =>
          prev.map(deviceDriver => (deviceDriver._id === id ? updatedDeviceDriver : deviceDriver))
        );
        return updatedDeviceDriver;
      } catch (err) {
        setError(err as Error);
          throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete a device driver
  const removeDeviceDriver = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteDeviceDriver(id);
      setDeviceDrivers(prev => prev.filter(deviceDriver => deviceDriver._id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deviceDrivers,
    deviceTypes,
    loading,
    error,
    refreshDeviceDrivers: loadDeviceDrivers,
    refreshDeviceTypes: loadDeviceTypes,
    addDeviceDriver,
    getDeviceDriver,
    updateDeviceDriver: updateDeviceDriverById,
    deleteDeviceDriver: removeDeviceDriver,
  };
};
