import express from 'express';
import {
  getDeviceTypes,
  getDeviceTypeById,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType
} from '../controllers/deviceTypeController';
import { protect as authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware
router.use(authenticate);

// Device type routes
router.get('/', getDeviceTypes);
router.get('/:id', getDeviceTypeById);
router.post('/', createDeviceType);
router.put('/:id', updateDeviceType);
router.delete('/:id', deleteDeviceType);

export default router;