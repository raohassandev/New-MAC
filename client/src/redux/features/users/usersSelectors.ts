import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { User } from '../../../types/user.types';

/**
 * Base selector for users state
 */
const selectUsersState = (state: RootState) => state.users;

/**
 * Select users loading state
 */
export const selectUsersLoading = createSelector(selectUsersState, users => users.loading);

/**
 * Select users error
 */
export const selectUsersError = createSelector(selectUsersState, users => users.error);

/**
 * Select all users as an array
 */
export const selectAllUsers = createSelector(selectUsersState, users =>
  users.allIds.map((id: any) => users.byId[id])
);

/**
 * Select users by IDs
 */
export const selectUsersByIds = (userIds: string[]) =>
  createSelector(selectUsersState, users => userIds.map(id => users.byId[id]).filter(Boolean));

/**
 * Select a user by ID
 */
export const selectUserById = (userId: string) =>
  createSelector(selectUsersState, users => users.byId[userId]);

/**
 * Select the currently selected user
 */
export const selectSelectedUser = createSelector(selectUsersState, users =>
  users.selectedUserId ? users.byId[users.selectedUserId] : null
);

/**
 * Select users by role
 */
export const selectUsersByRole = (role: string) =>
  createSelector(selectAllUsers, users => users.filter((user: User) => user.role === role));

/**
 * Select users by permission
 */
export const selectUsersByPermission = (permission: string) =>
  createSelector(selectAllUsers, users =>
    users.filter((user: User) => user.permissions?.includes(permission))
  );
