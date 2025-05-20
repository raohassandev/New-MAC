import * as realtimeDataController from '../controllers/realtimeData.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Bulk realtime data routes (should come before device-specific routes)
router.get('/realtime', realtimeDataController.getAllRealtimeData as express.RequestHandler);

// Device-specific realtime data routes
router.post('/:id/data/realtime', realtimeDataController.updateRealtimeData as express.RequestHandler);
router.get('/:id/data/realtime', realtimeDataController.getRealtimeData as express.RequestHandler);
router.delete('/:id/data/realtime', realtimeDataController.deleteRealtimeData as express.RequestHandler);

export default router;