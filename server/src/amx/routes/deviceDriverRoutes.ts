import express from 'express';
import { protect as authenticate } from '../../middleware/authMiddleware';

// Import from new direct database controllers instead of the old Controller
import {
  getAllDeviceTypes,
  getDeviceTypeById,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
} from '../controllers/DeviceTypeController';

import {
  createDeviceDriver,
  deleteDeviceDriver,
  getAllDeviceDrivers,
  getDeviceDriverById,
  updateDeviceDriver,
} from '../controllers/DeviceDriverController';

export const deviceDriverRouter = express.Router();

// Apply authentication middleware
// deviceDriverRouter.use(authenticate);

// DeviceType routes - must be defined first due to route specificity
deviceDriverRouter.get('/device-types', getAllDeviceTypes);
deviceDriverRouter.post('/device-types', createDeviceType);
deviceDriverRouter.get('/device-types/:id', getDeviceTypeById);
deviceDriverRouter.put('/device-types/:id', updateDeviceType);
deviceDriverRouter.delete('/device-types/:id', deleteDeviceType);

// DeviceDriver routes
deviceDriverRouter.get('/', getAllDeviceDrivers);
deviceDriverRouter.post('/', createDeviceDriver);
deviceDriverRouter.get('/:id', getDeviceDriverById);
deviceDriverRouter.put('/:id', updateDeviceDriver);
deviceDriverRouter.delete('/:id', deleteDeviceDriver);
