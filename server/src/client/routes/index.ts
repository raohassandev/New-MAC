import { Router } from 'express';
import authRoutes from './authRoutes';
import deviceRoutes from './device.routes';
import express from 'express';
import monitoringRouter from './monitoringRoutes';
import pollingRoutes from './polling.routes'

export const clientRouter: Router = express.Router();

// Mount routes
clientRouter.use('/auth', authRoutes );
clientRouter.use('/devices', deviceRoutes , pollingRoutes);
clientRouter.use('/monitoring', monitoringRouter);

// Library routes (separate database)
