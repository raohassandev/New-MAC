import { Router } from 'express';
import authRoutes from './authRoutes';
import deviceRoutes from './deviceRoutes';
import deviceTypeRoutes from './deviceTypeRoutes';
import express from 'express';
import profileRoutes from './profileRoutes';
import templateRoutes from './templateRoutes';
import libraryRoutes from './libraryRoutes';

const router: Router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/profiles', profileRoutes);
router.use('/templates', templateRoutes);
router.use('/device-types', deviceTypeRoutes);

// Library routes (separate database)
router.use('/library', libraryRoutes);

export default router;
