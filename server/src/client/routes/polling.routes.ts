import * as deviceDataController from '../controllers/polling.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Device polling control routes
router.post('/:id/polling/start', deviceDataController.startDevicePolling as express.RequestHandler);
router.post('/:id/polling/stop', deviceDataController.stopDevicePolling as express.RequestHandler);

// Device data retrieval routes
router.get('/:id/data/current', deviceDataController.getCurrentDeviceData as express.RequestHandler);
router.get('/:id/data/history', deviceDataController.getDeviceHistoricalData as express.RequestHandler);

export default router;
