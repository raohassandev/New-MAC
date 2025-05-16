import * as historicalDataController from '../controllers/historicalData.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Aggregate historical data route for all devices (must be before device-specific routes)
router.get('/data/historical/aggregate', historicalDataController.getAggregatedHistoricalData as express.RequestHandler);

// Historical data routes (device-specific)
router.get('/:id/data/historical', historicalDataController.getHistoricalData as express.RequestHandler);
router.get('/:id/data/historical/parameters', historicalDataController.getHistoricalParameters as express.RequestHandler);
router.get('/:id/data/historical/timerange', historicalDataController.getHistoricalTimeRange as express.RequestHandler);
router.delete('/:id/data/historical', historicalDataController.deleteHistoricalData as express.RequestHandler);

export default router;