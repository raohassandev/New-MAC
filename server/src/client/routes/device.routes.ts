import * as deviceController from '../controllers/device.controller';
import * as deviceControlController from '../controllers/deviceControl.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

router
  .route('/')
  .get(deviceController.getDevices as express.RequestHandler)
  .post(
    deviceController.createDevice as express.RequestHandler,
  );

router.get('/by-driver/:driverId', deviceController.getDevicesByDriverId as express.RequestHandler);

router.get('/by-usage/:usage', deviceController.getDevicesByUsage as express.RequestHandler); 

router
  .route('/:id')
  .get(deviceController.getDeviceById as express.RequestHandler)
  .put(
    deviceController.updateDevice as express.RequestHandler,
  )
  .delete(
    deviceController.deleteDevice as express.RequestHandler,
  );

router.post('/:id/test', deviceController.testDeviceConnection as express.RequestHandler);

router.get('/:id/read', deviceController.readDeviceRegisters as express.RequestHandler);

// Device control route
router.post('/:id/control', deviceControlController.controlDevice as express.RequestHandler);


export default router;
