import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../../types/user.types';
import { AsyncState } from '../../types';
import { login, register, getCurrentUser, logout } from './authAPI';

/**
 * Auth state interface
 */
export interface AuthState extends AsyncState<User> {
  isAuthenticated: boolean;
  token: string | null;
  permissions: string[];
}

/**
 * Initial auth state
 */
const initialState: AuthState = {
  data: null,
  isAuthenticated: false,
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null,
  loading: false,
  error: null,
  lastUpdated: null,
  permissions: [],
};

/**
 * Auth slice with reducers and handlers for async thunks
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.data = action.payload;
      state.isAuthenticated = true;
      state.permissions = action.payload.permissions || [];
      state.lastUpdated = Date.now();
    },
    clearUser: state => {
      state.data = null;
      state.isAuthenticated = false;
      state.token = null;
      state.permissions = [];
      state.lastUpdated = Date.now();
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
  },
  extraReducers: builder => {
    // Login reducers
    builder.addCase(login.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
      state.isAuthenticated = true;
      state.token = action.payload.token || state.token;
      state.permissions = action.payload.permissions || [];
      state.lastUpdated = Date.now();
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Login failed';
      state.isAuthenticated = false;
    });

    // Register reducers
    builder.addCase(register.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
      state.isAuthenticated = true;
      state.token = action.payload.token || state.token;
      state.permissions = action.payload.permissions || [];
      state.lastUpdated = Date.now();
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Registration failed';
      state.isAuthenticated = false;
    });

    // Get current user reducers
    builder.addCase(getCurrentUser.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getCurrentUser.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
      state.isAuthenticated = true;
      state.permissions = action.payload.permissions || [];
      state.lastUpdated = Date.now();
    });
    builder.addCase(getCurrentUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to get user';
      state.isAuthenticated = false;
      state.token = null;
    });

    // Logout reducers
    builder.addCase(logout.fulfilled, state => {
      state.data = null;
      state.isAuthenticated = false;
      state.token = null;
      state.permissions = [];
      state.lastUpdated = Date.now();
    });
  },
});

// Export actions and reducer
export const { setUser, clearUser, setToken } = authSlice.actions;
export default authSlice.reducer;
