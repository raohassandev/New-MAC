import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByDeviceType,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAllDeviceTypes,
  getDeviceTypeById,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType
} from '../controllers/libraryController';

const router = express.Router();

// Import template library controller
import {
  getTemplates as getLibraryTemplates,
  getTemplateById as getLibraryTemplateById,
  createTemplate as createLibraryTemplate,
  updateTemplate as updateLibraryTemplate,
  deleteTemplate as deleteLibraryTemplate,
  getTemplatesByDeviceType as getLibraryTemplatesByDeviceType
} from '../controllers/templateLibraryController';

// Template routes using library database
router.get('/templates', protect, getLibraryTemplates);
router.get('/templates/by-device-type/:deviceType', protect, getLibraryTemplatesByDeviceType);
router.get('/templates/:id', protect, getLibraryTemplateById);
router.post('/templates', protect, createLibraryTemplate);
router.put('/templates/:id', protect, updateLibraryTemplate);
router.delete('/templates/:id', protect, deleteLibraryTemplate);

// Device type routes
router.get('/device-types', protect, getAllDeviceTypes);
router.get('/device-types/:id', protect, getDeviceTypeById);
router.post('/device-types', protect, createDeviceType);
router.put('/device-types/:id', protect, updateDeviceType);
router.delete('/device-types/:id', protect, deleteDeviceType);

export default router;