import mongoose, { Document, Schema } from 'mongoose';

// Define the schema for realtime data
export interface IRealtimeData extends Document {
  deviceId: mongoose.Types.ObjectId;
  deviceName: string;
  readings: {
    name: string;
    registerIndex?: number;
    address?: number;
    value: any;
    unit?: string;
    dataType?: string;
    error?: string;
  }[];
  timestamp: Date;
  lastUpdated: Date;
}

const RealtimeDataSchema = new Schema(
  {
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Device ID is required'],
      index: true,
      unique: true, // Only one realtime entry per device
    },
    deviceName: {
      type: String,
      required: [true, 'Device name is required'],
    },
    readings: [{
      name: {
        type: String,
        required: [true, 'Parameter name is required'],
      },
      registerIndex: {
        type: Number,
      },
      address: {
        type: Number,
      },
      value: {
        type: Schema.Types.Mixed,
      },
      unit: {
        type: String,
        default: '',
      },
      dataType: {
        type: String,
      },
      error: {
        type: String,
      },
    }],
    timestamp: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for retrieving device information
RealtimeDataSchema.virtual('device', {
  ref: 'Device',
  localField: 'deviceId',
  foreignField: '_id',
  justOne: true,
});

// Create the model
const RealtimeData = mongoose.model<IRealtimeData>('RealtimeData', RealtimeDataSchema);

export default RealtimeData;