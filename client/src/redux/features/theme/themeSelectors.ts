import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';

/**
 * Base selector for theme state
 */
const selectThemeState = (state: RootState) => state.theme;

/**
 * Select theme mode (light, dark, or system)
 */
export const selectThemeMode = createSelector(selectThemeState, theme => theme.mode);

/**
 * Select system theme preference
 */
export const selectSystemPreference = createSelector(
  selectThemeState,
  theme => theme.systemPreference
);

/**
 * Select the actual theme to apply (resolves system to light/dark)
 */
export const selectActiveTheme = createSelector(
  [selectThemeMode, selectSystemPreference],
  (mode, systemPreference) => {
    if (mode === 'system') {
      return systemPreference;
    }
    return mode;
  }
);

/**
 * Select when theme was last updated
 */
export const selectThemeLastUpdated = createSelector(selectThemeState, theme => theme.lastUpdated);
