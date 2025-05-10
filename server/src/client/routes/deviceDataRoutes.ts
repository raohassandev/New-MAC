import * as deviceDataController from '../controllers/deviceDataController';
// import { checkPermission, protect } from '../../middleware/authMiddleware';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Apply authentication middleware to all routes
// router.use(protect as express.RequestHandler);

// Routes for device polling
router.post(
  '/:id/polling/start',
  // checkPermission(['manage_devices']) as express.RequestHandler,
  deviceDataController.startDevicePolling as express.RequestHandler,
);

router.post(
  '/:id/polling/stop',
  // checkPermission(['manage_devices']) as express.RequestHandler,
  deviceDataController.stopDevicePolling as express.RequestHandler,
);

// Routes for device data retrieval
router.get(
  '/:id/data/current',
  deviceDataController.getCurrentDeviceData as express.RequestHandler,
);

router.get(
  '/:id/data/history',
  deviceDataController.getDeviceHistoricalData as express.RequestHandler,
);

export default router;
