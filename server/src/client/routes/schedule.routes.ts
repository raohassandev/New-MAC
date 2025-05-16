import * as scheduleController from '../controllers/schedule.controller';
import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Schedule template routes
router.post('/templates', scheduleController.createScheduleTemplate as express.RequestHandler);
router.get('/templates', scheduleController.getScheduleTemplates as express.RequestHandler);
router.get('/templates/:id', scheduleController.getScheduleTemplateById as express.RequestHandler);
router.put('/templates/:id', scheduleController.updateScheduleTemplate as express.RequestHandler);
router.delete('/templates/:id', scheduleController.deleteScheduleTemplate as express.RequestHandler);

// Get devices using a specific template
router.get('/templates/:templateId/devices', scheduleController.getDevicesByTemplate as express.RequestHandler);

// Device schedule routes
router.post('/devices/:deviceId/apply', scheduleController.applyTemplateToDevice as express.RequestHandler);
router.get('/devices/:deviceId', scheduleController.getDeviceSchedule as express.RequestHandler);
router.put('/devices/:deviceId', scheduleController.updateDeviceSchedule as express.RequestHandler);
router.delete('/devices/:deviceId', scheduleController.deactivateDeviceSchedule as express.RequestHandler);

// Admin route for processing scheduled changes
router.post('/process', scheduleController.processScheduledChanges as express.RequestHandler);

export default router;