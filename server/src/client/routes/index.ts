import { Router } from 'express';
import authRoutes from './authRoutes';
import deviceRoutes from './deviceRoutes';
import deviceDataRoutes from './deviceDataRoutes';
import express from 'express';
import profileRoutes from './profileRoutes';
import monitoringRouter from './monitoringRoutes';

export const clientRouter: Router = express.Router();

// Mount routes
clientRouter.use('/auth', authRoutes);
clientRouter.use('/devices', deviceRoutes);
clientRouter.use('/device-data', deviceDataRoutes);
clientRouter.use('/profiles', profileRoutes);
clientRouter.use('/monitoring', monitoringRouter);

// Library routes (separate database)
