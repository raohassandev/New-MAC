import { Router } from 'express';
import express from 'express';
import { deviceDriverRouter } from './deviceDriverRoutes';

export const amxRouter: Router = express.Router();

amxRouter.use('/devicedriver', deviceDriverRouter);
