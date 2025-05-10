import * as deviceController from '../controllers/deviceController';
import * as deviceRegisterController from '../controllers/deviceRegisterController';
// import { checkPermission, protect } from '../../middleware/authMiddleware';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Apply authentication middleware to all routes
// Comment out during development/testing, but should be enabled in production
// router.use(protect as express.RequestHandler);

router
  .route('/')
  .get(deviceController.getDevices as express.RequestHandler)
  .post(
    // checkPermission(['manage_devices']) as express.RequestHandler,
    deviceController.createDevice as express.RequestHandler,
  );

// Add a route for getting devices by their device driver
router.get('/by-driver/:driverId', deviceController.getDevicesByDriverId as express.RequestHandler);

// Add a route for getting devices by usage category
router.get('/by-usage/:usage', deviceController.getDevicesByUsage as express.RequestHandler); 

router
  .route('/:id')
  .get(deviceController.getDeviceById as express.RequestHandler)
  .put(
    // checkPermission(['manage_devices']) as express.RequestHandler,
    deviceController.updateDevice as express.RequestHandler,
  )
  .delete(
    // checkPermission(['manage_devices']) as express.RequestHandler,
    deviceController.deleteDevice as express.RequestHandler,
  );

// Add device connection testing endpoint
router.post('/:id/test', deviceController.testDeviceConnection as express.RequestHandler);


// Add device register reading endpoint
// router.get('/:id/read', deviceRegisterController.readDeviceRegisters as express.RequestHandler);
router.get('/:id/read', deviceController.readDeviceRegisters as express.RequestHandler);

export default router;
