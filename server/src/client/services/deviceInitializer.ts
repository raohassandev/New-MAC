import { Device } from '../models';
import * as dataPollingService from './dataPollingService';

/**
 * Set up automatic polling for all enabled devices
 * @param pollingInterval Default polling interval in milliseconds
 */
/**
 * Set up automatic polling for all enabled devices
 * @param pollingInterval Default polling interval in milliseconds
 * @param developerMode If true, suppresses connection errors in development environments
 */
export async function initializeDevicePolling(
  pollingInterval: number = 30000,
  developerMode: boolean = false
): Promise<void> {
  try {
    console.log('Initializing device polling system...');
    
    // Discover environment
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isDevelopment = nodeEnv === 'development';
    
    // Log environment and mode
    console.log(`Environment: ${nodeEnv}${isDevelopment && developerMode ? ' (developer mode)' : ''}`);
    
    // Find all enabled devices
    const devices = await Device.find({ enabled: true });
    
    if (devices.length === 0) {
      console.log('No enabled devices found for polling');
      return;
    }
    
    console.log(`Setting up polling for ${devices.length} enabled devices`);
    
    // Filter devices based on environment and developer mode
    let devicesToProcess = devices;
    
    if (isDevelopment && developerMode) {
      // In developer mode, only poll TCP devices to avoid serial port errors
      const tcpDevices = devices.filter(d => 
        (d.connectionSetting?.connectionType === 'tcp') || 
        (d.connectionType === 'tcp')
      );
      
      console.log(`Developer mode: ${tcpDevices.length}/${devices.length} devices will be polled (TCP only)`);
      devicesToProcess = tcpDevices;
    }
    
    // Start polling for each device
    for (const device of devicesToProcess) {
      try {
        // Check if device has data points or registers configured
        const hasConfiguration = 
          (device.dataPoints && device.dataPoints.length > 0) || 
          (device.registers && device.registers.length > 0);
          
        if (!hasConfiguration) {
          console.log(`Skipping device ${device.name} (${device._id}) - no data points configured`);
          continue;
        }
        
        // Use device-specific polling interval if defined, otherwise use default
        const interval = typeof device.pollingInterval === 'number' ? device.pollingInterval : pollingInterval;
        
        // Get connection type for logging
        const connectionType = device.connectionSetting?.connectionType || device.connectionType || 'unknown';
        const connectionDetails = connectionType === 'tcp' 
          ? `${device.connectionSetting?.tcp?.ip || device.ip}:${device.connectionSetting?.tcp?.port || device.port}`
          : `${device.connectionSetting?.rtu?.serialPort || device.serialPort}`;
        
        // Start polling
        dataPollingService.setDevicePolling(device._id.toString(), interval);
        console.log(`Started polling for device ${device.name} (${device._id}) - ${connectionType}:${connectionDetails} at ${interval}ms intervals`);
      } catch (deviceError) {
        console.error(`Error setting up polling for device ${device.name} (${device._id}):`, deviceError);
        // Continue with next device
      }
    }
    
    console.log('Device polling initialization completed');
  } catch (error) {
    console.error('Error initializing device polling:', error);
  }
}