import * as deviceController from '../controllers/deviceController';

import { checkPermission, protect } from '../../middleware/authMiddleware';

import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(protect as express.RequestHandler);

router
  .route('/')
  .get(deviceController.getDevices as express.RequestHandler)
  .post(
    checkPermission(['manage_devices']) as express.RequestHandler,
    deviceController.createDevice as express.RequestHandler
  );

router
  .route('/:id')
  .get(deviceController.getDeviceById as express.RequestHandler)
  .put(
    checkPermission(['manage_devices']) as express.RequestHandler,
    deviceController.updateDevice as express.RequestHandler
  )
  .delete(
    checkPermission(['manage_devices']) as express.RequestHandler,
    deviceController.deleteDevice as express.RequestHandler
  );

router.post(
  '/:id/test',
  deviceController.testDeviceConnection as express.RequestHandler
);
router.get(
  '/:id/read',
  deviceController.readDeviceRegisters as express.RequestHandler
);

export default router;
