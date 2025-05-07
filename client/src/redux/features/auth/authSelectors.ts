import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';

/**
 * Base selector for auth state
 */
const selectAuthState = (state: RootState) => state.auth;

/**
 * Select current user
 */
export const selectCurrentUser = createSelector(selectAuthState, auth => auth.data);

/**
 * Select authentication status
 */
export const selectIsAuthenticated = createSelector(selectAuthState, auth => auth.isAuthenticated);

/**
 * Select auth loading state
 */
export const selectAuthLoading = createSelector(selectAuthState, auth => auth.loading);

/**
 * Select auth error
 */
export const selectAuthError = createSelector(selectAuthState, auth => auth.error);

/**
 * Select user permissions
 */
export const selectUserPermissions = createSelector(
  selectAuthState,
  auth => auth.permissions || []
);

/**
 * Select auth token
 */
export const selectAuthToken = createSelector(selectAuthState, auth => auth.token);

/**
 * Check if user has a specific permission
 */
export const selectHasPermission = (permission: string) =>
  createSelector(selectUserPermissions, permissions => permissions.includes(permission));

/**
 * Check if user has any of the given permissions
 */
export const selectHasAnyPermission = (permissions: string[]) =>
  createSelector(selectUserPermissions, userPermissions =>
    permissions.some(permission => userPermissions.includes(permission))
  );

/**
 * Check if user has all of the given permissions
 */
export const selectHasAllPermissions = (permissions: string[]) =>
  createSelector(selectUserPermissions, userPermissions =>
    permissions.every(permission => userPermissions.includes(permission))
  );
