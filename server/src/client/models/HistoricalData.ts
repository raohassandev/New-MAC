import mongoose, { Document, Schema } from 'mongoose';

// Define the schema for historical data
export interface IHistoricalData extends Document {
  deviceId: mongoose.Types.ObjectId;
  parameterName: string;
  value: any;
  unit?: string;
  timestamp: Date;
  quality: 'good' | 'bad' | 'uncertain';
  createdAt: Date;
}

const HistoricalDataSchema = new Schema(
  {
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Device ID is required'],
      index: true
    },
    parameterName: {
      type: String,
      required: [true, 'Parameter name is required'],
      index: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Value is required']
    },
    unit: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    quality: {
      type: String,
      enum: ['good', 'bad', 'uncertain'],
      default: 'good'
    }
  },
  {
    timestamps: true
  }
);

// Create compound indexes for efficient querying
HistoricalDataSchema.index({ deviceId: 1, parameterName: 1, timestamp: -1 });
HistoricalDataSchema.index({ timestamp: 1 });

// Virtual for retrieving device information
HistoricalDataSchema.virtual('device', {
  ref: 'Device',
  localField: 'deviceId',
  foreignField: '_id',
  justOne: true
});

// Create the model
const HistoricalData = mongoose.model<IHistoricalData>('HistoricalData', HistoricalDataSchema);

export default HistoricalData;