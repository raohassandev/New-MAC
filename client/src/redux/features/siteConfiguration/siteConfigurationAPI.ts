import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkApiConfig } from '../../types';
import { SiteConfigurationSettings, defaultConfiguration } from './siteConfigurationSlice';

// Storage key for configuration in localStorage
const STORAGE_KEY = 'macsys_site_configuration';

/**
 * Load configuration from localStorage or backend API
 * For development, we'll use localStorage to persist settings
 * In production, this would connect to a backend API endpoint
 */
const loadConfiguration = async (): Promise<SiteConfigurationSettings> => {
  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);

    if (storedConfig) {
      const parsedConfig = JSON.parse(storedConfig);

      // Merge with default config to ensure all properties exist
      return {
        ...defaultConfiguration,
        ...parsedConfig,
      };
    }

    // If no stored config, use default
    return defaultConfiguration;
  } catch (error) {
    console.error('Error loading configuration:', error);
    return defaultConfiguration;
  }
};

/**
 * Save configuration to localStorage or backend API
 * For development, we'll use localStorage to persist settings
 * In production, this would connect to a backend API endpoint
 */
const persistConfiguration = async (
  config: SiteConfigurationSettings
): Promise<SiteConfigurationSettings> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  } catch (error) {
    console.error('Error saving configuration:', error);
    throw error;
  }
};

/**
 * Async thunk for fetching configuration
 */
export const fetchConfiguration = createAsyncThunk<SiteConfigurationSettings, void, ThunkApiConfig>(
  'siteConfiguration/fetchConfiguration',
  async (_, { rejectWithValue }) => {
    try {
      return await loadConfiguration();
    } catch (error: any) {
      return rejectWithValue({
        message: error.message || 'Failed to load configuration',
        name: error.name || 'Error',
      });
    }
  }
);

/**
 * Async thunk for saving configuration
 */
export const saveConfiguration = createAsyncThunk<
  SiteConfigurationSettings,
  SiteConfigurationSettings,
  ThunkApiConfig
>('siteConfiguration/saveConfiguration', async (config, { rejectWithValue }) => {
  try {
    return await persistConfiguration(config);
  } catch (error: any) {
    return rejectWithValue({
      message: error.message || 'Failed to save configuration',
      name: error.name || 'Error',
    });
  }
});
