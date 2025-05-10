import { useState, useEffect, useCallback, useRef } from 'react';
import { deviceDataApi } from '../api/endpoints';

interface DeviceReading {
  name: string;
  value: any;
  unit?: string;
  registerIndex?: number;
  dataType?: string;
  error?: string;
}

interface DeviceData {
  deviceId: string;
  deviceName: string;
  timestamp: Date;
  readings: DeviceReading[];
  hasData: boolean;
  stale?: boolean;
  success: boolean;
  message?: string;
}

interface UseDevicePollingOptions {
  autoStart?: boolean;
  refreshInterval?: number;
  onDataReceived?: (data: DeviceData) => void;
  onError?: (error: Error) => void;
}

interface UseDevicePollingReturn {
  deviceData: DeviceData | null;
  isPolling: boolean;
  loading: boolean;
  error: Error | null;
  startPolling: (intervalMs?: number) => Promise<boolean>;
  stopPolling: () => Promise<boolean>;
  refreshData: (forceRefresh?: boolean) => Promise<DeviceData | null>;
  pollingStatus: 'stopped' | 'starting' | 'active' | 'error';
  lastUpdated: Date | null;
}

/**
 * Hook for managing device polling and data fetching
 * 
 * @param deviceId The ID of the device to poll
 * @param options Configuration options for polling
 * @returns Object with device data and polling control functions
 */
export function useDevicePolling(
  deviceId: string,
  options: UseDevicePollingOptions = {}
): UseDevicePollingReturn {
  const {
    autoStart = false,
    refreshInterval = 5000,
    onDataReceived,
    onError
  } = options;

  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'stopped' | 'starting' | 'active' | 'error'>('stopped');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Use refs to access latest values in callbacks without dependencies
  const deviceIdRef = useRef(deviceId);
  const refreshDataRef = useRef<(forceRefresh?: boolean) => Promise<DeviceData | null>>(() => Promise.resolve(null));
  
  // Update refs when values change
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  /**
   * Refresh device data by calling the current data endpoint
   */
  const refreshData = useCallback(async (forceRefresh = false): Promise<DeviceData | null> => {
    if (!deviceIdRef.current) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await deviceDataApi.getCurrentData(deviceIdRef.current, forceRefresh);
      
      const responseData = response.data;
      const newData: DeviceData = {
        deviceId: responseData.deviceId || deviceIdRef.current,
        deviceName: responseData.deviceName || 'Unknown Device',
        timestamp: responseData.timestamp ? new Date(responseData.timestamp) : new Date(),
        readings: responseData.readings || [],
        hasData: responseData.hasData || false,
        stale: responseData.stale || false,
        success: responseData.success || false,
        message: responseData.message
      };
      
      setDeviceData(newData);
      setLastUpdated(new Date());
      setError(null);
      
      // Call the onDataReceived callback if provided
      if (onDataReceived && typeof onDataReceived === 'function') {
        onDataReceived(newData);
      }
      
      return newData;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch device data';
      const errorObj = new Error(errorMessage);
      setError(errorObj);
      
      // Call the onError callback if provided
      if (onError && typeof onError === 'function') {
        onError(errorObj);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [onDataReceived, onError]);
  
  // Update refreshDataRef when refreshData changes
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  /**
   * Start server-side polling for the device
   */
  const startPolling = useCallback(async (intervalMs = refreshInterval): Promise<boolean> => {
    if (!deviceIdRef.current) return false;
    
    setPollingStatus('starting');
    
    try {
      // Check if device ID looks valid before proceeding
      if (!deviceIdRef.current || deviceIdRef.current.length < 12) {
        console.error(`[useDevicePolling] Device ID appears invalid (too short): ${deviceIdRef.current}`);
        setPollingStatus('error');
        const errorObj = new Error(`Invalid device ID: ID is missing or too short`);
        setError(errorObj);
        
        if (onError && typeof onError === 'function') {
          onError(errorObj);
        }
        
        return false;
      }
      
      // Try to validate the device ID with the server
      try {
        console.log(`[useDevicePolling] Validating device ID: ${deviceIdRef.current}`);
        
        // First try the device-utils path
        try {
          const validateResponse = await fetch(`/client/api/device-utils/validate/${deviceIdRef.current}`);
          if (validateResponse.ok) {
            const validateData = await validateResponse.json();
            
            if (!validateData.isValid) {
              console.error(`[useDevicePolling] Invalid device ID: ${deviceIdRef.current}`, validateData);
              setPollingStatus('error');
              const errorObj = new Error(`Invalid device ID: ${validateData.reason || 'Device not found'}`);
              setError(errorObj);
              
              if (onError && typeof onError === 'function') {
                onError(errorObj);
              }
              
              return false;
            }
            
            console.log(`[useDevicePolling] Device ID validated: ${deviceIdRef.current}`);
          } else {
            // If the endpoint doesn't exist or returns an error, try an alternative approach
            console.warn(`[useDevicePolling] Validation endpoint not available, trying direct device check`);
            
            // Try to get the device directly as a fallback
            const deviceResponse = await fetch(`/client/api/devices/${deviceIdRef.current}`);
            if (!deviceResponse.ok) {
              console.error(`[useDevicePolling] Device not found or inaccessible: ${deviceIdRef.current}`);
              setPollingStatus('error');
              const errorObj = new Error(`Device not found or inaccessible: ${deviceIdRef.current}`);
              setError(errorObj);
              
              if (onError && typeof onError === 'function') {
                onError(errorObj);
              }
              
              return false;
            }
            
            // If we made it here, the device exists
            console.log(`[useDevicePolling] Device exists (alternative check): ${deviceIdRef.current}`);
          }
        } catch (err) {
          // If both validation attempts fail, log and continue
          console.warn(`[useDevicePolling] Device validation failed, proceeding anyway:`, err);
        }
      } catch (validateErr) {
        // If validation completely fails, log and continue
        console.warn(`[useDevicePolling] Device validation failed, proceeding anyway:`, validateErr);
      }
      
      // Start polling
      console.log(`[useDevicePolling] Starting polling for device: ${deviceIdRef.current}`);
      const response = await deviceDataApi.startPolling(deviceIdRef.current, intervalMs);
      
      if (response.data.success) {
        setIsPolling(true);
        setPollingStatus('active');
        
        // Get initial data
        await refreshDataRef.current(true);
        
        // Set up client-side refresh interval
        const intervalId = setInterval(() => {
          refreshDataRef.current(false).catch(() => {
            // Silent catch - errors are handled in refreshData
          });
        }, Math.max(1000, intervalMs / 2));  // Client refresh at half the server polling rate
        
        console.log(`[useDevicePolling] Polling started successfully for device: ${deviceIdRef.current}`);
        
        // Clean up on unmount
        return () => {
          clearInterval(intervalId);
          // Don't stop server polling on unmount - that needs to be explicit
        };
      } else {
        console.error(`[useDevicePolling] Failed to start polling:`, response.data);
        setPollingStatus('error');
        setError(new Error(response.data.message || 'Failed to start polling'));
        return false;
      }
      
      return true;
    } catch (err: any) {
      console.error(`[useDevicePolling] Error starting polling:`, err);
      setPollingStatus('error');
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start polling';
      const errorObj = new Error(errorMessage);
      setError(errorObj);
      
      if (onError && typeof onError === 'function') {
        onError(errorObj);
      }
      
      return false;
    }
  }, [refreshInterval, onError]);

  /**
   * Stop server-side polling for the device
   */
  const stopPolling = useCallback(async (): Promise<boolean> => {
    if (!deviceIdRef.current) return false;
    
    try {
      const response = await deviceDataApi.stopPolling(deviceIdRef.current);
      setIsPolling(false);
      setPollingStatus('stopped');
      return response.data.success || false;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to stop polling';
      const errorObj = new Error(errorMessage);
      setError(errorObj);
      
      if (onError && typeof onError === 'function') {
        onError(errorObj);
      }
      
      return false;
    }
  }, [onError]);

  // Auto-start polling if enabled
  useEffect(() => {
    if (autoStart && deviceId) {
      startPolling(refreshInterval).catch(console.error);
    }
    
    // Clean up when the component unmounts or deviceId changes
    return () => {
      if (isPolling && deviceId) {
        stopPolling().catch(console.error);
      }
    };
  }, [deviceId, autoStart, refreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    deviceData,
    isPolling,
    loading,
    error,
    startPolling,
    stopPolling,
    refreshData,
    pollingStatus,
    lastUpdated
  };
}

export default useDevicePolling;