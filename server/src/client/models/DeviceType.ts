import mongoose, { Document, Schema } from 'mongoose';

export interface ICreatedBy {
  userId: string;
  username: string;
  email: string;
}

export interface IDeviceType extends Document {
  name: string;
  description?: string;
  category?: string;
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ICreatedBy;
}

const CreatedBySchema = new Schema<ICreatedBy>({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
});

const DeviceTypeSchema = new Schema<IDeviceType>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  category: { type: String },
  specifications: { type: Schema.Types.Mixed },
  createdBy: { type: CreatedBySchema },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt timestamp on save
DeviceTypeSchema.pre('save', function (this: IDeviceType, next) {
  this.updatedAt = new Date();
  next(null);
});

const DeviceType = mongoose.model<IDeviceType>('DeviceType', DeviceTypeSchema);
export default DeviceType;