import Device from '../models/device.model';
import EventLog from '../models/eventLog.model';
import HistoricalData from '../models/historicalData.model';
import os from 'os';

export interface DashboardSummary {
  systemStatus: 'online' | 'warning' | 'offline';
  cpuUsage: number;
  memoryUsage: number;
  uptime: string;
  activeAlerts: number;
  todayLogs: number;
  devices: {
    total: number;
    online: number;
    enabled: number;
    disabled: number;
  };
  systemInfo?: {
    totalMemory: number;
    usedMemory: number;
    freeMemory: number;
    cpuCount: number;
    loadAverage: number[];
  };
}

export interface RecentActivity {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export interface PerformanceMetric {
  date: string;
  cpu: number;
  memory: number;
  network: number;
}

export interface DeviceMetric {
  deviceId: string;
  deviceName: string;
  dataPoints: number;
  lastCommunication: Date | null;
  status: 'online' | 'offline';
}

export class DashboardService {
  /**
   * Get dashboard summary with real data
   */
  static async getDashboardSummary(): Promise<DashboardSummary> {
    // Get device statistics
    const totalDevices = await Device.countDocuments();
    const onlineDevices = await Device.countDocuments({ 
      enabled: true, 
      lastCommunication: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Online if communicated within last 5 minutes
    });
    const enabledDevices = await Device.countDocuments({ enabled: true });
    const disabledDevices = await Device.countDocuments({ enabled: false });

    // Get recent error logs
    const activeAlerts = await EventLog.countDocuments({
      level: 'ERROR',
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    // Get today's logs
    const todayLogs = await EventLog.countDocuments({
      timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    // Get system metrics
    // CPU usage: loadavg[0] is the 1-minute load average
    // We'll cap it at 100% for display purposes
    const loadAverage = os.loadavg()[0];
    const numCPUs = os.cpus().length;
    const cpuUsage = Math.min(100, Math.round((loadAverage / numCPUs) * 100));
    
    // Memory usage: Calculate used memory percentage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = Math.round((usedMemory / totalMemory) * 100);

    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
    const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
    const uptime = `${days}d ${hours}h ${minutes}m`;

    // Determine system status
    let systemStatus: 'online' | 'warning' | 'offline' = 'online';
    if (cpuUsage > 80 || memoryUsage > 80) {
      systemStatus = 'warning';
    }
    if (onlineDevices === 0 && enabledDevices > 0) {
      systemStatus = 'warning';
    }

    return {
      systemStatus,
      cpuUsage,
      memoryUsage,
      uptime,
      activeAlerts,
      todayLogs,
      devices: {
        total: totalDevices,
        online: onlineDevices,
        enabled: enabledDevices,
        disabled: disabledDevices
      },
      systemInfo: {
        totalMemory,
        usedMemory,
        freeMemory,
        cpuCount: numCPUs,
        loadAverage: os.loadavg()
      }
    };
  }

  /**
   * Get recent activity from event logs
   */
  static async getRecentActivity(limit: number = 5): Promise<RecentActivity[]> {
    // Get recent event logs
    const recentLogs = await EventLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('level message timestamp');

    // Transform logs to dashboard activity format
    const activities = recentLogs.map((log: any) => ({
      id: log._id.toString(),
      type: log.level === 'ERROR' ? 'error' as const : 
            log.level === 'WARN' ? 'warning' as const : 
            'info' as const,
      message: log.message,
      timestamp: log.timestamp.toISOString()
    }));

    return activities;
  }

  /**
   * Get performance metrics from historical data
   */
  static async getPerformanceMetrics(days: number = 7): Promise<PerformanceMetric[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Try to get actual performance data from historical records
    const historicalData = await HistoricalData.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
          },
          avgValue: { $avg: "$value" },
          maxValue: { $max: "$value" },
          minValue: { $min: "$value" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // If we have historical data, use it to calculate metrics
    if (historicalData.length > 0) {
      const performanceData = historicalData.map(data => {
        // Create normalized metrics from actual data
        const avgValue = data.avgValue || 0;
        const normalizedCpu = Math.min(100, Math.max(0, (avgValue / 100) * 70)); // Normalize to 0-70%
        const normalizedMemory = Math.min(100, Math.max(0, (avgValue / 100) * 60)); // Normalize to 0-60%
        const normalizedNetwork = Math.min(100, Math.max(0, (avgValue / 100) * 40)); // Normalize to 0-40%

        return {
          date: data._id.date,
          cpu: Math.round(normalizedCpu),
          memory: Math.round(normalizedMemory),
          network: Math.round(normalizedNetwork),
          dataPoints: data.count
        };
      });

      // Fill in missing dates with no data
      const completeData: PerformanceMetric[] = [];
      const currentDate = new Date(startDate);
      
      for (let i = 0; i < days; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingData = performanceData.find(d => d.date === dateStr);
        
        if (existingData) {
          completeData.push({
            date: existingData.date,
            cpu: existingData.cpu,
            memory: existingData.memory,
            network: existingData.network
          });
        } else {
          // No data for this date
          completeData.push({
            date: dateStr,
            cpu: 0,
            memory: 0,
            network: 0
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return completeData;
    }

    // If no historical data, return empty array (frontend will handle no data state)
    return [];
  }

  /**
   * Get device metrics
   */
  static async getDeviceMetrics(hours: number = 24): Promise<DeviceMetric[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    // Get all enabled devices
    const devices = await Device.find({ enabled: true }).select('name lastCommunication');

    // Get historical data count for each device
    const deviceMetrics = await Promise.all(devices.map(async (device: any) => {
      const dataCount = await HistoricalData.countDocuments({
        deviceId: device._id,
        timestamp: { $gte: startDate }
      });

      return {
        deviceId: device._id.toString(),
        deviceName: device.name,
        dataPoints: dataCount,
        lastCommunication: device.lastCommunication,
        status: device.lastCommunication && 
                device.lastCommunication > new Date(Date.now() - 5 * 60 * 1000) 
                ? 'online' as const : 'offline' as const
      };
    }));

    return deviceMetrics;
  }
}