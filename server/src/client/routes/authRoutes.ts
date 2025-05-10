import * as authController from '../controllers/authController';

import express from 'express';
// import { protect } from '../../middleware/authMiddleware';

const router = express.Router();

// Register user
router.post('/register', authController.registerUser as express.RequestHandler);

// Login user
router.post('/login', authController.loginUser as express.RequestHandler);

// Get user data
router.get('/me', authController.getMe as express.RequestHandler);

export default router;
