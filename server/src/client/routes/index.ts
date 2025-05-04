import { Router } from 'express';
import authRoutes from './authRoutes';
import deviceRoutes from './deviceRoutes';
import express from 'express';
import profileRoutes from './profileRoutes';

export const clientRouter: Router = express.Router();

// Mount routes
clientRouter.use('/auth', authRoutes);
clientRouter.use('/devices', deviceRoutes);
clientRouter.use('/profiles', profileRoutes);

// Library routes (separate database)


