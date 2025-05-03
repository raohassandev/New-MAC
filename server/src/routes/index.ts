import { Router } from 'express';
import authRoutes from './authRoutes';
import deviceRoutes from './deviceRoutes';
import express from 'express';
import profileRoutes from './profileRoutes';

const router: Router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/profiles', profileRoutes);

export default router;
