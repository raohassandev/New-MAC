import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';

// Define typed hooks to avoid circular dependencies
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
const useAppDispatch = () => useDispatch<AppDispatch>();
import { 
  // Import selectors directly
  selectDeviceRefreshInterval,
  selectServerPollInterval,
  selectRealTimeUpdatesEnabled,
  selectDevicePollingEnabled,
  selectIsConfigurationDirty,
  selectDebugModeEnabled,
  
  // Import actions
  updateConfig,
  saveConfiguration,
  fetchConfiguration
} from '../redux/features/siteConfiguration';

/**
 * ConfigurationUsageExample
 * 
 * This component demonstrates how to use the siteConfiguration feature in a React component.
 * It shows how to:
 * 1. Access configuration values from Redux state
 * 2. Update configuration values
 * 3. Set up effects that respond to configuration changes
 * 4. Save configuration changes to persistence
 */
const ConfigurationUsageExample: React.FC = () => {
  // Step 1: Access configuration using selectors
  // ---------------------------------------------
  // Use typed selectors to access specific configuration values
  const deviceRefreshInterval = useAppSelector(selectDeviceRefreshInterval);
  const serverPollInterval = useAppSelector(selectServerPollInterval);
  const realTimeUpdatesEnabled = useAppSelector(selectRealTimeUpdatesEnabled);
  const devicePollingEnabled = useAppSelector(selectDevicePollingEnabled);
  const isConfigurationDirty = useAppSelector(selectIsConfigurationDirty);
  const debugModeEnabled = useAppSelector(selectDebugModeEnabled);
  
  const dispatch = useAppDispatch();
  
  // Step 2: Local state for device data
  // ----------------------------------
  // This would normally be your component's data that's affected by configuration
  const [deviceData, setDeviceData] = useState<Array<{ name: string; value: number }>>([
    { name: 'Temperature', value: 25.5 },
    { name: 'Humidity', value: 65 },
    { name: 'Pressure', value: 1013 }
  ]);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState<boolean>(false);
  
  // Step 3: Simulate fetching device data
  // ------------------------------------
  // This function simulates how you would use the configuration values in a real API call
  const fetchDeviceData = useCallback(() => {
    if (debugModeEnabled) {
      console.log(`Fetching device data with timeout: ${serverPollInterval}ms`);
    }
    
    // Simulate API call that uses the serverPollInterval as timeout
    return new Promise<Array<{ name: string; value: number }>>((resolve) => {
      setTimeout(() => {
        // Generate random updated values to simulate device readings
        const updatedData = [
          { name: 'Temperature', value: 25 + Math.random() * 2 },
          { name: 'Humidity', value: 60 + Math.random() * 10 },
          { name: 'Pressure', value: 1010 + Math.random() * 10 }
        ];
        
        resolve(updatedData);
      }, 500); // Simulated fetch time (actual API would use serverPollInterval for timeout)
    });
  }, [serverPollInterval, debugModeEnabled]);
  
  // Step 4: Setup polling effect based on configuration
  // -------------------------------------------------
  // This effect demonstrates how to use the configuration values to control component behavior
  useEffect(() => {
    // Only set up polling if both global polling and real-time updates are enabled
    if (devicePollingEnabled && realTimeUpdatesEnabled) {
      setIsPolling(true);
      
      // Set up interval for device data refresh
      const intervalId = setInterval(async () => {
        const newData = await fetchDeviceData();
        setDeviceData(newData);
        setLastRefreshTime(new Date());
        
        if (debugModeEnabled) {
          console.log(`Data refreshed at interval: ${deviceRefreshInterval}ms`);
        }
      }, deviceRefreshInterval); // Use the configured interval
      
      if (debugModeEnabled) {
        console.log(`Polling started with interval: ${deviceRefreshInterval}ms`);
      }
      
      // Clean up interval on unmount or when configuration changes
      return () => {
        clearInterval(intervalId);
        if (debugModeEnabled) {
          console.log('Polling stopped due to configuration change or component unmount');
        }
      };
    } else {
      setIsPolling(false);
      if (debugModeEnabled) {
        console.log('Polling disabled based on configuration settings');
      }
    }
  }, [
    // Dependencies - the effect will re-run when any of these change
    devicePollingEnabled,
    realTimeUpdatesEnabled,
    deviceRefreshInterval,
    fetchDeviceData,
    debugModeEnabled
  ]);
  
  // Step 5: Load initial configuration
  // ---------------------------------
  // This effect loads the configuration when the component mounts
  useEffect(() => {
    dispatch(fetchConfiguration());
  }, [dispatch]);
  
  // Step 6: Handle configuration updates
  // -----------------------------------
  // These handlers demonstrate how to modify configuration values
  
  // Example handler for changing refresh interval
  const handleRefreshIntervalChange = (newInterval: number) => {
    // Dispatch the updateConfig action with just the fields that are changing
    dispatch(updateConfig({
      deviceRefreshInterval: newInterval
    }));
    
    if (debugModeEnabled) {
      console.log(`Updated device refresh interval to ${newInterval}ms`);
    }
  };
  
  // Example handler for toggling polling
  const handleTogglePolling = () => {
    dispatch(updateConfig({
      devicePollingEnabled: !devicePollingEnabled
    }));
    
    if (debugModeEnabled) {
      console.log(`Device polling ${!devicePollingEnabled ? 'enabled' : 'disabled'}`);
    }
  };
  
  // Example handler for toggling real-time updates
  const handleToggleRealTimeUpdates = () => {
    dispatch(updateConfig({
      realTimeUpdatesEnabled: !realTimeUpdatesEnabled
    }));
    
    if (debugModeEnabled) {
      console.log(`Real-time updates ${!realTimeUpdatesEnabled ? 'enabled' : 'disabled'}`);
    }
  };
  
  // Example handler for toggling debug mode
  const handleToggleDebugMode = () => {
    dispatch(updateConfig({
      debugModeEnabled: !debugModeEnabled
    }));
  };
  
  // Step 7: Save configuration changes
  // ---------------------------------
  // Handler to save any pending configuration changes
  const handleSaveConfiguration = async () => {
    try {
      // First, get the current configuration state from the store
      const currentConfig = (await dispatch(fetchConfiguration()).unwrap());
      
      // Then, save the current configuration state
      await dispatch(saveConfiguration(currentConfig)).unwrap();
      
      if (debugModeEnabled) {
        console.log('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };
  
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-700">Site Configuration Usage Example</h2>
      
      {/* Display current configuration values */}
      <div className="mb-4 space-y-2 rounded-md bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Current Configuration:</span>
        </p>
        <ul className="ml-6 list-disc space-y-1 text-sm text-gray-600">
          <li>Device Refresh Interval: <span className="font-mono">{deviceRefreshInterval}ms</span></li>
          <li>Server Poll Interval: <span className="font-mono">{serverPollInterval}ms</span></li>
          <li>Real-time Updates: <span className={realTimeUpdatesEnabled ? 'text-green-600' : 'text-red-600'}>
            {realTimeUpdatesEnabled ? 'Enabled' : 'Disabled'}
          </span></li>
          <li>Device Polling: <span className={devicePollingEnabled ? 'text-green-600' : 'text-red-600'}>
            {devicePollingEnabled ? 'Enabled' : 'Disabled'}
          </span></li>
          <li>Debug Mode: <span className={debugModeEnabled ? 'text-yellow-600' : 'text-gray-600'}>
            {debugModeEnabled ? 'Enabled' : 'Disabled'}
          </span></li>
          <li>Polling Status: <span className={isPolling ? 'text-green-600' : 'text-gray-600'}>
            {isPolling ? 'Active' : 'Inactive'}
          </span></li>
        </ul>
      </div>
      
      {/* Configuration Controls */}
      <div className="mb-6 space-y-4">
        <h3 className="text-md font-semibold text-gray-700">Update Configuration</h3>
        
        {/* Refresh Interval Controls */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Device Refresh Interval</p>
          <div className="flex space-x-2">
            <button 
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
              onClick={() => handleRefreshIntervalChange(1000)}
            >
              1 second
            </button>
            <button 
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
              onClick={() => handleRefreshIntervalChange(5000)}
            >
              5 seconds
            </button>
            <button 
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
              onClick={() => handleRefreshIntervalChange(10000)}
            >
              10 seconds
            </button>
          </div>
        </div>
        
        {/* Toggle Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Device Polling</span>
            <button 
              className={`rounded ${devicePollingEnabled ? 'bg-green-500' : 'bg-gray-300'} px-3 py-1 text-sm text-white`}
              onClick={handleTogglePolling}
            >
              {devicePollingEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Real-Time Updates</span>
            <button 
              className={`rounded ${realTimeUpdatesEnabled ? 'bg-green-500' : 'bg-gray-300'} px-3 py-1 text-sm text-white`}
              onClick={handleToggleRealTimeUpdates}
            >
              {realTimeUpdatesEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Debug Mode</span>
            <button 
              className={`rounded ${debugModeEnabled ? 'bg-yellow-500' : 'bg-gray-300'} px-3 py-1 text-sm text-white`}
              onClick={handleToggleDebugMode}
            >
              {debugModeEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
        
        {/* Save Configuration Button */}
        <div className="pt-2">
          <button 
            className={`rounded ${isConfigurationDirty ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 cursor-not-allowed'} px-4 py-2 text-white`}
            disabled={!isConfigurationDirty}
            onClick={handleSaveConfiguration}
          >
            Save Configuration
          </button>
          {isConfigurationDirty && 
            <p className="mt-1 text-xs text-amber-600">
              You have unsaved configuration changes
            </p>
          }
        </div>
      </div>
      
      {/* Display device data that's being refreshed */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-md font-semibold text-gray-700">Device Data</h3>
          <p className="text-sm text-gray-500">
            Last refresh: {lastRefreshTime.toLocaleTimeString()} 
            ({Math.round((new Date().getTime() - lastRefreshTime.getTime()) / 1000)} seconds ago)
          </p>
        </div>
        
        <div className="overflow-hidden rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Parameter
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {deviceData.map((item, index) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {item.value.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {!isPolling && (
        <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
          Note: Automatic data updates are not active. Enable both Device Polling and 
          Real-Time Updates in the configuration settings above to activate polling.
        </div>
      )}
      
      {/* Documentation Section */}
      <div className="mt-6 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <h3 className="mb-2 font-semibold">Component Documentation</h3>
        <p className="mb-2">
          This example demonstrates the recommended patterns for using the siteConfiguration feature:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Using typed selectors to access configuration values (see Step 1)</li>
          <li>Setting up useEffect with proper dependencies to respond to configuration changes (Step 4)</li>
          <li>Implementing handlers for updating configuration values (Step 6)</li>
          <li>Saving configuration changes with the saveConfiguration thunk (Step 7)</li>
          <li>Updating component behavior based on configuration changes</li>
        </ul>
        <p className="mt-2 italic">
          Examine the component code for detailed comments explaining each implementation detail.
        </p>
      </div>
    </div>
  );
};

export default ConfigurationUsageExample;