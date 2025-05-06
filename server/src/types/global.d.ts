import mongoose from 'mongoose';
import express from 'express';

// Extend Express Request object to include user
declare global {
  namespace Express {
    interface Request {
      user?: any; // Define a proper user interface
    }

    interface Application {
      locals: {
        mainDB?: mongoose.Connection;
        libraryDB?: mongoose.Connection;
        libraryModels?: {
          Template: mongoose.Model<any>;
          DeviceType: mongoose.Model<any>;
        };
      };
    }
  }
}
