import { useAppSelector } from '../../store';
import devicesReducer from './devicesSlice';
import * as devicesSelectors from './devicesSelectors';
import * as devicesActions from './devicesAPI';

/**
 * Typed hook for using devices selectors
 */
export const useDevicesSelector = <TSelected>(
  selector: (state: ReturnType<typeof useAppSelector>) => TSelected
): TSelected => {
  return useAppSelector(state => selector(state));
};

// Re-export everything from this feature
export { devicesSelectors, devicesActions };
export * from './devicesSlice';

// Default export is the reducer
export default devicesReducer;