import mongoose from 'mongoose';

// Schema for device types
const DeviceTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  specifications: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  createdBy: {
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    organization: {
      type: String,
      default: '',
    },
  },
}, { timestamps: true });

// This function creates a model with the specified connection
export const createDeviceTypeModel = (connection: mongoose.Connection) => {
  return connection.model('DeviceType', DeviceTypeSchema);
};

// Export the schema for use elsewhere
export { DeviceTypeSchema };