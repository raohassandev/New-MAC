import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
  systemPreference: 'light' | 'dark';
  lastUpdated: number | null;
}

// Try to get saved theme from localStorage
const getSavedTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
    return savedTheme as ThemeMode;
  }
  return 'system';
};

// Detect system preference
const getSystemPreference = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const initialState: ThemeState = {
  mode: getSavedTheme(),
  systemPreference: getSystemPreference(),
  lastUpdated: null,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      state.lastUpdated = Date.now();

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', action.payload);
      }
    },
    setSystemPreference: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.systemPreference = action.payload;
    },
    toggleTheme: state => {
      // Toggle between light and dark, keeping system as is
      if (state.mode === 'light') {
        state.mode = 'dark';
      } else if (state.mode === 'dark') {
        state.mode = 'light';
      } else {
        // If mode is system, toggle based on current system preference
        state.mode = state.systemPreference === 'dark' ? 'light' : 'dark';
      }

      state.lastUpdated = Date.now();

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', state.mode);
      }
    },
  },
});

export const { setTheme, setSystemPreference, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
