import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  selectActiveTheme,
  // selectThemeMode,
  setSystemPreference,
} from '../../redux/features/theme';
import { useAppSelector } from '../../redux/store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  // const themeMode = useAppSelector(selectThemeMode);
  const activeTheme = useAppSelector(selectActiveTheme);

  // Add theme class to document element
  useEffect(() => {
    const documentEl = document.documentElement;

    // Remove both classes
    documentEl.classList.remove('light-theme', 'dark-theme');

    // Add active theme class
    documentEl.classList.add(`${activeTheme}-theme`);

    // Also set data-theme attribute for CSS variables
    documentEl.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Add listener for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Update system preference when it changes
    const handleChange = (e: MediaQueryListEvent) => {
      dispatch(setSystemPreference(e.matches ? 'dark' : 'light'));
    };

    // Set initial value
    dispatch(setSystemPreference(mediaQuery.matches ? 'dark' : 'light'));

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [dispatch]);

  return <>{children}</>;
};

export default ThemeProvider;
