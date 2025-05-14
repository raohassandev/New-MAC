import * as historicalDataController from '../controllers/historicalData.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Historical data routes
router.get('/:id/data/historical', historicalDataController.getHistoricalData as express.RequestHandler);
router.get('/:id/data/historical/parameters', historicalDataController.getHistoricalParameters as express.RequestHandler);
router.get('/:id/data/historical/timerange', historicalDataController.getHistoricalTimeRange as express.RequestHandler);
router.delete('/:id/data/historical', historicalDataController.deleteHistoricalData as express.RequestHandler);

export default router;