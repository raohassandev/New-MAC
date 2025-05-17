import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventLog extends Document {
  type: 'info' | 'warning' | 'error';
  message: string;
  deviceId?: number;
  deviceName?: string;
  userId?: number;
  userName?: string;
  timestamp: Date;
  metadata?: any;
}

const EventLogSchema = new Schema<IEventLog>({
  type: {
    type: String,
    enum: ['info', 'warning', 'error'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  deviceId: {
    type: Number,
    required: false
  },
  deviceName: {
    type: String,
    required: false
  },
  userId: {
    type: Number,
    required: false
  },
  userName: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true,
  collection: 'event_logs'
});

// Add indexes for better query performance
EventLogSchema.index({ timestamp: -1 });
EventLogSchema.index({ deviceId: 1 });
EventLogSchema.index({ type: 1 });
EventLogSchema.index({ timestamp: -1, type: 1 });

// Export the schema for use in database configuration
export { EventLogSchema as schema };

export const EventLog: Model<IEventLog> = mongoose.model<IEventLog>('EventLog', EventLogSchema);
export default EventLog;