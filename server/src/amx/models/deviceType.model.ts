import mongoose from 'mongoose';

import { connectAmxToDB } from '../../config/database';
/**
 * Device Type Model Schema - Used in AMX database
 */
export const DeviceTypeModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      userId: { type: String },
      username: { type: String },
      email: { type: String },
      organization: { type: String, default: '' },
    },
  },
  { timestamps: true, collection: 'devicetypes' },
);

/**
 * Create a DeviceType model with the specified connection
 * @param connection Mongoose connection to use
 * @returns Mongoose model for DeviceType
 */
export const createDeviceTypeModel = (connection: mongoose.Connection) => {
  try {
    // First try to get an existing model
    return connection.model('DeviceType');
  } catch (e) {
    // If the model doesn't exist yet, create it
    return connection.model('DeviceType', DeviceTypeModel);
  }
};
