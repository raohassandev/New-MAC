import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncState } from '../../types';
import { fetchConfiguration, saveConfiguration } from './siteConfigurationAPI';

/**
 * Site configuration settings interface
 */
export interface SiteConfigurationSettings {
  // Device data refresh settings
  deviceRefreshInterval: number; // in milliseconds
  systemMonitorRefreshInterval: number; // in milliseconds
  devicePollingEnabled: boolean;
  realTimeUpdatesEnabled: boolean;

  // Server communication settings
  serverPollInterval: number; // in milliseconds
  connectionTimeout: number; // in milliseconds
  maxRetryAttempts: number;
  retryBackoffMultiplier: number;

  // UI behavior settings
  showDetailedErrors: boolean;
  persistDeviceReadings: boolean;
  autoExpandDeviceGroups: boolean;
  defaultDataDisplayMode: 'table' | 'grid' | 'list';

  // Development settings
  debugModeEnabled: boolean;
  useSampleData: boolean;
  simulateNetworkLatency: boolean;
  simulatedLatencyMs: number;
}

/**
 * Site configuration state interface
 */
export interface SiteConfigurationState extends AsyncState<SiteConfigurationSettings> {
  isDirty: boolean;
  hasAppliedChanges: boolean;
}

/**
 * Default configuration values
 */
export const defaultConfiguration: SiteConfigurationSettings = {
  // Set a more real-time default for local development
  deviceRefreshInterval: 5000, // 5 seconds
  systemMonitorRefreshInterval: 15000, // 15 seconds
  devicePollingEnabled: true,
  realTimeUpdatesEnabled: true,

  serverPollInterval: 5000, // 5 seconds
  connectionTimeout: 5000, // 5 seconds
  maxRetryAttempts: 3,
  retryBackoffMultiplier: 1.5,

  showDetailedErrors: true,
  persistDeviceReadings: true,
  autoExpandDeviceGroups: false,
  defaultDataDisplayMode: 'table',

  debugModeEnabled: false,
  useSampleData: false,
  simulateNetworkLatency: false,
  simulatedLatencyMs: 500,
};

/**
 * Initial site configuration state
 */
const initialState: SiteConfigurationState = {
  data: defaultConfiguration,
  loading: false,
  error: null,
  lastUpdated: null,
  isDirty: false,
  hasAppliedChanges: false,
};

/**
 * Site configuration slice with reducers and handlers for async thunks
 */
const siteConfigurationSlice = createSlice({
  name: 'siteConfiguration',
  initialState,
  reducers: {
    updateConfig: (state, action: PayloadAction<Partial<SiteConfigurationSettings>>) => {
      if (state.data) {
        state.data = {
          ...state.data,
          ...action.payload,
        };
        state.isDirty = true;
        state.hasAppliedChanges = false;
      }
    },
    resetConfig: (state) => {
      state.data = defaultConfiguration;
      state.isDirty = true;
      state.hasAppliedChanges = false;
    },
    markConfigApplied: (state) => {
      state.isDirty = false;
      state.hasAppliedChanges = true;
    },
  },
  extraReducers: (builder) => {
    // Fetch configuration reducers
    builder.addCase(fetchConfiguration.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchConfiguration.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
      state.lastUpdated = Date.now();
      state.isDirty = false;
      state.hasAppliedChanges = false;
    });
    builder.addCase(fetchConfiguration.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch configuration';
      // On failure, keep using default configuration
      if (!state.data) {
        state.data = defaultConfiguration;
      }
    });

    // Save configuration reducers
    builder.addCase(saveConfiguration.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(saveConfiguration.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
      state.lastUpdated = Date.now();
      state.isDirty = false;
      state.hasAppliedChanges = true;
    });
    builder.addCase(saveConfiguration.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to save configuration';
    });
  },
});

// Export actions and reducer
export const { updateConfig, resetConfig, markConfigApplied } = siteConfigurationSlice.actions;
export default siteConfigurationSlice.reducer;