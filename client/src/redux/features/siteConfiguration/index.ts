import { useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '../../store';
import siteConfigurationReducer from './siteConfigurationSlice';
import * as siteConfigurationSelectors from './siteConfigurationSelectors';
import * as siteConfigurationActions from './siteConfigurationAPI';

/**
 * Typed hook for using site configuration selectors
 */
const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useSiteConfigurationSelector = <TSelected>(
  selector: (state: RootState) => TSelected
): TSelected => {
  return useAppSelector(state => selector(state));
};

// Re-export everything from this feature
export { siteConfigurationSelectors, siteConfigurationActions };
export * from './siteConfigurationSlice';

// Re-export selectors individually for direct imports
export const {
  selectSiteConfiguration,
  selectConfigurationLoading,
  selectConfigurationError,
  selectIsConfigurationDirty,
  selectHasConfigurationBeenApplied,
  selectDeviceRefreshInterval,
  selectSystemMonitorRefreshInterval,
  selectDevicePollingEnabled,
  selectRealTimeUpdatesEnabled,
  selectServerPollInterval,
  selectConnectionTimeout,
  selectDebugModeEnabled
} = siteConfigurationSelectors;

// Re-export actions from the API
export const { fetchConfiguration, saveConfiguration } = siteConfigurationActions;

// Re-export actions from the slice
export { updateConfig, resetConfig, markConfigApplied } from './siteConfigurationSlice';

// Default export is the reducer
export default siteConfigurationReducer;