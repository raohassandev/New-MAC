/**
 * Event-Driven Service Routes
 * Routes for managing the event-driven polling system
 */

import { Router } from 'express';
import * as eventDrivenController from '../controllers/eventDriven.controller';

const router = Router();

// Service management routes
router.post('/start', eventDrivenController.startEventDrivenService);
router.post('/stop', eventDrivenController.stopEventDrivenService);
router.post('/restart', eventDrivenController.restartEventDrivenService);
router.get('/status', eventDrivenController.getEventDrivenStatus);

// Device-specific routes
router.post('/devices/:deviceId/sync', eventDrivenController.triggerDeviceSync);
router.get('/devices/:deviceId/health', eventDrivenController.getDeviceHealth);
router.get('/devices/health', eventDrivenController.getAllDevicesHealth);

// Debug routes
router.get('/debug/devices', eventDrivenController.debugDevices);
router.post('/debug/force-init', eventDrivenController.forceDeviceInit);

// Monitoring control routes
router.get('/config', eventDrivenController.getMonitoringConfig);
router.post('/interval', eventDrivenController.setMonitoringInterval);
router.post('/speed', eventDrivenController.setMonitoringSpeed);

export { router as eventDrivenRouter };