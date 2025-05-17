import { Request, Response } from 'express';
import { IEventLog } from '../models/eventLog.model';
import { apiLogger } from '../../utils/logger';
import { EventLog as EventLogModel, Device as DeviceModel } from '../models/index.model';

export class EventLogController {
  // Get models from request context
  private getModels(req: Request) {
    const models = req.app.locals.clientModels;
    if (!models || !models.EventLog) {
      throw new Error('EventLog model not available');
    }
    return models;
  }

  // Create a new event log
  async createEventLog(req: Request, res: Response) {
    try {
      const { type, message, deviceId, userId } = req.body;
      const models = this.getModels(req);
      
      // Validate required fields
      if (!type || !message) {
        return res.status(400).json({
          success: false,
          error: 'Type and message are required'
        });
      }

      // Create event log data
      const eventData: Partial<IEventLog> = {
        type,
        message,
        timestamp: new Date()
      };

      // Add device information if provided
      if (deviceId) {
        eventData.deviceId = deviceId;
        // Try to get the device name from the request body first
        const { deviceName } = req.body;
        if (deviceName) {
          eventData.deviceName = deviceName;
        } else {
          // If deviceName not provided, try to look it up by numeric deviceId
          try {
            const device = await models.Device.findOne({ deviceId: deviceId }) || 
                          await models.Device.findOne({ id: deviceId });
            if (device) {
              eventData.deviceName = device.name;
            }
          } catch (error: any) {
            // Only log error if it's not a cast error (expected for numeric IDs)
            if (error.message && !error.message.includes('Cast to ObjectId failed')) {
              apiLogger.error('Error fetching device for event log:', error);
            }
          }
        }
      }

      // Add user information if provided
      if (userId) {
        eventData.userId = userId;
        // TODO: Add user name lookup when user authentication is implemented
      }

      // Create and save the event log
      const eventLog = new models.EventLog(eventData);
      await eventLog.save();

      apiLogger.info(`Event log created: ${message}`);
      
      res.json({
        success: true,
        data: eventLog
      });
    } catch (error) {
      apiLogger.error('Error creating event log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create event log'
      });
    }
  }

  // Get event logs with filters
  async getEventLogs(req: Request, res: Response) {
    try {
      const models = this.getModels(req);
      const { 
        startDate, 
        endDate, 
        type, 
        deviceId, 
        limit = '100' 
      } = req.query;

      // Build query
      const query: any = {};

      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate as string);
        }
      }

      // Type filter
      if (type) {
        query.type = type;
      }

      // Device filter
      if (deviceId) {
        query.deviceId = parseInt(deviceId as string);
      }

      // Execute query
      const eventLogs = await models.EventLog.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit as string));

      // Enrich with device names if not already present
      const enrichedLogs = await Promise.all(eventLogs.map(async (log: any) => {
        const logObj = log.toObject();
        if (logObj.deviceId && !logObj.deviceName) {
          try {
            // Try to find device by the numeric deviceId field first
            const device = await models.Device.findOne({ deviceId: logObj.deviceId }) || 
                          await models.Device.findOne({ id: logObj.deviceId });
            if (device) {
              logObj.deviceName = device.name;
            }
          } catch (error) {
            apiLogger.error(`Error fetching device ${logObj.deviceId}:`, error);
          }
        }
        return logObj;
      }));

      res.json(enrichedLogs);
    } catch (error) {
      apiLogger.error('Error fetching event logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch event logs'
      });
    }
  }

  // Get system statistics
  async getSystemStats(req: Request, res: Response) {
    try {
      const models = this.getModels(req);
      
      // Get event counts by type
      const [totalCount, infoCount, warningCount, errorCount] = await Promise.all([
        models.EventLog.countDocuments(),
        models.EventLog.countDocuments({ type: 'info' }),
        models.EventLog.countDocuments({ type: 'warning' }),
        models.EventLog.countDocuments({ type: 'error' })
      ]);

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentEvents = await models.EventLog.find({
        timestamp: { $gte: yesterday }
      }).sort({ timestamp: -1 }).limit(10);

      res.json({
        success: true,
        data: {
          eventCounts: {
            total: totalCount,
            info: infoCount,
            warning: warningCount,
            error: errorCount
          },
          recentEvents,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      apiLogger.error('Error fetching system stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system statistics'
      });
    }
  }

  // Get active alerts (warnings and errors)
  async getActiveAlerts(req: Request, res: Response) {
    try {
      const models = this.getModels(req);
      
      const alerts = await models.EventLog.find({
        type: { $in: ['warning', 'error'] }
      })
      .sort({ timestamp: -1 })
      .limit(50);

      res.json(alerts);
    } catch (error) {
      apiLogger.error('Error fetching active alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active alerts'
      });
    }
  }
}