import { Request, Response } from 'express';
import * as autoPollingService from '../services/autoPolling.service';

// @desc    Start the auto-polling service for all enabled devices
// @route   POST /api/system/polling/start
// @access  Private (Admin)
export const startAutoPolling = async (req: Request, res: Response) => {
  try {
    await autoPollingService.startAutoPollingService();
    
    res.status(200).json({
      success: true,
      message: 'Auto-polling service started successfully',
    });
  } catch (error: any) {
    console.error('Error starting auto-polling service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start auto-polling service',
      error: error.message
    });
  }
};

// @desc    Stop the auto-polling service
// @route   POST /api/system/polling/stop
// @access  Private (Admin)
export const stopAutoPolling = (req: Request, res: Response) => {
  try {
    autoPollingService.stopAutoPollingService();
    
    res.status(200).json({
      success: true,
      message: 'Auto-polling service stopped successfully',
    });
  } catch (error: any) {
    console.error('Error stopping auto-polling service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop auto-polling service',
      error: error.message
    });
  }
};

// @desc    Get the status of the auto-polling service
// @route   GET /api/system/polling/status
// @access  Private (Admin)
export const getAutoPollingStatus = (req: Request, res: Response) => {
  try {
    const stats = autoPollingService.getPollingStats();
    
    res.status(200).json({
      success: true,
      isActive: stats.isPollingActive,
      stats
    });
  } catch (error: any) {
    console.error('Error getting auto-polling status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get auto-polling status',
      error: error.message
    });
  }
};

// @desc    Force an immediate poll of all enabled devices
// @route   POST /api/system/polling/refresh
// @access  Private (Admin)
export const forceRefreshDevices = async (req: Request, res: Response) => {
  try {
    await autoPollingService.forceRefreshAllDevices();
    
    res.status(200).json({
      success: true,
      message: 'Forced refresh of all devices initiated',
    });
  } catch (error: any) {
    console.error('Error forcing device refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force refresh devices',
      error: error.message
    });
  }
};