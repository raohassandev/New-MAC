import mongoose from 'mongoose';

// Create a device type schema
const DeviceTypeModel = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  description: { 
    type: String 
  },
  category: { 
    type: String 
  },
  specifications: { 
    type: mongoose.Schema.Types.Mixed
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
}, { timestamps: true });

// This function creates a model with the specified connection
export const createDeviceTypeModel = (connection: mongoose.Connection) => {
  try {
    // First try to get an existing model
    return connection.model('DeviceType');
  } catch (e) {
    // If the model doesn't exist yet, create it
    return connection.model('DeviceType', DeviceTypeModel);
  }
};

// Export the schema for use elsewhere
export { DeviceTypeModel };