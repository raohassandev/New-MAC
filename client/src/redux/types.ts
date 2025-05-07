/**
 * Common Redux state types
 */

// Generic async state interface
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Generic list state interface
export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Generic entity state with normalized data
export interface EntityState<T> {
  byId: { [id: string]: T };
  allIds: string[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  message?: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Request status enum
export enum RequestStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed'
}

// Notification type for global messages
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  autoClose?: boolean;
  timeout?: number;
}

// Http error extended type
export interface HttpError extends Error {
  status?: number;
  code?: string;
  data?: any;
  name: string;
}

// Utility type for thunk API responses
export type ThunkApiConfig = {
  rejectValue: HttpError;
}