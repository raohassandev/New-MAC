import express from 'express';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplatesByDeviceType
} from '../controllers/templateController';
import { protect as authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware
router.use(authenticate);

// Template routes
router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);
router.get('/by-device-type/:deviceType', getTemplatesByDeviceType);

export default router;