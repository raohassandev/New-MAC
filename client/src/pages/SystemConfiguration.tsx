import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '../redux/store';
import {
  Save,
  RefreshCw,
  Settings,
  Clock,
  Server,
  Sliders,
  Code,
  Database,
  Shield,
  Info,
} from 'lucide-react';
import {
  fetchConfiguration,
  saveConfiguration,
  updateConfig,
  resetConfig,
  selectSiteConfiguration,
  selectConfigurationLoading,
  selectIsConfigurationDirty,
  SiteConfigurationSettings,
} from '../redux/features/siteConfiguration';
// Define useAppSelector to avoid circular dependencies
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
import { toast } from 'react-toastify';

const SystemConfiguration: React.FC = () => {
  const dispatch = useDispatch();
  const configuration = useAppSelector(selectSiteConfiguration);
  const isLoading = useAppSelector(selectConfigurationLoading);
  const isDirty = useAppSelector(selectIsConfigurationDirty);

  const [activeTab, setActiveTab] = useState<'performance' | 'server' | 'ui' | 'development'>(
    'performance'
  );

  // Local state for the form
  const [formState, setFormState] = useState<SiteConfigurationSettings>(configuration);

  // Fetch configuration on component mount
  useEffect(() => {
    dispatch(fetchConfiguration());
  }, [dispatch]);

  // Update local form state when configuration changes
  useEffect(() => {
    setFormState(configuration);
  }, [configuration]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;

    // Parse numbers and booleans
    if (type === 'number') {
      parsedValue = parseFloat(value);
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }

    setFormState(prev => {
      // Handle dot notation for nested properties
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: parsedValue,
          },
        };
      }

      return {
        ...prev,
        [name]: parsedValue,
      };
    });
  };

  const handleSaveConfig = async () => {
    try {
      // Update Redux state
      dispatch(updateConfig(formState));

      // Save to persistence
      await dispatch(saveConfiguration(formState)).unwrap();

      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleResetConfig = () => {
    dispatch(resetConfig());
    toast.info('Configuration reset to defaults');
  };

  // Helper for creating consistent form groups
  const FormGroup: React.FC<{
    label: string;
    name: string;
    type: string;
    value: any;
    min?: number;
    max?: number;
    step?: number;
    checked?: boolean;
    helpText?: string;
    options?: Array<{ value: string; label: string }>;
  }> = ({ label, name, type, value, min, max, step, checked, helpText, options }) => {
    return (
      <div className="mb-4">
        <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>

        {type === 'select' ? (
          <select
            id={name}
            name={name}
            value={String(value)}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === 'checkbox' ? (
          <div className="flex items-center">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={checked}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">{helpText}</span>
          </div>
        ) : (
          <div>
            <input
              id={name}
              name={name}
              type={type}
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={handleInputChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
          </div>
        )}
      </div>
    );
  };

  if (isLoading && !configuration) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">System Configuration</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleResetConfig}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RefreshCw size={16} className="mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={!isDirty || isLoading}
            className={`inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              !isDirty || isLoading
                ? 'bg-blue-300 hover:bg-blue-300'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-700">
        <div className="flex">
          <Info size={20} className="mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm">
              These configuration settings define how the application interacts with devices and
              servers. Adjusting these values can improve performance in local development
              environments.
            </p>
            <p className="mt-2 text-sm font-semibold">
              Default values have been reduced from 30 seconds to 5 seconds to provide more
              real-time updates during development.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Clock size={16} className="mr-2" />
              Performance Settings
            </button>
            <button
              onClick={() => setActiveTab('server')}
              className={`flex items-center whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'server'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Server size={16} className="mr-2" />
              Server Connection
            </button>
            <button
              onClick={() => setActiveTab('ui')}
              className={`flex items-center whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'ui'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Sliders size={16} className="mr-2" />
              UI Behavior
            </button>
            <button
              onClick={() => setActiveTab('development')}
              className={`flex items-center whitespace-nowrap border-b-2 px-6 py-4 text-sm font-medium ${
                activeTab === 'development'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Code size={16} className="mr-2" />
              Development Options
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'performance' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">Performance Settings</h2>
              <FormGroup
                label="Device Refresh Interval (ms)"
                name="deviceRefreshInterval"
                type="number"
                value={formState.deviceRefreshInterval}
                min={500}
                max={60000}
                step={500}
                helpText="How often to refresh device data in the UI (milliseconds)"
              />

              <FormGroup
                label="System Monitor Refresh Interval (ms)"
                name="systemMonitorRefreshInterval"
                type="number"
                value={formState.systemMonitorRefreshInterval}
                min={1000}
                max={60000}
                step={1000}
                helpText="How often to refresh system monitor metrics (milliseconds)"
              />

              <FormGroup
                label="Enable Device Polling"
                name="devicePollingEnabled"
                type="checkbox"
                checked={formState.devicePollingEnabled}
                helpText="Enable automatic polling of device data"
              />

              <FormGroup
                label="Enable Real-time Updates"
                name="realTimeUpdatesEnabled"
                type="checkbox"
                checked={formState.realTimeUpdatesEnabled}
                helpText="Updates device readings in real-time as they arrive from the server"
              />
            </div>
          )}

          {activeTab === 'server' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">
                Server Connection Settings
              </h2>
              <FormGroup
                label="Server Poll Interval (ms)"
                name="serverPollInterval"
                type="number"
                value={formState.serverPollInterval}
                min={1000}
                max={30000}
                step={500}
                helpText="How often the server polls devices for data (milliseconds)"
              />

              <FormGroup
                label="Connection Timeout (ms)"
                name="connectionTimeout"
                type="number"
                value={formState.connectionTimeout}
                min={1000}
                max={30000}
                step={500}
                helpText="Maximum time to wait for device connections (milliseconds)"
              />

              <FormGroup
                label="Max Retry Attempts"
                name="maxRetryAttempts"
                type="number"
                value={formState.maxRetryAttempts}
                min={0}
                max={10}
                step={1}
                helpText="Maximum number of connection retry attempts"
              />

              <FormGroup
                label="Retry Backoff Multiplier"
                name="retryBackoffMultiplier"
                type="number"
                value={formState.retryBackoffMultiplier}
                min={1}
                max={5}
                step={0.1}
                helpText="Multiplier for increasing wait time between retries"
              />
            </div>
          )}

          {activeTab === 'ui' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">UI Behavior Settings</h2>
              <FormGroup
                label="Show Detailed Errors"
                name="showDetailedErrors"
                type="checkbox"
                checked={formState.showDetailedErrors}
                helpText="Show detailed error information in the UI"
              />

              <FormGroup
                label="Persist Device Readings"
                name="persistDeviceReadings"
                type="checkbox"
                checked={formState.persistDeviceReadings}
                helpText="Keep device readings in memory between page navigations"
              />

              <FormGroup
                label="Auto-expand Device Groups"
                name="autoExpandDeviceGroups"
                type="checkbox"
                checked={formState.autoExpandDeviceGroups}
                helpText="Automatically expand device groups in the device list"
              />

              <FormGroup
                label="Default Data Display Mode"
                name="defaultDataDisplayMode"
                type="select"
                value={formState.defaultDataDisplayMode}
                options={[
                  { value: 'table', label: 'Table View' },
                  { value: 'grid', label: 'Grid View' },
                  { value: 'list', label: 'List View' },
                ]}
                helpText="Default display mode for device data"
              />
            </div>
          )}

          {activeTab === 'development' && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-700">Development Options</h2>
              <div className="mb-6 rounded border-l-4 border-yellow-400 bg-yellow-50 p-4 text-yellow-700">
                <div className="flex">
                  <Shield size={20} className="mr-2 flex-shrink-0" />
                  <p className="text-sm">
                    These settings are intended for development and testing purposes only. They
                    should be disabled in production environments.
                  </p>
                </div>
              </div>

              <FormGroup
                label="Enable Debug Mode"
                name="debugModeEnabled"
                type="checkbox"
                checked={formState.debugModeEnabled}
                helpText="Enable additional logging and debugging information"
              />

              <FormGroup
                label="Use Sample Data"
                name="useSampleData"
                type="checkbox"
                checked={formState.useSampleData}
                helpText="Use sample data instead of actual device data"
              />

              <FormGroup
                label="Simulate Network Latency"
                name="simulateNetworkLatency"
                type="checkbox"
                checked={formState.simulateNetworkLatency}
                helpText="Add artificial delay to API calls to simulate network latency"
              />

              <FormGroup
                label="Simulated Latency (ms)"
                name="simulatedLatencyMs"
                type="number"
                value={formState.simulatedLatencyMs}
                min={0}
                max={5000}
                step={100}
                helpText="Amount of artificial latency to add to API calls (milliseconds)"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemConfiguration;
