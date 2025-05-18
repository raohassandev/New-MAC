import express from 'express';
import {
  getDashboardSummary,
  getRecentActivity,
  getPerformanceMetrics,
  getDeviceMetrics
} from '../controllers/dashboard.controller';

export const dashboardRouter = express.Router();

// Dashboard endpoints
dashboardRouter.get('/summary', getDashboardSummary);
dashboardRouter.get('/activity', getRecentActivity);
dashboardRouter.get('/performance', getPerformanceMetrics);
dashboardRouter.get('/device-metrics', getDeviceMetrics);