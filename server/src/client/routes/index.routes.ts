import { Router } from 'express';
import authRoutes from './auth.routes';
import deviceRoutes from './device.routes';
import express from 'express';
import monitoringRouter from './monitoring.routes';
import pollingRoutes from './polling.routes';
import autoPollingRoutes from './autoPolling.routes';
import realtimeDataRoutes from './realtimeData.routes';
import historicalDataRoutes from './historicalData.routes';
import coilControlRoutes from './coilControl.routes';
import controlDeviceRoutes from './controlDevice.routes';


export const clientRouter: Router = express.Router();

// Mount routes
clientRouter.use('/auth', authRoutes);
clientRouter.use('/devices', deviceRoutes, pollingRoutes, realtimeDataRoutes, historicalDataRoutes, coilControlRoutes , controlDeviceRoutes);
clientRouter.use('/monitoring', monitoringRouter);
clientRouter.use('', autoPollingRoutes); // Mount at root level for system-wide routes

// Library routes (separate database)
