import mongoose from 'mongoose';

/**
 * Device Driver Model Schema - Used in AMX database
 * This schema defines the structure for device drivers
 */
export const DeviceDriverModel = new mongoose.Schema(
  {
    // Base device fields
    name: { type: String, required: true },
    make: { type: String },
    model: { type: String },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    tags: [{ type: String }],


    // Data points
    dataPoints: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],

    // Device driver-specific fields
    deviceType: {
      type: String,
      required: true,
      trim: true,
    },
    isDeviceDriver: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'organization'],
      default: 'private',
    },
    createdBy: {
      userId: {
        type: String,
        required: false,
      },
      username: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      organization: {
        type: String,
        default: '',
      },
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true, collection: 'deviceDrivers' },
);

// Create a compound index to ensure unique device drivers per device type
DeviceDriverModel.index({ name: 1, deviceType: 1 }, { unique: true });

/**
 * Create a DeviceDriver model with the specified connection
 * @param connection Mongoose connection to use
 * @returns Mongoose model for DeviceDriver
 */
export const createDeviceDriverModel = (connection: mongoose.Connection) => {
  try {
    // First try to get an existing model
    return connection.model('DeviceDriver');
  } catch (e) {
    // If the model doesn't exist yet, create it
    return connection.model('DeviceDriver', DeviceDriverModel);
  }
};
