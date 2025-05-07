import { Router } from 'express';
import authRoutes from './authRoutes';
import deviceRoutes from './deviceRoutes';
import deviceDataRoutes from './deviceDataRoutes';
import express from 'express';
import profileRoutes from './profileRoutes';

export const clientRouter: Router = express.Router();

// Mount routes
clientRouter.use('/auth', authRoutes);
clientRouter.use('/devices', deviceRoutes);
clientRouter.use('/device-data', deviceDataRoutes);
clientRouter.use('/profiles', profileRoutes);

// Library routes (separate database)
