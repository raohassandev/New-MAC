import * as deviceDataController from '../controllers/polling.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Device polling control routes
router.post('/:id/polling/start', deviceDataController.startDevicePolling as express.RequestHandler);
router.post('/:id/polling/stop', deviceDataController.stopDevicePolling as express.RequestHandler);

// Device data retrieval routes
router.get('/:id/data/current', deviceDataController.getCurrentDeviceData as express.RequestHandler);

// Read-only version that doesn't trigger database operations
router.get('/:id/data/current/readonly', (req: express.Request, res: express.Response) => {
  // Set the readOnly query parameter to true
  req.query.readOnly = 'true';
  // Forward to the regular getCurrentDeviceData handler
  return deviceDataController.getCurrentDeviceData(req, res);
});

export default router;
