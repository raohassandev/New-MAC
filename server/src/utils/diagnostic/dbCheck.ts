import mongoose from 'mongoose';
import { Device } from '../../client/models';

/**
 * Function to check database connection and device availability
 * Can be called from any route handler to diagnose DB issues
 */
export async function checkDatabaseAndDevices(deviceId?: string) {
  const results: any = {
    connection: {
      readyState: mongoose.connection.readyState,
      status: getConnectionStatus(mongoose.connection.readyState),
      host: mongoose.connection.host,
      name: mongoose.connection.name
    },
    collections: {},
    deviceCheck: {}
  };

  // Check if mongoose is actually connected
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    results.connection.error = `MongoDB is not connected (readyState: ${mongoose.connection.readyState})`;
    return results;
  }

  // Check if we can query any collections
  try {
    const collections = await mongoose.connection.db.collections();
    results.collections.count = collections.length;
    results.collections.names = collections.map(c => c.collectionName);
  } catch (err: any) {
    results.collections.error = err.message;
    // If we can't access collections, we can't proceed with device checks
    return results;
  }

  // Check if the Device model is accessible
  if (!Device) {
    results.deviceCheck.modelExists = false;
    results.deviceCheck.error = 'Device model is not defined';
    return results;
  } 
  
  results.deviceCheck.modelExists = true;
  
  // Try counting devices
  try {
    const count = await Device.countDocuments();
    results.deviceCheck.count = count;
    
    // Get a sample of devices
    if (count > 0) {
      const devices = await Device.find().select('_id name').limit(5);
      results.deviceCheck.sample = devices;
    } else {
      results.deviceCheck.warning = 'No devices found in the database';
    }
    
    // If a specific deviceId was provided, check if it exists
    if (deviceId) {
      try {
        const isValidId = mongoose.Types.ObjectId.isValid(deviceId);
        results.deviceCheck.idCheck = {
          id: deviceId,
          isValidId
        };
        
        if (isValidId) {
          const device = await Device.findById(deviceId).select('_id name');
          results.deviceCheck.idCheck.found = !!device;
          if (device) {
            results.deviceCheck.idCheck.device = device;
          } else {
            results.deviceCheck.idCheck.error = `No device found with ID: ${deviceId}`;
            
            // Do a broader search to see if the ID might be in a different format
            const allIds = await Device.find().select('_id').limit(10);
            results.deviceCheck.idCheck.sampleIds = allIds.map(d => d._id.toString());
          }
        } else {
          results.deviceCheck.idCheck.error = `Invalid MongoDB ObjectId format: ${deviceId}`;
        }
      } catch (err: any) {
        results.deviceCheck.idCheck.error = err.message;
      }
    }
  } catch (err: any) {
    results.deviceCheck.error = err.message;
  }

  return results;
}

/**
 * Helper to convert readyState to a human-readable status
 */
function getConnectionStatus(readyState: number): string {
  switch (readyState) {
    case mongoose.ConnectionStates.connected:
      return 'connected';
    case mongoose.ConnectionStates.connecting:
      return 'connecting';
    case mongoose.ConnectionStates.disconnected:
      return 'disconnected';
    case mongoose.ConnectionStates.disconnecting:
      return 'disconnecting';
    default:
      return 'unknown';
  }
}