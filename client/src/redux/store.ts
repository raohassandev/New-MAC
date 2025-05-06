import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import rootReducer from './rootReducer';
import { persistConfig } from './persistConfig';

/**
 * Create a persisted reducer for each slice
 */
const persistedReducer = {
  auth: persistReducer({ ...persistConfig, key: 'auth' }, rootReducer.auth),
  users: persistReducer({ ...persistConfig, key: 'users' }, rootReducer.users),
  devices: persistReducer({ ...persistConfig, key: 'devices' }, rootReducer.devices),
  theme: persistReducer({ ...persistConfig, key: 'theme' }, rootReducer.theme),
  global: persistReducer({ ...persistConfig, key: 'global' }, rootReducer.global),
  siteConfiguration: persistReducer({ ...persistConfig, key: 'siteConfiguration' }, rootReducer.siteConfiguration),
};

/**
 * Configure the Redux store with middleware, persistence, and dev tools
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Special action types that should be ignored
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, 'persist/PERSIST'],
        // Paths that should be ignored in serializable checks
        ignoredPaths: ['register', 'some.other.path'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor for use with PersistGate
export const persistor = persistStore(store);

// Export RootState and AppDispatch types for type-safe usage
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for Redux
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;