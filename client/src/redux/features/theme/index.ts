import { useAppSelector } from '../../store';
import themeReducer from './themeSlice';
import * as themeSelectors from './themeSelectors';

/**
 * Typed hook for using theme selectors
 */
export const useThemeSelector = <TSelected>(
  selector: (state: ReturnType<typeof useAppSelector>) => TSelected
): TSelected => {
  return useAppSelector(state => selector(state));
};

// Re-export everything from this feature
export { themeSelectors };
export * from './themeSlice';

// Re-export selectors individually for direct imports
export const {
  selectThemeMode,
  selectActiveTheme,
  selectSystemPreference,
  selectThemeLastUpdated
} = themeSelectors;

// Default export is the reducer
export default themeReducer;