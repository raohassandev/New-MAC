import * as profileController from '../controllers/profileController';

import { checkPermission, protect } from '../middleware/authMiddleware';

import { Router } from 'express';
import express from 'express';

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(protect as express.RequestHandler);

router
  .route('/')
  .get(profileController.getProfiles as express.RequestHandler)
  .post(
    checkPermission(['manage_profiles']) as express.RequestHandler,
    profileController.createProfile as express.RequestHandler
  );

router
  .route('/:id')
  .get(profileController.getProfileById as express.RequestHandler)
  .put(
    checkPermission(['manage_profiles']) as express.RequestHandler,
    profileController.updateProfile as express.RequestHandler
  )
  .delete(
    checkPermission(['manage_profiles']) as express.RequestHandler,
    profileController.deleteProfile as express.RequestHandler
  );

router.post(
  '/:id/duplicate',
  checkPermission(['manage_profiles']) as express.RequestHandler,
  profileController.duplicateProfile as express.RequestHandler
);

router.post(
  '/:id/apply',
  checkPermission(['manage_profiles']) as express.RequestHandler,
  profileController.applyProfile as express.RequestHandler
);

router.get(
  '/templates',
  profileController.getTemplateProfiles as express.RequestHandler
);

router.post(
  '/from-template/:templateId',
  checkPermission(['manage_profiles']) as express.RequestHandler,
  profileController.createFromTemplate as express.RequestHandler
);

export default router;
