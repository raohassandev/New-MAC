import api from '../api/client';

/**
 * Example: How to change a device driver
 */
export async function changeDeviceDriver(deviceId: string, newDriverId: string) {
  try {
    // Step 1: Get the current device to see its current driver
    const deviceResponse = await api.get(`/client/api/devices/${deviceId}`);
    const currentDevice = deviceResponse.data;
    
    console.log(`Current driver: ${currentDevice.deviceDriverId}`);
    
    // Step 2: Update the device with new driver ID
    const updateResponse = await api.put(`/client/api/devices/${deviceId}`, {
      deviceDriverId: newDriverId
    });
    
    console.log('Device driver updated successfully');
    console.log(`New driver: ${updateResponse.data.deviceDriverId}`);
    
    // Step 3: Verify the change by reading device data
    // The read operation will use the new driver's configuration
    const readResponse = await api.get(`/client/api/devices/${deviceId}/read`);
    console.log('Read with new driver config:', readResponse.data);
    
    return updateResponse.data;
  } catch (error) {
    console.error('Error changing device driver:', error);
    throw error;
  }
}

// Example usage
// changeDeviceDriver('6829cd26e33c4d28eb8b78bc', '6829cd0be33c4d28eb8b789b');