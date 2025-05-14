import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Debug middleware to log detailed information about requests
 * and check MongoDB connections
 */
export const debugRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to device read/polling endpoints
  if (!req.url.includes('/devices/') || 
      (!req.url.includes('/read') && !req.url.includes('/polling'))) {
    return next();
  }
  
  console.log('\n[DEBUG] =====================================================');
  console.log(`[DEBUG] Request received: ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] Request query:', req.query);
  
  // Check if MongoDB is connected
  const connectionState = mongoose.connection.readyState;
  const connectionStatus = 
    connectionState === 0 ? 'disconnected' :
    connectionState === 1 ? 'connected' :
    connectionState === 2 ? 'connecting' :
    connectionState === 3 ? 'disconnecting' :
    'unknown';
  
  console.log(`[DEBUG] MongoDB connection status: ${connectionStatus} (${connectionState})`);
  
  // Check if ID in params is valid MongoDB ObjectId
  if (req.params.id) {
    const isValidId = mongoose.Types.ObjectId.isValid(req.params.id);
    console.log(`[DEBUG] Device ID ${req.params.id} is ${isValidId ? 'valid' : 'INVALID'} ObjectId`);
    
    // Try to find the device ID in a sample of devices
    if (isValidId) {
      // Get the Device model
      const DeviceModel = req.app.locals.clientModels?.Device || 
                         mongoose.models.Device;
      
      if (DeviceModel) {
        // Don't block the request, run this check in the background
        DeviceModel.find().select('_id').limit(20)
          .then((devices: any[]) => {
            const deviceIds = devices.map((d: any) => d._id.toString());
            console.log(`[DEBUG] Sample device IDs in database:`, deviceIds);
            
            const deviceExists = deviceIds.includes(req.params.id);
            console.log(`[DEBUG] Device ID ${req.params.id} ${deviceExists ? 'EXISTS' : 'DOES NOT EXIST'} in the sample`);
          })
          .catch((err: Error) => {
            console.error(`[DEBUG] Error checking device IDs:`, err);
          });
      } else {
        console.log(`[DEBUG] Device model not available for checking`);
      }
    }
  }
  
  // Intercept the response to log the outcome
  const originalSend = res.send;
  res.send = function(body: any) {
    console.log(`[DEBUG] Response status: ${res.statusCode}`);
    try {
      const data = JSON.parse(body);
      // console.log(`[DEBUG] Response data:`, data);
    } catch (e) {
      console.log(`[DEBUG] Response body (not JSON):`, body);
    }
    console.log('[DEBUG] =====================================================\n');
    return originalSend.call(this, body);
  };
  
  next();
};