import { Router } from 'express';
import authRoutes from './auth.routes';
import deviceRoutes from './device.routes';
import express from 'express';
import eventLogRoutes from './eventLog.routes';
import pollingRoutes from './polling.routes';
import autoPollingRoutes from './autoPolling.routes';
import realtimeDataRoutes from './realtimeData.routes';
import historicalDataRoutes from './historicalData.routes';
import coilControlRoutes from './coilControl.routes';
import controlDeviceRoutes from './controlDevice.routes';
import scheduleRoutes from './schedule.routes';
import { dashboardRouter } from './dashboard.routes';
import { eventDrivenRouter } from './eventDriven.routes';


export const clientRouter: Router = express.Router();

// Mount routes
clientRouter.use('/auth', authRoutes);
clientRouter.use('/devices', deviceRoutes, pollingRoutes, realtimeDataRoutes, historicalDataRoutes, coilControlRoutes , controlDeviceRoutes);
clientRouter.use('/data', realtimeDataRoutes); // Direct data routes for bulk operations
clientRouter.use('/monitoring', eventLogRoutes); // Event logging routes
clientRouter.use('/schedules', scheduleRoutes);
clientRouter.use('/dashboard', dashboardRouter); // Dashboard routes
clientRouter.use('/event-driven', eventDrivenRouter); // Event-driven service routes
clientRouter.use('', autoPollingRoutes); // Mount at root level for system-wide routes

// Library routes (separate database)
