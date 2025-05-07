import React, { ReactNode, createContext, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../services/api';
import { Device } from '../types/device.types';

// Define the context type with all the functionality we need
interface DeviceContextType {
  devices: Device[];
  loading: boolean;
  error: Error | null;
  fetchDevices: () => Promise<void>;
  addDevice: (device: Omit<Device, '_id'>) => Promise<void>;
  updateDevice: (device: Device) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<{ success: boolean; message: string }>;
  readRegisters: (id: string) => Promise<any>;
  filteredDevices: Device[];
  setFilterQuery: (query: string) => void;
  setStatusFilter: (status: 'all' | 'online' | 'offline') => void;
  getFilteredDeviceCount: () => {
    total: number;
    online: number;
    offline: number;
  };
  selectedDevices: string[];
  selectDevice: (id: string) => void;
  deselectDevice: (id: string) => void;
  selectAllDevices: () => void;
  deselectAllDevices: () => void;
  bulkEnableDevices: () => Promise<void>;
  bulkDisableDevices: () => Promise<void>;
  bulkDeleteDevices: () => Promise<void>;
}

export const DeviceContext = createContext<DeviceContextType>({
  devices: [],
  loading: false,
  error: null,
  fetchDevices: async () => {},
  addDevice: async () => {},
  updateDevice: async () => {},
  deleteDevice: async () => {},
  testConnection: async () => ({ success: false, message: '' }),
  readRegisters: async () => ({}),
  filteredDevices: [],
  setFilterQuery: () => {},
  setStatusFilter: () => {},
  getFilteredDeviceCount: () => ({ total: 0, online: 0, offline: 0 }),
  selectedDevices: [],
  selectDevice: () => {},
  deselectDevice: () => {},
  selectAllDevices: () => {},
  deselectAllDevices: () => {},
  bulkEnableDevices: async () => {},
  bulkDisableDevices: async () => {},
  bulkDeleteDevices: async () => {},
});

interface DeviceProviderProps {
  children: ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  // State for devices and loading
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // State for filtering
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);

  // State for selected devices (for bulk operations)
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // Fetch all devices
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the correct endpoint for getting devices
      const response = await API.get('/client/api/devices');

      // Process the response data to ensure all required fields
      const formattedDevices = Array.isArray(response.data)
        ? response.data.map((device: Device) => ({
            ...device,
            tags: device.tags || [],
            registers: device.registers || [],
            lastSeen: device.enabled ? device.lastSeen || new Date() : undefined,
          }))
        : response.data.devices
          ? response.data.devices.map((device: Device) => ({
              ...device,
              tags: device.tags || [],
              registers: device.registers || [],
              lastSeen: device.enabled ? device.lastSeen || new Date() : undefined,
            }))
          : [];

      setDevices(formattedDevices);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch devices'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters whenever devices, filterQuery, or statusFilter changes
  useEffect(() => {
    let result = [...devices];

    // Apply search filter
    if (filterQuery) {
      const query = filterQuery.toLowerCase();
      result = result.filter(
        device =>
          device.name.toLowerCase().includes(query) ||
          device.ip?.toLowerCase().includes(query) ||
          device.make?.toLowerCase().includes(query) ||
          device.model?.toLowerCase().includes(query) ||
          device.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(device =>
        statusFilter === 'online' ? device.enabled : !device.enabled
      );
    }

    setFilteredDevices(result);
  }, [devices, filterQuery, statusFilter]);

  // Initial fetch
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Function to add a new device
  const addDevice = async (device: Omit<Device, '_id'>) => {
    try {
      // Ensure required fields
      const deviceToAdd = {
        ...device,
        tags: device.tags || [],
        registers: device.registers || [],
      };

      // Use the correct endpoint for physical devices
      const response = await API.post('/client/api/devices', deviceToAdd);

      // Update local state with new device
      setDevices(prevDevices => [...prevDevices, response.data]);

      toast.success(`Device "${response.data.name}" added successfully`);
      return response.data;
    } catch (err) {
      console.error('Error adding device:', err);
      toast.error('Failed to add device');
      throw err instanceof Error ? err : new Error('Failed to add device');
    }
  };

  // Function to update a device
  const updateDevice = async (device: Device) => {
    try {
      // Ensure required fields
      const deviceToUpdate = {
        ...device,
        tags: device.tags || [],
        registers: device.registers || [],
      };

      // Use the correct endpoint for updating physical devices
      const response = await API.put(`/client/api/devices/${device._id}`, deviceToUpdate);

      // Update local state
      setDevices(prev => prev.map(d => (d._id === device._id ? response.data : d)));

      toast.success(`Device "${response.data.name}" updated successfully`);
      return response.data;
    } catch (err) {
      console.error('Error updating device:', err);
      toast.error('Failed to update device');
      throw err instanceof Error ? err : new Error('Failed to update device');
    }
  };

  // Function to delete a device
  const deleteDevice = async (id: string) => {
    try {
      // Use the correct endpoint for deleting physical devices
      await API.delete(`/client/api/devices/${id}`);

      // Update local state
      setDevices(prev => prev.filter(d => d._id !== id));

      // Also remove from selected devices if present
      setSelectedDevices(prev => prev.filter(deviceId => deviceId !== id));

      toast.success('Device deleted successfully');
    } catch (err) {
      console.error('Error deleting device:', err);
      toast.error('Failed to delete device');
      throw err instanceof Error ? err : new Error('Failed to delete device');
    }
  };

  // Function to test device connection
  const testConnection = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await API.post(`/client/api/devices/${id}/test`);

      // If successful, update the device's lastSeen timestamp in local state
      if (response.data.success) {
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

        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed');
      }

      return response.data;
    } catch (err) {
      console.error('Error testing device connection:', err);
      toast.error('Connection test failed');
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to test device connection',
      };
    }
  };

  // Function to read registers from a device
  const readRegisters = async (id: string): Promise<any> => {
    try {
      const response = await API.get(`/client/api/devices/${id}/read`);

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

      return response.data;
    } catch (err) {
      console.error('Error reading device registers:', err);
      toast.error('Failed to read device registers');
      throw err instanceof Error ? err : new Error('Failed to read device registers');
    }
  };

  // Get filtered device count statistics
  const getFilteredDeviceCount = () => {
    const total = filteredDevices.length;
    const online = filteredDevices.filter(device => device.enabled).length;
    const offline = total - online;

    return { total, online, offline };
  };

  // Selection functions
  const selectDevice = (id: string) => {
    setSelectedDevices(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  const deselectDevice = (id: string) => {
    setSelectedDevices(prev => prev.filter(deviceId => deviceId !== id));
  };

  const selectAllDevices = () => {
    setSelectedDevices(filteredDevices.map(device => device._id));
  };

  const deselectAllDevices = () => {
    setSelectedDevices([]);
  };

  // Bulk operations
  const bulkEnableDevices = async () => {
    if (selectedDevices.length === 0) {
      toast.info('No devices selected');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const deviceId of selectedDevices) {
      try {
        const device = devices.find(d => d._id === deviceId);
        if (device && !device.enabled) {
          await updateDevice({ ...device, enabled: true });
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Enabled ${successCount} devices successfully`);
    }

    if (failCount > 0) {
      toast.error(`Failed to enable ${failCount} devices`);
    }

    // Refresh device list
    await fetchDevices();
  };

  const bulkDisableDevices = async () => {
    if (selectedDevices.length === 0) {
      toast.info('No devices selected');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const deviceId of selectedDevices) {
      try {
        const device = devices.find(d => d._id === deviceId);
        if (device && device.enabled) {
          await updateDevice({ ...device, enabled: false });
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Disabled ${successCount} devices successfully`);
    }

    if (failCount > 0) {
      toast.error(`Failed to disable ${failCount} devices`);
    }

    // Refresh device list
    await fetchDevices();
  };

  const bulkDeleteDevices = async () => {
    if (selectedDevices.length === 0) {
      toast.info('No devices selected');
      return;
    }

    const confirmResult = confirm(
      `Are you sure you want to delete ${selectedDevices.length} devices? This action cannot be undone.`
    );
    if (!confirmResult) return;

    let successCount = 0;
    let failCount = 0;

    for (const deviceId of selectedDevices) {
      try {
        await deleteDevice(deviceId);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} devices successfully`);
    }

    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} devices`);
    }

    // Clear selection
    setSelectedDevices([]);

    // Refresh device list
    await fetchDevices();
  };

  return (
    <DeviceContext.Provider
      value={{
        devices,
        loading,
        error,
        fetchDevices,
        addDevice,
        updateDevice,
        deleteDevice,
        testConnection,
        readRegisters,
        filteredDevices,
        setFilterQuery,
        setStatusFilter,
        getFilteredDeviceCount,
        selectedDevices,
        selectDevice,
        deselectDevice,
        selectAllDevices,
        deselectAllDevices,
        bulkEnableDevices,
        bulkDisableDevices,
        bulkDeleteDevices,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

// Custom hook to use the DeviceContext
export const useDevices = () => {
  const context = React.useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
};
