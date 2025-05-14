/**
 * Standardized timeout and retry settings for Modbus connections
 * These values will be used when device-specific settings are not available
 */

// Connection timeouts
export const DEFAULT_MODBUS_TIMEOUT = 5000; // 5 seconds
export const DEFAULT_CONNECTION_TEST_TIMEOUT = 5000; // 5 seconds 
export const DEFAULT_READ_TIMEOUT = 5000; // 5 seconds
export const DEFAULT_WRITE_TIMEOUT = 5000; // 5 seconds

// Retry settings
export const DEFAULT_MAX_RETRIES = 3; // Number of retries
export const DEFAULT_RETRY_DELAY = 1000; // 1 second between retries

// Batch operation settings
export const DEFAULT_BATCH_SIZE = 10; // Number of registers to read in one batch
export const DEFAULT_BATCH_DELAY = 250; // 250ms between batches

/**
 * Get the appropriate timeout value
 * 
 * @param deviceSettings The device's advanced settings (may be undefined)
 * @param operationType The type of operation ("connect", "read", "write")
 * @returns The timeout value in milliseconds
 */
export function getTimeoutSetting(deviceSettings: any, operationType: 'connect' | 'read' | 'write'): number {
  // Use device settings if available
  if (deviceSettings?.connectionOptions?.timeout) {
    const configuredTimeout = Number(deviceSettings.connectionOptions.timeout);
    if (!isNaN(configuredTimeout) && configuredTimeout > 0) {
      return configuredTimeout;
    }
  }
  
  // Otherwise use defaults based on operation type
  switch (operationType) {
    case 'connect':
      return DEFAULT_CONNECTION_TEST_TIMEOUT;
    case 'read':
      return DEFAULT_READ_TIMEOUT;
    case 'write':
      return DEFAULT_WRITE_TIMEOUT;
    default:
      return DEFAULT_MODBUS_TIMEOUT;
  }
}

/**
 * Get the appropriate retry settings
 * 
 * @param deviceSettings The device's advanced settings (may be undefined)
 * @returns Object with maxRetries and retryDelay properties
 */
export function getRetrySettings(deviceSettings: any): { maxRetries: number, retryDelay: number } {
  let maxRetries = DEFAULT_MAX_RETRIES;
  let retryDelay = DEFAULT_RETRY_DELAY;
  
  // Get max retries from device settings if available
  if (deviceSettings?.connectionOptions?.retries !== undefined) {
    const configuredRetries = Number(deviceSettings.connectionOptions.retries);
    if (!isNaN(configuredRetries) && configuredRetries >= 0) {
      maxRetries = configuredRetries;
    }
  }
  
  // Get retry delay from device settings if available
  if (deviceSettings?.connectionOptions?.retryInterval !== undefined) {
    const configuredDelay = Number(deviceSettings.connectionOptions.retryInterval);
    if (!isNaN(configuredDelay) && configuredDelay > 0) {
      retryDelay = configuredDelay;
    }
  }
  
  return { maxRetries, retryDelay };
}