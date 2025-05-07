import { useAppSelector } from '../../store';
import usersReducer from './usersSlice';
import * as usersSelectors from './usersSelectors';
import * as usersActions from './usersAPI';

/**
 * Typed hook for using users selectors
 */
export const useUsersSelector = <TSelected>(
  selector: (state: ReturnType<typeof useAppSelector>) => TSelected
): TSelected => {
  return useAppSelector(state => selector(state));
};

// Re-export everything from this feature
export { usersSelectors, usersActions };
export * from './usersSlice';

// Default export is the reducer
export default usersReducer;
