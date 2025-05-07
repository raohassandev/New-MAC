import storage from 'redux-persist/lib/storage';
import { PersistConfig } from 'redux-persist';

/**
 * Configuration for redux-persist
 * Note: We use any here to avoid circular dependency with RootState
 */
export const persistConfig: PersistConfig<any> = {
  key: 'root',
  storage,
  version: 1,
  // Whitelist specific reducers to persist (alternative to blacklist)
  whitelist: ['auth', 'theme', 'global'],
  // Blacklist specific reducers to NOT persist
  // blacklist: ['devices', 'users'],
  // Note: Using whitelist is preferred for security reasons

  // Custom merge strategies (optional)
  // stateReconciler: autoMergeLevel2,
};

/**
 * Nested persist configs for individual reducers
 * Use these for more complex nested persisting
 */

// Auth persist config
export const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'isAuthenticated'],
};

// Theme persist config
export const themePersistConfig = {
  key: 'theme',
  storage,
  whitelist: ['mode'],
};

// Global state persist config
export const globalPersistConfig = {
  key: 'global',
  storage,
  whitelist: ['settings', 'sidebar'],
};
