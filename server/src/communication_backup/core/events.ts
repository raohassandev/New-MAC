/**
 * Events definitions for the Communication Module
 */

/**
 * Device event types
 */
export enum DeviceEvent {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTION_ERROR = 'connection_error',
  PARAMETER_READ = 'parameter_read',
  PARAMETER_WRITE = 'parameter_write',
  ERROR = 'error',
  STATE_CHANGED = 'state_changed',
  DATA_UPDATED = 'data_updated',
}

/**
 * Polling service event types
 */
export enum PollingEvent {
  STARTED = 'polling_started',
  STOPPED = 'polling_stopped',
  DATA = 'data',
  ERROR = 'polling_error',
  DEVICE_ADDED = 'device_added',
  DEVICE_REMOVED = 'device_removed',
}

/**
 * Device manager event types
 */
export enum DeviceManagerEvent {
  DEVICE_ADDED = 'device_added',
  DEVICE_REMOVED = 'device_removed',
  DEVICE_STATE_CHANGED = 'device_state_changed',
  CONFIG_UPDATED = 'config_updated',
  ERROR = 'manager_error',
}
