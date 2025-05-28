/**
 * Event-Driven Service Controller
 * API endpoints for managing the event-driven polling system
 */

import { Request, Response } from 'express';
import chalk from 'chalk';
import { eventDrivenService } from '../services/eventDrivenPolling.service';

/**
 * Start the event-driven service
 */
export const startEventDrivenService = async (req: Request, res: Response) => {
  try {
    console.log(chalk.blue('[API] Starting event-driven service'));
    
    await eventDrivenService.start();
    
    const stats = eventDrivenService.getServiceStats();
    
    res.json({
      success: true,
      message: 'Event-driven service started successfully',
      stats
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to start event-driven service:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to start event-driven service',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Stop the event-driven service
 */
export const stopEventDrivenService = async (req: Request, res: Response) => {
  try {
    console.log(chalk.blue('[API] Stopping event-driven service'));
    
    await eventDrivenService.stop();
    
    res.json({
      success: true,
      message: 'Event-driven service stopped successfully'
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to stop event-driven service:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to stop event-driven service',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get event-driven service status and statistics
 */
export const getEventDrivenStatus = async (req: Request, res: Response) => {
  try {
    const stats = eventDrivenService.getServiceStats();
    
    // Add detailed diagnostic info
    const diagnostics = {
      serviceRunning: stats.isRunning,
      devicesFound: stats.totalDevices,
      devicesOnline: stats.onlineDevices,
      devicesOffline: stats.offlineDevices,
      activeMonitoring: stats.monitoredDevices?.length || 0,
      timestamp: new Date().toISOString()
    };
    
    console.log(chalk.blue('[API] Event-driven status requested'));
    console.log(chalk.cyan('[DIAGNOSTICS]'), JSON.stringify(diagnostics, null, 2));
    
    res.json({
      success: true,
      stats,
      diagnostics
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to get event-driven status:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to get service status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Trigger immediate sync for a specific device
 */
export const triggerDeviceSync = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }
    
    console.log(chalk.blue(`[API] 🔄 MANUAL TRIGGER: Forcing device sync for ${deviceId}`));
    
    await eventDrivenService.triggerDeviceSync(deviceId);
    
    res.json({
      success: true,
      message: `Device sync triggered successfully for ${deviceId}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(chalk.red(`[API] Failed to trigger device sync:`, error));
    res.status(500).json({
      success: false,
      message: 'Failed to trigger device sync',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Force restart the event-driven service
 */
export const restartEventDrivenService = async (req: Request, res: Response) => {
  try {
    console.log(chalk.blue('[API] 🔄 MANUAL RESTART: Restarting event-driven service'));
    
    // Stop and restart with detailed logging
    console.log(chalk.yellow('[API] Stopping service...'));
    await eventDrivenService.stop();
    
    console.log(chalk.yellow('[API] Starting service...'));
    await eventDrivenService.start();
    
    const stats = eventDrivenService.getServiceStats();
    console.log(chalk.green('[API] ✅ Restart completed'));
    console.log(chalk.cyan('[API] New stats:', JSON.stringify(stats, null, 2)));
    
    res.json({
      success: true,
      message: 'Event-driven service restarted successfully',
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to restart event-driven service:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to restart service',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Set change monitoring interval
 */
export const setMonitoringInterval = async (req: Request, res: Response) => {
  try {
    const { interval } = req.body;
    
    if (!interval || typeof interval !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid interval. Must be a number in milliseconds.'
      });
    }
    
    const oldInterval = eventDrivenService.getChangeMonitoringInterval();
    eventDrivenService.setChangeMonitoringInterval(interval);
    const newInterval = eventDrivenService.getChangeMonitoringInterval();
    
    console.log(chalk.green(`[API] Change monitoring interval updated: ${oldInterval}ms → ${newInterval}ms`));
    
    res.json({
      success: true,
      message: 'Monitoring interval updated successfully',
      oldInterval,
      newInterval,
      actualInterval: newInterval // In case it was clamped to min/max
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to set monitoring interval:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to set monitoring interval',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Set monitoring speed using presets
 */
export const setMonitoringSpeed = async (req: Request, res: Response) => {
  try {
    const { speed } = req.body;
    
    const validSpeeds = ['very-fast', 'fast', 'normal', 'slow', 'very-slow'];
    if (!speed || !validSpeeds.includes(speed)) {
      return res.status(400).json({
        success: false,
        message: `Invalid speed. Must be one of: ${validSpeeds.join(', ')}`
      });
    }
    
    const oldInterval = eventDrivenService.getChangeMonitoringInterval();
    eventDrivenService.setMonitoringSpeed(speed);
    const newInterval = eventDrivenService.getChangeMonitoringInterval();
    
    console.log(chalk.green(`[API] Monitoring speed set to "${speed}": ${oldInterval}ms → ${newInterval}ms`));
    
    res.json({
      success: true,
      message: `Monitoring speed set to "${speed}"`,
      speed,
      oldInterval,
      newInterval
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to set monitoring speed:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to set monitoring speed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get current monitoring configuration
 */
export const getMonitoringConfig = async (req: Request, res: Response) => {
  try {
    const interval = eventDrivenService.getChangeMonitoringInterval();
    const stats = eventDrivenService.getServiceStats();
    
    // Determine speed preset
    let speed = 'custom';
    const speedMap: Record<number, string> = {
      500: 'very-fast',
      1000: 'fast', 
      2000: 'normal',
      5000: 'slow',
      10000: 'very-slow'
    };
    if (speedMap[interval]) {
      speed = speedMap[interval];
    }
    
    res.json({
      success: true,
      config: {
        interval,
        speed,
        availableSpeeds: {
          'very-fast': '500ms (0.5 seconds)',
          'fast': '1000ms (1 second)', 
          'normal': '2000ms (2 seconds)',
          'slow': '5000ms (5 seconds)',
          'very-slow': '10000ms (10 seconds)'
        }
      },
      stats
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to get monitoring config:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to get monitoring configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Force manual device initialization
 */
export const forceDeviceInit = async (req: Request, res: Response) => {
  try {
    console.log(chalk.blue('[API] 🔧 FORCE: Manually initializing devices'));
    
    await eventDrivenService.forceDeviceInitialization();
    
    const stats = eventDrivenService.getServiceStats();
    
    res.json({
      success: true,
      message: 'Device initialization forced',
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to force device init:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to force device initialization',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get health status for a specific device
 */
export const getDeviceHealth = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }
    
    const health = eventDrivenService.getDeviceHealth(deviceId);
    
    if (!health) {
      return res.status(404).json({
        success: false,
        message: `Device ${deviceId} not found in event-driven service`
      });
    }
    
    res.json({
      success: true,
      health
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to get device health:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to get device health',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get health status for all devices
 */
export const getAllDevicesHealth = async (req: Request, res: Response) => {
  try {
    const stats = eventDrivenService.getServiceStats();
    
    // Would need to implement getting all device health statuses
    // For now, return service-level stats
    
    res.json({
      success: true,
      serviceStats: stats,
      message: 'Use /devices/:deviceId/health for individual device health'
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to get all devices health:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to get devices health',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Debug: Check what devices exist in database
 */
export const debugDevices = async (req: Request, res: Response) => {
  try {
    console.log(chalk.blue('[API] 🔍 DEBUG: Checking devices in database'));
    
    const { DatabaseModelManager } = await import('../utils/databaseModelManager');
    const DeviceModel = await DatabaseModelManager.getDeviceModel(req.app.locals);
    
    const allDevices = await DeviceModel.find({}).select('name enabled _id deviceDriverId').lean();
    const enabledDevices = allDevices.filter(d => d.enabled);
    const disabledDevices = allDevices.filter(d => !d.enabled);
    
    console.log(chalk.cyan(`[DEBUG] Found ${allDevices.length} total devices`));
    console.log(chalk.green(`[DEBUG] Enabled: ${enabledDevices.length}`));
    console.log(chalk.yellow(`[DEBUG] Disabled: ${disabledDevices.length}`));
    
    res.json({
      success: true,
      debug: {
        totalDevices: allDevices.length,
        enabledDevices: enabledDevices.length,
        disabledDevices: disabledDevices.length,
        devices: allDevices.map(d => ({
          id: d._id,
          name: d.name,
          enabled: d.enabled,
          hasDriver: !!d.deviceDriverId
        }))
      }
    });
    
  } catch (error) {
    console.error(chalk.red('[API] Failed to debug devices:', error));
    res.status(500).json({
      success: false,
      message: 'Failed to debug devices',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};