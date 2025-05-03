import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  deviceId: mongoose.Types.ObjectId;
  deviceName: string;
  message: string;
  severity: string;
  timestamp: Date;
  isRead: boolean;
}

const AlertSchema = new Schema<IAlert>({
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
  },
  deviceName: { type: String, required: true },
  message: { type: String, required: true },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error'],
    default: 'info',
  },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
});

const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
export default Alert;
