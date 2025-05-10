/**
 * Auto-polling support utility
 * This utility checks if the server has auto-polling enabled and adjusts client behavior accordingly
 */

// Track whether auto-polling is enabled globally
let isAutoPollingEnabled = null;
let autoPollingChecked = false;

/**
 * Checks if the server has auto-polling enabled
 * @returns {Promise<boolean>} True if auto-polling is enabled
 */
export async function checkAutoPollingStatus() {
  if (autoPollingChecked) {
    return isAutoPollingEnabled;
  }
  
  try {
    // Check the auto-polling status from the server
    const response = await fetch('/client/api/system/polling/status');
    if (response.ok) {
      const data = await response.json();
      isAutoPollingEnabled = data.isActive;
      console.log(`Auto-polling status: ${isAutoPollingEnabled ? 'ENABLED' : 'DISABLED'}`);
    } else {
      // If we can't check, assume auto-polling is disabled
      isAutoPollingEnabled = false;
      console.warn('Could not check auto-polling status - assuming disabled');
    }
  } catch (error) {
    // If there's an error, assume auto-polling is disabled
    console.error('Error checking auto-polling status:', error);
    isAutoPollingEnabled = false;
  }
  
  autoPollingChecked = true;
  return isAutoPollingEnabled;
}

/**
 * Gets the appropriate URL for fetching device data based on whether auto-polling is enabled
 * @param {string} deviceId The device ID
 * @param {boolean} forceRefresh Whether to force a refresh of the data
 * @returns {string} The URL to use for fetching device data
 */
export function getDeviceDataUrl(deviceId, forceRefresh = false) {
  // If auto-polling is enabled, use the read-only endpoint to avoid database operations
  if (isAutoPollingEnabled) {
    return `/client/api/devices/${deviceId}/data/current/readonly${forceRefresh ? '?forceRefresh=true' : ''}`;
  }
  
  // Otherwise, use the normal endpoint
  return `/client/api/devices/${deviceId}/data/current${forceRefresh ? '?forceRefresh=true' : ''}`;
}

/**
 * Initializes the auto-polling support
 * Call this when your app starts
 */
export async function initAutoPollingSupport() {
  await checkAutoPollingStatus();
  
  // Check again every 5 minutes in case the server status changes
  setInterval(checkAutoPollingStatus, 5 * 60 * 1000);
}