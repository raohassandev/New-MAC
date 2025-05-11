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

  // Use refs for state to avoid excessive re-renders
  const isPollingRef = useRef<boolean>(false); // Single source of truth for polling state
  const deviceIdRef = useRef(deviceId);
  const deviceDataRef = useRef<DeviceData | null>(null);
  const refreshDataRef = useRef<(forceRefresh?: boolean) => Promise<DeviceData | null>>(() => Promise.resolve(null));
  const refreshIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollingStartTimeRef = useRef<number>(0);
  const lastPollingStopTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const currentRefreshIntervalRef = useRef<number>(refreshInterval);

  // States that trigger UI updates
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'stopped' | 'starting' | 'active' | 'error'>('stopped');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Update deviceIdRef when deviceId changes
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  // Safely update state only if component is still mounted
  const safeSetState = useCallback(<T>(
    setter: React.Dispatch<React.SetStateAction<T>>, 
    value: T
  ) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  /**
   * Refresh device data by calling the current data endpoint
   */
  const refreshData = useCallback(async (forceRefresh = false): Promise<DeviceData | null> => {
    if (!deviceIdRef.current) return null;
    
    // Skip refresh if polling has been stopped (unless forced)
    if (!forceRefresh && !isPollingRef.current) {
      return deviceDataRef.current; // Return current data instead of fetching new
    }
    
    // Rate limiting for non-forced refreshes to avoid too many simultaneous calls
    if (!forceRefresh) {
      const now = Date.now();
      const lastRefreshTime = parseInt(localStorage.getItem(`last_actual_refresh_${deviceIdRef.current}`) || '0');
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // If less than 1 second since last refresh and this isn't forced, skip this refresh
      if (timeSinceLastRefresh < 1000) {
        return deviceDataRef.current; // Return current data instead of fetching new
      }
      
      // Update last refresh time
      localStorage.setItem(`last_actual_refresh_${deviceIdRef.current}`, now.toString());
    }
    
    // If polling was stopped mid-process, abort
    if (!forceRefresh && !isPollingRef.current) {
      return deviceDataRef.current;
    }
    
    safeSetState(setLoading, true);
    safeSetState(setError, null);
    
    try {
      // Double-check polling state again right before making the API call
      if (!forceRefresh && !isPollingRef.current) {
        return deviceDataRef.current;
      }
      
      const response = await deviceDataApi.getCurrentData(deviceIdRef.current, forceRefresh);
      
      // And check one more time after the API call returns
      if (!forceRefresh && !isPollingRef.current) {
        return deviceDataRef.current;
      }
      
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
      
      // Update both state and ref
      deviceDataRef.current = newData;
      safeSetState(setDeviceData, newData);
      safeSetState(setLastUpdated, new Date());
      safeSetState(setError, null);
      
      // Call the onDataReceived callback if provided
      if (onDataReceived && typeof onDataReceived === 'function') {
        onDataReceived(newData);
      }
      
      return newData;
    } catch (err: any) {
      // If polling was stopped during the API call, suppress the error
      if (!forceRefresh && !isPollingRef.current) {
        return deviceDataRef.current;
      }
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch device data';
      const errorObj = new Error(errorMessage);
      safeSetState(setError, errorObj);
      
      // Call the onError callback if provided
      if (onError && typeof onError === 'function') {
        onError(errorObj);
      }
      
      return null;
    } finally {
      safeSetState(setLoading, false);
    }
  }, [onDataReceived, onError, safeSetState]);
  
  // Update refreshDataRef when refreshData changes
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  /**
   * Start server-side polling for the device with improved state handling
   */
  const startPolling = useCallback(async (intervalMs = refreshInterval): Promise<boolean> => {
    if (!deviceIdRef.current || !isMountedRef.current) return false;
    
    // Ensure intervalMs is a number and within reasonable bounds
    let actualIntervalMs = Math.max(1000, Number(intervalMs) || refreshInterval);
    
    // If already polling with the same interval, don't restart
    if (isPollingRef.current && actualIntervalMs === currentRefreshIntervalRef.current) {
      return true;
    }
    
    // Prevent rapid start/stop cycles by checking the last polling start time
    const now = Date.now();
    if (now - lastPollingStartTimeRef.current < 3000 && isPollingRef.current) {
      // If already polling, update the interval reference but don't restart
      currentRefreshIntervalRef.current = actualIntervalMs;
      return true;
    }
    
    // Update the last polling start time
    lastPollingStartTimeRef.current = now;
    
    // Save the new interval
    currentRefreshIntervalRef.current = actualIntervalMs;
    
    // Set status to starting
    safeSetState(setPollingStatus, 'starting');
    
    try {
      // Basic validation for deviceId
      if (!deviceIdRef.current.match(/^[a-f0-9]{24}$/i)) {
        safeSetState(setPollingStatus, 'error');
        safeSetState(setError, new Error(`Invalid device ID format`));
        if (onError) onError(new Error(`Invalid device ID format`));
        return false;
      }
      
      // Clean up any existing client-side interval
      if (refreshIntervalIdRef.current) {
        clearInterval(refreshIntervalIdRef.current);
        refreshIntervalIdRef.current = null;
      }
      
      // Clean up server state first - always do this to ensure we have a clean state
      try {
        if (isPollingRef.current) {
          await deviceDataApi.stopPolling(deviceIdRef.current);
        }
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
      
      // Short delay to allow server state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start polling on server
      const response = await deviceDataApi.startPolling(deviceIdRef.current, actualIntervalMs);
      
      if (response?.data?.success && isMountedRef.current) {
        // Update polling state refs and UI
        isPollingRef.current = true;
        safeSetState(setIsPolling, true);
        safeSetState(setPollingStatus, 'active');
        
        // Get initial data
        await refreshDataRef.current(true);
        
        // Set up client-side refresh
        if (isMountedRef.current) {
          const intervalId = setInterval(() => {
            if (!isPollingRef.current || !isMountedRef.current) {
              if (refreshIntervalIdRef.current) {
                clearInterval(refreshIntervalIdRef.current);
                refreshIntervalIdRef.current = null;
              }
              return;
            }
            
            refreshDataRef.current(false).catch(() => {
              // Silent catch - errors are handled in refreshData
            });
          }, Math.max(3000, actualIntervalMs)); // Use a slightly longer interval for client-side polling
          
          refreshIntervalIdRef.current = intervalId;
        }
        
        return true;
      } else {
        // Failed to start polling
        isPollingRef.current = false;
        safeSetState(setIsPolling, false);
        safeSetState(setPollingStatus, 'error');
        safeSetState(setError, new Error(response?.data?.message || 'Failed to start polling'));
        
        return false;
      }
    } catch (err: any) {
      // Handle error in start polling
      isPollingRef.current = false;
      safeSetState(setIsPolling, false);
      safeSetState(setPollingStatus, 'error');
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start polling';
      safeSetState(setError, new Error(errorMessage));
      
      if (onError) onError(new Error(errorMessage));
      return false;
    }
  }, [refreshInterval, onError, safeSetState]);

  /**
   * Stop server-side polling for the device with improved state handling
   */
  const stopPolling = useCallback(async (): Promise<boolean> => {
    if (!deviceIdRef.current || !isMountedRef.current) return false;
    
    // Prevent rapid start/stop cycles
    const now = Date.now();
    if (now - lastPollingStopTimeRef.current < 5000) {
      // Pretend success but don't change state
      return true; 
    }
    
    // Update last stop time
    lastPollingStopTimeRef.current = now;
    
    // If already stopped, don't stop again
    if (!isPollingRef.current) {
      return true;
    }
    
    try {
      // Update ref first (source of truth)
      isPollingRef.current = false;
      // Then update state (for UI)
      safeSetState(setIsPolling, false);
      safeSetState(setPollingStatus, 'stopped');
      
      // Clear the client-side polling interval
      if (refreshIntervalIdRef.current) {
        clearInterval(refreshIntervalIdRef.current);
        refreshIntervalIdRef.current = null;
      }
      
      // Stop server-side polling
      const response = await deviceDataApi.stopPolling(deviceIdRef.current);
      
      // Clear throttling data
      localStorage.removeItem(`last_refresh_call_${deviceIdRef.current}`);
      localStorage.removeItem(`last_actual_refresh_${deviceIdRef.current}`);
      
      return response?.data?.success || false;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to stop polling';
      safeSetState(setError, new Error(errorMessage));
      
      if (onError) onError(new Error(errorMessage));
      return false;
    }
  }, [onError, safeSetState]);

  // Auto-start polling if enabled
  useEffect(() => {
    if (autoStart && deviceId) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startPolling(refreshInterval).catch(() => {
            // Error handling is done in startPolling
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [deviceId, autoStart, refreshInterval, startPolling]);
  
  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      // Clean up interval
      if (refreshIntervalIdRef.current) {
        clearInterval(refreshIntervalIdRef.current);
        refreshIntervalIdRef.current = null;
      }
      
      // Clean up server-side polling if active
      if (isPollingRef.current && deviceIdRef.current) {
        deviceDataApi.stopPolling(deviceIdRef.current).catch(() => {
          // Ignore cleanup errors
        });
      }
      
      // Reset state
      isPollingRef.current = false;
    };
  }, []);

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