import express from 'express';
import { EventLogController } from '../controllers/eventLog.controller';

const router = express.Router();
const eventLogController = new EventLogController();

// Event log routes - bind controller methods to preserve context
router.post('/logs', (req, res) => eventLogController.createEventLog(req, res));
router.get('/logs', (req, res) => eventLogController.getEventLogs(req, res));
router.get('/stats', (req, res) => eventLogController.getSystemStats(req, res));
router.get('/alerts', (req, res) => eventLogController.getActiveAlerts(req, res));

export default router;