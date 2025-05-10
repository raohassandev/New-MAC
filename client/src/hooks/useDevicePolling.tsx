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
    
    // Skip refresh if polling has been stopped (unless forced)
    if (!forceRefresh && !isPollingRef.current) {
      console.log(`[useDevicePolling] Skipping refresh because polling is inactive`);
      return deviceData; // Return current data instead of fetching new
    }
    
    // Rate limiting for non-forced refreshes to avoid too many simultaneous calls
    if (!forceRefresh) {
      const now = Date.now();
      const lastRefreshTime = parseInt(localStorage.getItem(`last_actual_refresh_${deviceIdRef.current}`) || '0');
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // If less than 1 second since last refresh and this isn't forced, skip this refresh
      if (timeSinceLastRefresh < 1000) {
        console.log(`[useDevicePolling] Skipping refresh, last refresh was ${timeSinceLastRefresh}ms ago`);
        return deviceData; // Return current data instead of fetching new
      }
      
      // Update last refresh time
      localStorage.setItem(`last_actual_refresh_${deviceIdRef.current}`, now.toString());
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[useDevicePolling] Refreshing data for device ${deviceIdRef.current}${forceRefresh ? ' (forced)' : ''}`);
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
  }, [onDataReceived, onError, deviceData]);
  
  // Update refreshDataRef when refreshData changes
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  /**
   * Start server-side polling for the device
   */
  // Create a ref to track the current polling state
  const isPollingRef = useRef<boolean>(false);
  
  // Track when we started polling to prevent double calls
  const lastPollingStartTimeRef = useRef<number>(0);
  
  // Update the ref when the state changes
  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);
  
  const startPolling = useCallback(async (intervalMs = refreshInterval): Promise<boolean> => {
    if (!deviceIdRef.current) return false;
    
    // Prevent rapid start/stop cycles by checking the last polling start time
    const now = Date.now();
    if (now - lastPollingStartTimeRef.current < 2000) {
      console.log(`[useDevicePolling] Debouncing startPolling call - last call was ${now - lastPollingStartTimeRef.current}ms ago`);
      return true; // Pretend success to prevent more calls
    }
    
    // Update the last polling start time
    lastPollingStartTimeRef.current = now;
    
    // If already polling, don't start again
    if (isPollingRef.current) {
      console.log(`[useDevicePolling] Already polling, skipping redundant start`);
      return true;
    }
    
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
      
      // Simplified validation - just make sure deviceId is a valid format
      if (!deviceIdRef.current.match(/^[a-f0-9]{24}$/i)) {
        console.error(`[useDevicePolling] Device ID has invalid format: ${deviceIdRef.current}`);
        setPollingStatus('error');
        const errorObj = new Error(`Invalid device ID format`);
        setError(errorObj);
        
        if (onError && typeof onError === 'function') {
          onError(errorObj);
        }
        
        return false;
      }
      
      // Start polling with simplified approach
      console.log(`[useDevicePolling] Starting polling for device: ${deviceIdRef.current}`);
      const response = await deviceDataApi.startPolling(deviceIdRef.current, intervalMs);
      
      console.log(`[useDevicePolling] Start polling response:`, response.data);
      
      if (response && response.data && response.data.success) {
        // Update both the state and the ref
        setIsPolling(true);
        isPollingRef.current = true;
        setPollingStatus('active');
        
        // Get initial data
        await refreshDataRef.current(true);
        
        // Clear any existing interval first
        if (refreshIntervalIdRef.current) {
          clearInterval(refreshIntervalIdRef.current);
          refreshIntervalIdRef.current = null;
        }
        
        // Set up client-side refresh interval - less frequent to avoid multiple calls
        const intervalId = setInterval(() => {
          // Use the ref to get the current polling state
          if (!isPollingRef.current) {
            console.log(`[useDevicePolling] Polling was stopped, skipping refresh and clearing interval`);
            
            // Clear the interval if still running but polling is stopped
            if (refreshIntervalIdRef.current) {
              clearInterval(refreshIntervalIdRef.current);
              refreshIntervalIdRef.current = null;
            }
            
            return;
          }
          
          // If we have multiple calls in a short time, skip this one
          const now = Date.now();
          const lastCallTimeStr = localStorage.getItem(`last_refresh_call_${deviceIdRef.current}`);
          const lastCallTime = lastCallTimeStr ? parseInt(lastCallTimeStr) : 0;
          
          if (now - lastCallTime > Math.max(1000, intervalMs - 500)) {
            localStorage.setItem(`last_refresh_call_${deviceIdRef.current}`, now.toString());
            console.log(`[useDevicePolling] Client-side refresh at ${new Date().toISOString()}`);
            
            refreshDataRef.current(false).catch(() => {
              // Silent catch - errors are handled in refreshData
            });
          } else {
            console.log(`[useDevicePolling] Skipping redundant refresh, last call was ${now - lastCallTime}ms ago`);
          }
        }, Math.max(2000, intervalMs));  // Client refresh at same rate as server but with minimum 2s interval
        
        // Store the interval ID in our ref so we can clear it later
        refreshIntervalIdRef.current = intervalId;
        
        console.log(`[useDevicePolling] Polling started successfully for device: ${deviceIdRef.current}`);
        
        // Return true to indicate success
        return true;
      } else {
        console.error(`[useDevicePolling] Failed to start polling:`, response?.data || 'No response data');
        setPollingStatus('error');
        setError(new Error(response?.data?.message || 'Failed to start polling'));
        return false;
      }
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

  // Keep track of the interval ID
  const refreshIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Stop server-side polling for the device
   */
  // Track when we stopped polling to prevent double calls
  const lastPollingStopTimeRef = useRef<number>(0);
  
  const stopPolling = useCallback(async (): Promise<boolean> => {
    if (!deviceIdRef.current) return false;
    
    // Prevent rapid start/stop cycles by checking the last polling stop time
    const now = Date.now();
    if (now - lastPollingStopTimeRef.current < 2000) {
      console.log(`[useDevicePolling] Debouncing stopPolling call - last call was ${now - lastPollingStopTimeRef.current}ms ago`);
      return true; // Pretend success to prevent more calls
    }
    
    // Update the last polling stop time
    lastPollingStopTimeRef.current = now;
    
    // If already stopped, don't stop again
    if (!isPollingRef.current) {
      console.log(`[useDevicePolling] Already stopped, skipping redundant stop`);
      return true;
    }
    
    try {
      // First update both the state and ref to prevent any pending refreshes
      setIsPolling(false);
      isPollingRef.current = false;
      setPollingStatus('stopped');
      
      // Clear the client-side polling interval immediately
      if (refreshIntervalIdRef.current) {
        clearInterval(refreshIntervalIdRef.current);
        refreshIntervalIdRef.current = null;
        console.log(`[useDevicePolling] Cleared client-side polling interval`);
      }
      
      // Make API request to stop server-side polling
      const response = await deviceDataApi.stopPolling(deviceIdRef.current);
      console.log(`[useDevicePolling] Stop polling response:`, response.data);
      
      // Clear the localStorage entry to reset the throttling
      localStorage.removeItem(`last_refresh_call_${deviceIdRef.current}`);
      localStorage.removeItem(`last_actual_refresh_${deviceIdRef.current}`);
      
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

  // Track component mounting to prevent cleanup issues
  const isMounted = useRef(false);
  
  // Auto-start polling if enabled
  useEffect(() => {
    isMounted.current = true;
    
    if (autoStart && deviceId) {
      // Use a slight delay to avoid race conditions on initial mount
      const timer = setTimeout(() => {
        if (isMounted.current) {
          startPolling(refreshInterval).catch(console.error);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [deviceId, autoStart, refreshInterval, startPolling]);
  
  // Handle cleanup on unmount or deviceId change
  useEffect(() => {
    // Only run cleanup on unmount, not on every deviceId change
    return () => {
      // Mark component as unmounted to prevent further operations
      isMounted.current = false;
      
      // Always clean up the interval and state on unmount, regardless of isPolling state
      // This ensures we don't leave any dangling intervals
      if (refreshIntervalIdRef.current) {
        clearInterval(refreshIntervalIdRef.current);
        refreshIntervalIdRef.current = null;
        console.log(`[useDevicePolling] Cleanup: Cleared interval on unmount`);
      }
      
      // If we're polling, also stop the server-side polling
      if (isPollingRef.current && deviceIdRef.current) {
        console.log(`[useDevicePolling] Cleanup: Stopping server-side polling on unmount`);
        
        // We don't need to use the stopPolling function with its debouncing for cleanup
        // Instead, make a direct API call
        try {
          deviceDataApi.stopPolling(deviceIdRef.current).catch(err => {
            console.error(`[useDevicePolling] Error in direct API call during cleanup:`, err);
          });
        } catch (err) {
          console.error(`[useDevicePolling] Error stopping polling during cleanup:`, err);
        }
      }
      
      // Reset state refs for safety
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