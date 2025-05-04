import { Router } from 'express';
import express from 'express';
import { deviceDriverTouter } from './deviceDriverRoutes';

export const amxRouter: Router = express.Router();

amxRouter.use('/devicedriver', deviceDriverTouter)