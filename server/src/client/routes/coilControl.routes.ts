/**
 * Coil Register Control Routes
 * Routes for controlling and reading device coil registers
 */

import * as coilControlController from '../controllers/coilControl.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Routes for coil control operations
// These routes are prefixed with '/api/devices' from the index.routes.ts

// Control a single coil register
router.post('/:id/coil-control', coilControlController.controlDeviceCoil as express.RequestHandler);

// Control multiple coil registers in a single request
router.post('/:id/coil-batch-control', coilControlController.batchControlDeviceCoils as express.RequestHandler);

// Read coil registers
router.get('/:id/coil-read', coilControlController.readDeviceCoils as express.RequestHandler);

export default router;