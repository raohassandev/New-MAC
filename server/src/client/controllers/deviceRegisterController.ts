import { Request, Response } from 'express';
import * as deviceService from '../services';
import { modbusLogger as logger } from '../../utils/logger';
import { trackModbusRequest } from '../routes/monitoringRoutes';

// Extended Request type with user property
interface AuthRequest extends Request {
  user?: any;
}

/**
 * Handle extremely small float values that might cause serialization issues
 * @param data The data object to process
 * @returns A new object with safe values
 */
function handleExtremelySmallValues(data: any): any {
  // Handle null or undefined
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => handleExtremelySmallValues(item));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = handleExtremelySmallValues(data[key]);
      }
    }
    return result;
  }
  
  // Handle extremely small numbers
  if (typeof data === 'number') {
    if (!isFinite(data) || Math.abs(data) < 1e-20) {
      logger.debug(`Replacing extremely small or invalid number: ${data} with 0`);
      return 0;
    }
  }
  
  // Return unchanged for other types
  return data;
}

/**
 * Controller to handle reading device registers
 * This is a simplified controller that uses the device service
 */
export const readDeviceRegisters = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[deviceRegisterController] Starting device register read');
    
    const deviceId = req.params.id;
    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    
    try {
      // Use the device service to read registers
      const result = await deviceService.readDeviceRegisters(deviceId, req);
      
      // Return the result
      res.json(result);
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes('not found')) {
        return res.status(404).json({ message: 'Device not found' });
      } else if (error.message.includes('disabled')) {
        return res.status(400).json({ message: 'Device is disabled' });
      } else if (error.message.includes('No data points or registers configured')) {
        return res.status(400).json({ message: 'No data points or registers configured for this device' });
      } else if (error.message.includes('Invalid connection configuration')) {
        return res.status(400).json({ message: 'Invalid device connection configuration' });
      } else if (error.message.includes('database')) {
        return res.status(500).json({ 
          message: 'Database connection error',
          error: error.message
        });
      } else {
        // For Modbus communication errors
        console.error('Modbus reading error:', error);
        return res.status(400).json({
          message: `Failed to read from device: ${error.message}`,
        });
      }
    }
  } catch (error: any) {
    console.error('Read registers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};