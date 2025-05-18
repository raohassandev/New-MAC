import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

/**
 * Get dashboard summary including system status and device statistics
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const summary = await DashboardService.getDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
};

/**
 * Get recent activity logs
 */
export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const activities = await DashboardService.getRecentActivity(limit);
    res.json(activities);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
};

/**
 * Get performance metrics over time
 */
export const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const metrics = await DashboardService.getPerformanceMetrics(days);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
};

/**
 * Get device performance metrics
 */
export const getDeviceMetrics = async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = await DashboardService.getDeviceMetrics(hours);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting device metrics:', error);
    res.status(500).json({ message: 'Failed to fetch device metrics' });
  }
};