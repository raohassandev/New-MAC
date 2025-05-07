import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global state interface
 */
export interface GlobalState {
  notifications: Notification[];
  sidebar: {
    collapsed: boolean;
    visible: boolean;
  };
  settings: {
    dataRefreshInterval: number; // in milliseconds
    autoSave: boolean;
    devicePollingEnabled: boolean;
  };
}

/**
 * Initial global state
 */
const initialState: GlobalState = {
  notifications: [],
  sidebar: {
    collapsed: false,
    visible: true,
  },
  settings: {
    dataRefreshInterval: 5000, // 5 seconds - more suitable for local development
    autoSave: true,
    devicePollingEnabled: true,
  },
};

/**
 * Global slice with reducers for application-wide state
 */
const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    // Notification actions
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: uuidv4(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearAllNotifications: state => {
      state.notifications = [];
    },

    // Sidebar actions
    toggleSidebar: state => {
      state.sidebar.collapsed = !state.sidebar.collapsed;
    },
    setSidebarVisibility: (state, action: PayloadAction<boolean>) => {
      state.sidebar.visible = action.payload;
    },

    // Settings actions
    updateSettings: (state, action: PayloadAction<Partial<GlobalState['settings']>>) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    resetSettings: state => {
      state.settings = initialState.settings;
    },
  },
});

// Export actions and reducer
export const {
  addNotification,
  removeNotification,
  clearAllNotifications,
  toggleSidebar,
  setSidebarVisibility,
  updateSettings,
  resetSettings,
} = globalSlice.actions;

export default globalSlice.reducer;
