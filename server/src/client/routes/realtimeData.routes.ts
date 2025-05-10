import * as realtimeDataController from '../controllers/realtimeData.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Realtime data routes
router.post('/:id/data/realtime', realtimeDataController.updateRealtimeData as express.RequestHandler);
router.get('/:id/data/realtime', realtimeDataController.getRealtimeData as express.RequestHandler);
router.delete('/:id/data/realtime', realtimeDataController.deleteRealtimeData as express.RequestHandler);

export default router;