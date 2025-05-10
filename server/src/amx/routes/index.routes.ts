import { Router } from 'express';
import express from 'express';
import { deviceDriverRouter } from './deviceDriver.routes';

export const amxRouter: Router = express.Router();

amxRouter.use('/devicedriver', deviceDriverRouter);
