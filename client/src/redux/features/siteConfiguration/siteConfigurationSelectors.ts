import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { defaultConfiguration } from './siteConfigurationSlice';

/**
 * Base selector for site configuration state
 */
const selectSiteConfigurationState = (state: RootState) => state.siteConfiguration;

/**
 * Select site configuration settings
 */
export const selectSiteConfiguration = createSelector(
  selectSiteConfigurationState,
  siteConfig => siteConfig.data || defaultConfiguration
);

/**
 * Select if configuration is currently loading
 */
export const selectConfigurationLoading = createSelector(
  selectSiteConfigurationState,
  siteConfig => siteConfig.loading
);

/**
 * Select configuration error if any
 */
export const selectConfigurationError = createSelector(
  selectSiteConfigurationState,
  siteConfig => siteConfig.error
);

/**
 * Select if configuration has unsaved changes
 */
export const selectIsConfigurationDirty = createSelector(
  selectSiteConfigurationState,
  siteConfig => siteConfig.isDirty
);

/**
 * Select if configuration changes have been applied
 */
export const selectHasConfigurationBeenApplied = createSelector(
  selectSiteConfigurationState,
  siteConfig => siteConfig.hasAppliedChanges
);

/**
 * Select device refresh interval
 */
export const selectDeviceRefreshInterval = createSelector(
  selectSiteConfiguration,
  config => config.deviceRefreshInterval
);

/**
 * Select system monitor refresh interval
 */
export const selectSystemMonitorRefreshInterval = createSelector(
  selectSiteConfiguration,
  config => config.systemMonitorRefreshInterval
);

/**
 * Select if device polling is enabled
 */
export const selectDevicePollingEnabled = createSelector(
  selectSiteConfiguration,
  config => config.devicePollingEnabled
);

/**
 * Select if real-time updates are enabled
 */
export const selectRealTimeUpdatesEnabled = createSelector(
  selectSiteConfiguration,
  config => config.realTimeUpdatesEnabled
);

/**
 * Select server poll interval
 */
export const selectServerPollInterval = createSelector(
  selectSiteConfiguration,
  config => config.serverPollInterval
);

/**
 * Select connection timeout
 */
export const selectConnectionTimeout = createSelector(
  selectSiteConfiguration,
  config => config.connectionTimeout
);

/**
 * Select if debug mode is enabled
 */
export const selectDebugModeEnabled = createSelector(
  selectSiteConfiguration,
  config => config.debugModeEnabled
);
