// Import reducers from feature slices
import authReducer from './features/auth';
import usersReducer from './features/users';
import devicesReducer from './features/devices';
import themeReducer from './features/theme';
import siteConfigurationReducer from './features/siteConfiguration';

// Import reducers from global slices
import globalReducer from './reducers/globalSlice';

/**
 * Root reducer object containing all feature and global reducers
 * This will be combined in the store configuration
 */
const rootReducer = {
  // Feature-based reducers
  auth: authReducer,
  users: usersReducer,
  devices: devicesReducer,
  theme: themeReducer,
  siteConfiguration: siteConfigurationReducer,
  
  // Global reducers
  global: globalReducer,
};

export default rootReducer;