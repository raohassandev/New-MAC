import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { deviceDataApi } from '../api/endpoints';

// Types for device readings
interface DeviceReading {
  name: string;
  value: any;
  unit?: string;
  registerIndex?: number;
  dataType?: string;
  error?: string;
}

// Types for device data
interface DeviceData {
  deviceId: string;
  deviceName: string;
  timestamp: Date;
  readings: DeviceReading[];
  hasData: boolean;
  stale?: boolean;
}

// Map of device IDs to their data
interface DeviceDataMap {
  [deviceId: string]: DeviceData;
}

// Polling status for a device
interface DevicePollingStatus {
  isPolling: boolean;
  pollingInterval: number;
  lastUpdated: Date | null;
  error: Error | null;
}

// Map of device IDs to their polling status
interface PollingStatusMap {
  [deviceId: string]: DevicePollingStatus;
}

// Context state
interface PollingContextState {
  // Data for all devices
  deviceData: DeviceDataMap;
  // Polling status for all devices
  pollingStatus: PollingStatusMap;
  // Current active devices being polled
  activePollingDevices: string[];
  // Global error state
  error: Error | null;
  // Functions
  startPolling: (deviceId: string, intervalMs?: number) => Promise<boolean>;
  stopPolling: (deviceId: string) => Promise<boolean>;
  refreshDeviceData: (deviceId: string, forceRefresh?: boolean) => Promise<DeviceData | null>;
  isDevicePolling: (deviceId: string) => boolean;
  getDeviceData: (deviceId: string) => DeviceData | null;
}

// Default context state
const defaultContextState: PollingContextState = {
  deviceData: {},
  pollingStatus: {},
  activePollingDevices: [],
  error: null,
  startPolling: async () => false,
  stopPolling: async () => false,
  refreshDeviceData: async () => null,
  isDevicePolling: () => false,
  getDeviceData: () => null,
};

// Create the context
const PollingContext = createContext<PollingContextState>(defaultContextState);

// Provider props
interface PollingProviderProps {
  children: ReactNode;
  defaultPollingInterval?: number;
}

/**
 * Provider component for the PollingContext
 */
export const PollingProvider: React.FC<PollingProviderProps> = ({
  children,
  defaultPollingInterval = 5000,
}) => {
  const [deviceData, setDeviceData] = useState<DeviceDataMap>({});
  const [pollingStatus, setPollingStatus] = useState<PollingStatusMap>({});
  const [activePollingDevices, setActivePollingDevices] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Clean up polling when component unmounts
  useEffect(() => {
    return () => {
      // Stop all active polling
      activePollingDevices.forEach(deviceId => {
        deviceDataApi.stopPolling(deviceId).catch(console.error);
      });
    };
  }, [activePollingDevices]);

  /**
   * Start polling for a device
   */
  const startPolling = async (deviceId: string, intervalMs = defaultPollingInterval): Promise<boolean> => {
    try {
      // Update status to indicate we're starting polling
      setPollingStatus(prev => ({
        ...prev,
        [deviceId]: {
          isPolling: true,
          pollingInterval: intervalMs,
          lastUpdated: null,
          error: null,
        },
      }));

      // Start server-side polling
      const response = await deviceDataApi.startPolling(deviceId, intervalMs);

      if (response.data.success) {
        // Add to active polling devices
        setActivePollingDevices(prev => (prev.includes(deviceId) ? prev : [...prev, deviceId]));

        // Update polling status
        setPollingStatus(prev => ({
          ...prev,
          [deviceId]: {
            isPolling: true,
            pollingInterval: intervalMs,
            lastUpdated: new Date(),
            error: null,
          },
        }));

        // Get initial data
        await refreshDeviceData(deviceId, true);

        // Set up client-side polling for sync
        const pollingInterval = setInterval(() => {
          refreshDeviceData(deviceId, false).catch(err => {
            console.error(`Error refreshing device ${deviceId} data:`, err);
          });
        }, Math.max(1000, intervalMs / 2)); // Client refresh at half the server polling rate

        // Store interval ID for cleanup
        return true;
      } else {
        setPollingStatus(prev => ({
          ...prev,
          [deviceId]: {
            isPolling: false,
            pollingInterval: intervalMs,
            lastUpdated: null,
            error: new Error(response.data.message || 'Failed to start polling'),
          },
        }));
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start polling';
      const errorObj = new Error(errorMessage);
      
      setError(errorObj);
      setPollingStatus(prev => ({
        ...prev,
        [deviceId]: {
          isPolling: false,
          pollingInterval: intervalMs,
          lastUpdated: null,
          error: errorObj,
        },
      }));
      
      return false;
    }
  };

  /**
   * Stop polling for a device
   */
  const stopPolling = async (deviceId: string): Promise<boolean> => {
    try {
      // Call the server to stop polling
      const response = await deviceDataApi.stopPolling(deviceId);

      // Update local state
      if (response.data.success) {
        setActivePollingDevices(prev => prev.filter(id => id !== deviceId));
        
        setPollingStatus(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            isPolling: false,
            error: null,
          },
        }));
        
        return true;
      } else {
        setPollingStatus(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            error: new Error(response.data.message || 'Failed to stop polling'),
          },
        }));
        
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to stop polling';
      const errorObj = new Error(errorMessage);
      
      setError(errorObj);
      setPollingStatus(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          error: errorObj,
        },
      }));
      
      return false;
    }
  };

  /**
   * Refresh data for a specific device
   */
  const refreshDeviceData = async (deviceId: string, forceRefresh = false): Promise<DeviceData | null> => {
    try {
      const response = await deviceDataApi.getCurrentData(deviceId, forceRefresh);
      
      if (response.data.success) {
        const deviceDataResponse = {
          deviceId: response.data.deviceId || deviceId,
          deviceName: response.data.deviceName || 'Unknown Device',
          timestamp: response.data.timestamp ? new Date(response.data.timestamp) : new Date(),
          readings: response.data.readings || [],
          hasData: response.data.hasData || false,
          stale: response.data.stale || false,
        };
        
        // Update device data
        setDeviceData(prev => ({
          ...prev,
          [deviceId]: deviceDataResponse,
        }));
        
        // Update polling status
        setPollingStatus(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            lastUpdated: new Date(),
            error: null,
          },
        }));
        
        return deviceDataResponse;
      } else {
        throw new Error(response.data.message || 'Failed to refresh device data');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to refresh device data';
      const errorObj = new Error(errorMessage);
      
      setError(errorObj);
      setPollingStatus(prev => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          error: errorObj,
        },
      }));
      
      return null;
    }
  };

  /**
   * Check if a device is being polled
   */
  const isDevicePolling = (deviceId: string): boolean => {
    return pollingStatus[deviceId]?.isPolling || false;
  };

  /**
   * Get data for a specific device
   */
  const getDeviceData = (deviceId: string): DeviceData | null => {
    return deviceData[deviceId] || null;
  };

  // Context value
  const contextValue: PollingContextState = {
    deviceData,
    pollingStatus,
    activePollingDevices,
    error,
    startPolling,
    stopPolling,
    refreshDeviceData,
    isDevicePolling,
    getDeviceData,
  };

  return <PollingContext.Provider value={contextValue}>{children}</PollingContext.Provider>;
};

/**
 * Hook to use the polling context
 */
export const usePolling = () => {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePolling must be used within a PollingProvider');
  }
  return context;
};

export default PollingContext;