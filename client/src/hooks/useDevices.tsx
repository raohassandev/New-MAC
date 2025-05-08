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

      // First check if we have a paginated response from MongoDB
      if (response && response.devices) {
        // Transform MongoDB cursor result to proper array with needed properties
        const devicesArray = Array.isArray(response.devices)
          ? response.devices
          : response.devices.toArray
            ? await response.devices.toArray()
            : [];

        // Ensure each device has required fields and filter out templates
        const formattedDevices = devicesArray
          .filter((device: any) => device && !device.isTemplate) // Filter out templates and ensure device exists
          .map((device: any) => ({
            ...device,
            _id: device._id?.toString() || device._id, // Ensure _id is a string
            tags: device.tags || [],
            registers: device.registers || [],
            dataPoints: device.dataPoints || [], // Ensure dataPoints is an array
            lastSeen: device.lastSeen || undefined,
            // Make sure connectionSetting is properly structured
            connectionSetting: device.connectionSetting
              ? {
                  ...device.connectionSetting,
                  connectionType: device.connectionSetting.connectionType || 'tcp',
                  tcp: device.connectionSetting.tcp || {
                    ip: device.ip || '',
                    port: device.port || 502,
                    slaveId: device.slaveId || 1,
                  },
                  rtu: device.connectionSetting.rtu || {
                    serialPort: device.serialPort || '',
                    baudRate: device.baudRate || 9600,
                    dataBits: device.dataBits || 8,
                    stopBits: device.stopBits || 1,
                    parity: device.parity || 'none',
                    slaveId: device.slaveId || 1,
                  },
                }
              : {
                  connectionType: 'tcp',
                  tcp: {
                    ip: device.ip || '',
                    port: device.port || 502,
                    slaveId: device.slaveId || 1,
                  },
                  rtu: {
                    serialPort: device.serialPort || '',
                    baudRate: device.baudRate || 9600,
                    dataBits: device.dataBits || 8,
                    stopBits: device.stopBits || 1,
                    parity: device.parity || 'none',
                    slaveId: device.slaveId || 1,
                  },
                },
            // Ensure description exists
            description: device.description || '',
          }));

        setDevices(formattedDevices);
        return;
      }

      // If response itself is an array (direct device list)
      if (Array.isArray(response)) {
        const formattedDevices = response
          .filter((device: any) => device && !device.isTemplate)
          .map((device: any) => ({
            ...device,
            tags: device.tags || [],
            registers: device.registers || [],
            dataPoints: device.dataPoints || [],
            description: device.description || '',
            connectionSetting: device.connectionSetting || {
              connectionType: 'tcp',
              tcp: { ip: '', port: 502, slaveId: 1 },
              rtu: {
                serialPort: '',
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                slaveId: 1,
              },
            },
          }));

        setDevices(formattedDevices);
        return;
      }

      // If no recognizable format, use sample devices
      console.error('Expected array or pagination object but got:', response);
      setDevices([]); // Set empty array instead of throwing error to avoid crashes
      setError(new Error('Unexpected response format from device service'));
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch devices'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch of devices
  useEffect(() => {
    console.log('[useDevices] Initial fetch starting...');
    fetchDevices().then(() => {
      console.log('[useDevices] Initial fetch completed');
    }).catch(err => {
      console.error('[useDevices] Initial fetch failed with error:', err);
    });
    
    // Return all available devices every 10 seconds for debugging purposes
    const debugInterval = setInterval(() => {
      console.log('[useDevices] Current devices in state:', devices);
    }, 10000);
    
    return () => {
      clearInterval(debugInterval);
    };
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
      console.log('[useDevices] addDevice started with:', device);

      // Ensure required fields
      const deviceToAdd = {
        ...device,
        tags: device.tags || [],
        registers: device.registers || [],
      };

      console.log('[useDevices] Calling addDeviceService with:', deviceToAdd);

      // Use our updated addDeviceService that handles auth issues
      const newDevice = await addDeviceService(deviceToAdd);

      console.log('[useDevices] Device created successfully:', newDevice);

      // Update local state
      setDevices(prev => [...prev, newDevice]);

      return newDevice;
    } catch (err) {
      console.error('[useDevices] Error adding device:', err);
      // Rethrow the original error to preserve the error details
      throw err;
    }
  };

  // Update an existing device
  const updateDevice = async (device: Device): Promise<Device> => {
    try {
      // Ensure required fields and consistent structure
      const deviceToUpdate = {
        ...device,
        tags: device.tags || [],
        registers: device.registers || [],
        dataPoints: device.dataPoints || [],
        // Ensure connectionSetting is properly structured
        connectionSetting: device.connectionSetting
          ? {
              ...device.connectionSetting,
              connectionType: device.connectionSetting.connectionType || 'tcp',
              tcp: device.connectionSetting.tcp || {
                ip: device.ip || '',
                port: typeof device.port === 'number' ? device.port : 502,
                slaveId: typeof device.slaveId === 'number' ? device.slaveId : 1,
              },
              rtu: device.connectionSetting.rtu || {
                serialPort: device.serialPort || '',
                baudRate: typeof device.baudRate === 'number' ? device.baudRate : 9600,
                dataBits: typeof device.dataBits === 'number' ? device.dataBits : 8,
                stopBits: typeof device.stopBits === 'number' ? device.stopBits : 1,
                parity: device.parity || 'none',
                slaveId: typeof device.slaveId === 'number' ? device.slaveId : 1,
              },
            }
          : {
              connectionType: 'tcp',
              tcp: {
                ip: device.ip || '',
                port: typeof device.port === 'number' ? device.port : 502,
                slaveId: typeof device.slaveId === 'number' ? device.slaveId : 1,
              },
              rtu: {
                serialPort: device.serialPort || '',
                baudRate: typeof device.baudRate === 'number' ? device.baudRate : 9600,
                dataBits: typeof device.dataBits === 'number' ? device.dataBits : 8,
                stopBits: typeof device.stopBits === 'number' ? device.stopBits : 1,
                parity: device.parity || 'none',
                slaveId: typeof device.slaveId === 'number' ? device.slaveId : 1,
              },
            },
      };

      // Make the API call
      const updatedDevice = await updateDeviceApi(deviceToUpdate);

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

      console.log(`The result form Hooks ReadRegister  :  ${result}`  );

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
