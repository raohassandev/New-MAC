import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../../types/user.types';
import { EntityState } from '../../types';
import { fetchUsers, fetchUserById, createUser, updateUser, deleteUser } from './usersAPI';

/**
 * Users state interface
 */
export interface UsersState extends EntityState<User> {
  selectedUserId: string | null;
}

/**
 * Initial users state
 */
const initialState: UsersState = {
  byId: {},
  allIds: [],
  selectedUserId: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

/**
 * Users slice with reducers and handlers for async thunks
 */
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    selectUser: (state, action: PayloadAction<string>) => {
      state.selectedUserId = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUserId = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch users list reducers
    builder.addCase(fetchUsers.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUsers.fulfilled, (state, action) => {
      state.loading = false;
      
      // Normalize users data
      const byId: Record<string, User> = {};
      const allIds: string[] = [];
      
      action.payload.forEach(user => {
        byId[user._id] = user;
        allIds.push(user._id);
      });
      
      state.byId = byId;
      state.allIds = allIds;
      state.lastUpdated = Date.now();
    });
    builder.addCase(fetchUsers.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch users';
    });

    // Fetch user by ID reducers
    builder.addCase(fetchUserById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserById.fulfilled, (state, action) => {
      state.loading = false;
      
      const user = action.payload;
      state.byId[user._id] = user;
      
      if (!state.allIds.includes(user._id)) {
        state.allIds.push(user._id);
      }
      
      state.selectedUserId = user._id;
      state.lastUpdated = Date.now();
    });
    builder.addCase(fetchUserById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch user';
    });

    // Create user reducers
    builder.addCase(createUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createUser.fulfilled, (state, action) => {
      state.loading = false;
      
      const user = action.payload;
      state.byId[user._id] = user;
      state.allIds.push(user._id);
      state.lastUpdated = Date.now();
    });
    builder.addCase(createUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create user';
    });

    // Update user reducers
    builder.addCase(updateUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateUser.fulfilled, (state, action) => {
      state.loading = false;
      
      const user = action.payload;
      state.byId[user._id] = user;
      state.lastUpdated = Date.now();
    });
    builder.addCase(updateUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update user';
    });

    // Delete user reducers
    builder.addCase(deleteUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteUser.fulfilled, (state, action) => {
      state.loading = false;
      
      const userId = action.payload;
      delete state.byId[userId];
      state.allIds = state.allIds.filter(id => id !== userId);
      
      if (state.selectedUserId === userId) {
        state.selectedUserId = null;
      }
      
      state.lastUpdated = Date.now();
    });
    builder.addCase(deleteUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete user';
    });
  },
});

// Export actions and reducer
export const { selectUser, clearSelectedUser } = usersSlice.actions;
export default usersSlice.reducer;