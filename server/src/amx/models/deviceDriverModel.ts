import mongoose from 'mongoose';

// Create a separate template schema without using the DeviceSchema.obj
const DeviceDriverModel = new mongoose.Schema({
  // Base device fields
  name: { type: String, required: true },
  make: { type: String },
  model: { type: String },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  tags: [{ type: String }],
  
  // Connection settings
  connectionSetting: { 
    type: mongoose.Schema.Types.Mixed,
    required: false 
  },
  
  // Data points
  dataPoints: [{ 
    type: mongoose.Schema.Types.Mixed 
  }],
  
  // Template-specific fields
  deviceType: {
    type: String,
    required: true,
    trim: true,
  },
  isTemplate: {
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
      required: false, // Changed from true to false to prevent validation errors
    },
    username: {
      type: String,
      required: false, // Changed from true to false
    },
    email: {
      type: String,
      required: false, // Changed from true to false
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
}, { timestamps: true });

// Create a compound index to ensure unique templates per device type
DeviceDriverModel.index({ name: 1, deviceType: 1 }, { unique: true });

// This function creates a model with the specified connection
export const createDeviceDriverModel = (connection: mongoose.Connection) => {
  try {
    // First try to get an existing model
    return connection.model('Template');
  } catch (e) {
    // If the model doesn't exist yet, create it
    return connection.model('Template', DeviceDriverModel);
  }
};

// Export the schema for use elsewhere
export { DeviceDriverModel };