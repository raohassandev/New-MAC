import { useAppSelector } from '../../store';
import authReducer from './authSlice';
import * as authSelectors from './authSelectors';
import * as authActions from './authAPI';

/**
 * Typed hook for using auth selectors
 */
export const useAuthSelector = <TSelected>(
  selector: (state: ReturnType<typeof useAppSelector>) => TSelected
): TSelected => {
  return useAppSelector(state => selector(state));
};

// Re-export everything from this feature
export { authSelectors, authActions };
export * from './authSlice';

// Default export is the reducer
export default authReducer;