import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { ThemeProvider } from '../components/theme';

interface ReduxProviderProps {
  children: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * Redux Provider component that wraps the application with Redux store,
 * PersistGate for state persistence, and additional providers like ThemeProvider
 * 
 * Usage:
 * ```tsx
 * <ReduxProvider loading={<LoadingSpinner />}>
 *   <App />
 * </ReduxProvider>
 * ```
 */
const ReduxProvider: React.FC<ReduxProviderProps> = ({ 
  children, 
  loading = null 
}) => {
  return (
    <Provider store={store}>
      <PersistGate loading={loading} persistor={persistor}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default ReduxProvider;