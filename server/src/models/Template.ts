import mongoose, { Document, Schema } from 'mongoose';
import { 
  RangeSchema, 
  ParserSchema, 
  DataPointSchema, 
  ConnectionSettingSchema, 
  RegisterSchema,
  IRange,
  IParser,
  IDataPoint,
  IConnectionSetting,
  IRegister
} from './Device';  // Import schemas from Device model

export interface ICreatedBy {
  userId: string;
  username: string;
  email: string;
}

export interface ITemplate extends Omit<Document, 'model'> {
  name: string;
  deviceType: string;
  make?: string;
  model?: string;
  description?: string;
  enabled: boolean;
  tags?: string[];
  
  connectionSetting?: IConnectionSetting;
  dataPoints?: IDataPoint[];
  
  createdBy?: ICreatedBy;
  createdAt: Date;
  updatedAt: Date;
}

const CreatedBySchema = new Schema<ICreatedBy>({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
});

const TemplateSchema = new Schema<ITemplate>({
  name: { type: String, required: true },
  deviceType: { type: String, required: true },
  make: { type: String },
  model: { type: String },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  tags: [{ type: String }],
  
  connectionSetting: { type: ConnectionSettingSchema, required: false },
  dataPoints: [DataPointSchema],
  
  createdBy: { type: CreatedBySchema },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add a compound unique index on deviceType and name
TemplateSchema.index({ deviceType: 1, name: 1 }, { unique: true });

// Update the updatedAt timestamp on save
TemplateSchema.pre('save', function (this: ITemplate, next) {
  this.updatedAt = new Date();
  next(null);
});

// Use the main connection for templates for now to simplify setup
// In production, you might want to use a separate connection
const Template = mongoose.model<ITemplate>('Template', TemplateSchema);

export default Template;