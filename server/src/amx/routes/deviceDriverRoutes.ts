import express from 'express';
import { protect as authenticate } from '../../middleware/authMiddleware';
import { createDeviceDriver, deleteDeviceDriver, getAllDeviceDrivers, getDeviceDriverById, getDeviceDriversByDeviceType, updateDeviceDriver } from '../controllers/Controller';

export const deviceDriverTouter = express.Router();

// Apply authentication middleware
deviceDriverTouter.use(authenticate);

// DeviceDriver routes
deviceDriverTouter.get('/', getAllDeviceDrivers);
deviceDriverTouter.get('/:id', getDeviceDriverById);
deviceDriverTouter.post('/', createDeviceDriver);
deviceDriverTouter.put('/:id', updateDeviceDriver);
deviceDriverTouter.delete('/:id', deleteDeviceDriver);
deviceDriverTouter.get('/by-device-type/:deviceType', getDeviceDriversByDeviceType);

