import * as deviceControlController from '../controllers/deviceControl.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Device control routes
router.post('/:id/control', deviceControlController.controlDevice as express.RequestHandler);
router.put('/:id/setpoint/:parameter', deviceControlController.setDeviceParameter as express.RequestHandler);
router.post('/batch-control', deviceControlController.batchControlDevices as express.RequestHandler);







export default router;
