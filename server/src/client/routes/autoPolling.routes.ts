import express, { Router } from 'express';
import * as autoPollingController from '../controllers/autoPolling.controller';

const router: Router = express.Router();

// Auto-polling system routes
router.post('/system/polling/start', autoPollingController.startAutoPolling as express.RequestHandler);
router.post('/system/polling/stop', autoPollingController.stopAutoPolling as express.RequestHandler);
router.get('/system/polling/status', autoPollingController.getAutoPollingStatus as express.RequestHandler);
router.post('/system/polling/refresh', autoPollingController.forceRefreshDevices as express.RequestHandler);

export default router;