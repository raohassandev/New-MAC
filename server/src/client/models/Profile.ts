import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduleTime {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface ISchedule {
  active: boolean;
  times: IScheduleTime[];
}

export interface IProfile extends Document {
  name: string;
  description?: string;
  targetTemperature: number;
  temperatureRange: number[];
  fanSpeed: number;
  mode: string;
  schedule: ISchedule;
  assignedDevices: mongoose.Types.ObjectId[];
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleTimeSchema = new Schema<IScheduleTime>({
  days: [{ type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }],
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
});

const ScheduleSchema = new Schema<ISchedule>({
  active: { type: Boolean, default: false },
  times: [ScheduleTimeSchema],
});

const ProfileSchema = new Schema<IProfile>({
  name: { type: String, required: true },
  description: { type: String },
  targetTemperature: { type: Number, required: true },
  temperatureRange: {
    type: [Number],
    required: true,
    validate: [(val: number[]) => val.length === 2, 'Temperature range must have exactly 2 values'],
  },
  fanSpeed: { type: Number, required: true, min: 0, max: 100 },
  mode: {
    type: String,
    enum: ['cooling', 'heating', 'auto', 'dehumidify'],
    default: 'cooling',
  },
  schedule: {
    type: ScheduleSchema,
    default: () => ({ active: false, times: [] }),
  },
  assignedDevices: [{ type: Schema.Types.ObjectId, ref: 'Device' }],
  isTemplate: { type: Boolean, default: false },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt timestamp on save
ProfileSchema.pre('save', function (this: IProfile, next) {
  this.updatedAt = new Date();
  next(null); // Fixed: pass null instead of undefined
});

const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);
export default Profile;
